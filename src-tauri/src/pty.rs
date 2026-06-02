use std::collections::HashMap;
use std::io::Write;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;

use parking_lot::Mutex;
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;

use crate::activity::{ActivityDetector, ActivityState};

pub type PaneId = String;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpawnRequest {
    pub id: PaneId,
    pub cwd: String,
    pub kind: PaneKind,
    pub cols: u16,
    pub rows: u16,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PaneKind {
    Claude,
    Shell,
}

pub struct PaneHandle {
    pub master_writer: Box<dyn Write + Send>,
    pub child_killer: Box<dyn portable_pty::ChildKiller + Send + Sync>,
    pub resize_handle: Box<dyn portable_pty::MasterPty + Send>,
    pub input_tx: mpsc::UnboundedSender<Vec<u8>>,
    pub detector: Arc<Mutex<ActivityDetector>>,
    pub alive: Arc<AtomicBool>,
}

#[derive(Default)]
pub struct PtyManager {
    pub(crate) panes: Mutex<HashMap<PaneId, PaneHandle>>,
}

impl PtyManager {
    pub fn new() -> Arc<Self> {
        Arc::new(Self::default())
    }

    pub fn has(&self, id: &str) -> bool {
        self.panes.lock().contains_key(id)
    }

    pub fn remove(&self, id: &str) -> Option<PaneHandle> {
        self.panes.lock().remove(id)
    }

    pub fn insert(&self, id: PaneId, handle: PaneHandle) {
        self.panes.lock().insert(id, handle);
    }
}

pub fn build_command(kind: PaneKind, cwd: &str) -> CommandBuilder {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    let mut cmd = CommandBuilder::new(&shell);
    cmd.arg("-l");
    if matches!(kind, PaneKind::Claude) {
        cmd.arg("-c");
        cmd.arg("claude");
    }
    cmd.cwd(cwd);
    // Preserve key env vars
    for (k, v) in std::env::vars() {
        cmd.env(k, v);
    }
    cmd
}

pub fn open_pty(size: PtySize) -> portable_pty::PtyPair {
    native_pty_system()
        .openpty(size)
        .expect("failed to open PTY")
}

use std::io::Read;
use tauri::{AppHandle, Emitter, Manager, Runtime};

pub async fn spawn_pane<R: Runtime>(
    app: AppHandle<R>,
    manager: Arc<PtyManager>,
    req: SpawnRequest,
) -> Result<(), String> {
    use std::sync::atomic::Ordering;

    let pair = open_pty(PtySize {
        rows: req.rows, cols: req.cols, pixel_width: 0, pixel_height: 0,
    });

    let mut child = pair
        .slave
        .spawn_command(build_command(req.kind, &req.cwd))
        .map_err(|e| format!("spawn failed: {e}"))?;
    drop(pair.slave);

    let mut master_reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let master_writer = pair.master.take_writer().map_err(|e| e.to_string())?;
    let child_killer = child.clone_killer();

    let (input_tx, mut input_rx) = mpsc::unbounded_channel::<Vec<u8>>();
    let detector = Arc::new(Mutex::new(ActivityDetector::new()));
    let alive = Arc::new(AtomicBool::new(true));

    manager.insert(
        req.id.clone(),
        PaneHandle {
            master_writer,
            child_killer,
            resize_handle: pair.master,
            input_tx,
            detector: detector.clone(),
            alive: alive.clone(),
        },
    );

    // Reader thread
    let id_r = req.id.clone();
    let app_r = app.clone();
    let det_r = detector.clone();
    let alive_r = alive.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match master_reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let chunk = buf[..n].to_vec();
                    // Activity hook
                    let changed = det_r.lock().on_output(&chunk);
                    if let Some(state) = changed {
                        let _ = app_r.emit(&format!("activity:{id_r}"), state);
                    }
                    let _ = app_r.emit(&format!("pty:data:{id_r}"), chunk);
                }
                Err(_) => break,
            }
        }
        let code = child.wait().ok().map(|s| s.exit_code() as i32);
        alive_r.store(false, Ordering::SeqCst);
        let _ = app_r.emit(&format!("pty:exit:{id_r}"), code);
    });

    // Writer thread
    let id_w = req.id.clone();
    let manager_w = manager.clone();
    std::thread::spawn(move || {
        while let Some(bytes) = input_rx.blocking_recv() {
            let mut guard = manager_w.panes.lock();
            if let Some(handle) = guard.get_mut(&id_w) {
                let _ = handle.master_writer.write_all(&bytes);
                let _ = handle.master_writer.flush();
            } else {
                break;
            }
        }
    });

    // Ticker thread — drives the silence-window check
    let id_t = req.id.clone();
    let app_t = app.clone();
    let det_t = detector.clone();
    let alive_t = alive.clone();
    std::thread::spawn(move || {
        use std::sync::atomic::Ordering;
        while alive_t.load(Ordering::SeqCst) {
            std::thread::sleep(std::time::Duration::from_millis(250));
            let changed = det_t.lock().tick();
            if let Some(state) = changed {
                let _ = app_t.emit(&format!("activity:{id_t}"), state);
                if let Some(notifier) = app_t.try_state::<Arc<crate::notifier::Notifier>>() {
                    match state {
                        crate::activity::ActivityState::Attention => {
                            notifier.inner().on_attention(&app_t, &id_t);
                        }
                        _ => {
                            notifier.inner().on_not_attention(&app_t, &id_t);
                        }
                    }
                }
            }
        }
    });

    Ok(())
}

pub fn resize_pane(manager: &PtyManager, id: &str, cols: u16, rows: u16) -> Result<(), String> {
    let mut guard = manager.panes.lock();
    let handle = guard.get_mut(id).ok_or_else(|| "no such pane".to_string())?;
    handle
        .resize_handle
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("resize failed: {e}"))
}

pub fn write_to_pane(manager: &PtyManager, id: &str, data: Vec<u8>) -> Result<(), String> {
    let guard = manager.panes.lock();
    let handle = guard.get(id).ok_or_else(|| "no such pane".to_string())?;
    handle
        .input_tx
        .send(data)
        .map_err(|_| "input channel closed".to_string())
}

pub fn kill_pane(manager: &PtyManager, id: &str) -> Result<(), String> {
    let mut handle = manager.remove(id).ok_or_else(|| "no such pane".to_string())?;
    handle.child_killer.kill().map_err(|e| format!("kill failed: {e}"))
}
