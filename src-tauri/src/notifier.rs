use std::collections::HashMap;
use std::sync::Arc;

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_notification::NotificationExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaneMeta {
    pub repo: String,
    pub task: String,
}

#[derive(Default)]
pub struct Notifier {
    /// Latest known repo + task per pane, set from the frontend.
    pub meta: Mutex<HashMap<String, PaneMeta>>,
    pub attention: Mutex<std::collections::HashSet<String>>,
}

impl Notifier {
    pub fn new() -> Arc<Self> {
        Arc::new(Self::default())
    }

    pub fn set_meta(&self, id: String, meta: PaneMeta) {
        self.meta.lock().insert(id, meta);
    }

    pub fn clear(&self, id: &str) {
        self.meta.lock().remove(id);
        self.attention.lock().remove(id);
    }

    pub fn on_attention<R: Runtime>(&self, app: &AppHandle<R>, id: &str) {
        let mut atts = self.attention.lock();
        let newly_added = atts.insert(id.to_string());
        let count = atts.len();
        drop(atts);

        if newly_added {
            let window_is_key = app
                .get_webview_window("main")
                .and_then(|w| w.is_focused().ok())
                .unwrap_or(false);

            if !window_is_key {
                let meta = self.meta.lock().get(id).cloned();
                if let Some(m) = meta {
                    let _ = app
                        .notification()
                        .builder()
                        .title(&format!("{} needs you", m.repo))
                        .body(&m.task)
                        .show();
                }
            }
        }

        set_badge(app, count);
    }

    pub fn on_not_attention<R: Runtime>(&self, app: &AppHandle<R>, id: &str) {
        let mut atts = self.attention.lock();
        atts.remove(id);
        let count = atts.len();
        drop(atts);
        set_badge(app, count);
    }
}

#[cfg(target_os = "macos")]
fn set_badge<R: Runtime>(app: &AppHandle<R>, count: usize) {
    let label = if count == 0 {
        None
    } else {
        Some(count.to_string())
    };
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_badge_label(label);
    }
}

#[cfg(not(target_os = "macos"))]
fn set_badge<R: Runtime>(_app: &AppHandle<R>, _count: usize) {}
