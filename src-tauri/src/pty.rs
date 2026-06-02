use std::collections::HashMap;
use std::io::Write;
use std::sync::Arc;

use parking_lot::Mutex;
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;

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
}

#[derive(Default)]
pub struct PtyManager {
    panes: Mutex<HashMap<PaneId, PaneHandle>>,
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
