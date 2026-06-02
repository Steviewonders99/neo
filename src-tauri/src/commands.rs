use std::sync::Arc;
use tauri::{AppHandle, Runtime, State};

use crate::pty::{kill_pane, resize_pane, spawn_pane, write_to_pane, PtyManager, SpawnRequest};

#[tauri::command]
pub async fn pane_spawn<R: Runtime>(
    app: AppHandle<R>,
    manager: State<'_, Arc<PtyManager>>,
    req: SpawnRequest,
) -> Result<(), String> {
    spawn_pane(app, manager.inner().clone(), req).await
}

#[tauri::command]
pub fn pane_write(
    manager: State<'_, Arc<PtyManager>>,
    id: String,
    data: Vec<u8>,
) -> Result<(), String> {
    write_to_pane(manager.inner(), &id, data)
}

#[tauri::command]
pub fn pane_resize(
    manager: State<'_, Arc<PtyManager>>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    resize_pane(manager.inner(), &id, cols, rows)
}

#[tauri::command]
pub fn pane_kill(
    manager: State<'_, Arc<PtyManager>>,
    id: String,
) -> Result<(), String> {
    kill_pane(manager.inner(), &id)
}

use crate::recents::{self, RecentDir};

#[tauri::command]
pub fn list_recent_dirs() -> Vec<RecentDir> {
    recents::load()
}

#[tauri::command]
pub fn add_recent_dir(cwd: String) -> Vec<RecentDir> {
    recents::add(&cwd)
}

use crate::notifier::{Notifier, PaneMeta};

#[tauri::command]
pub fn set_pane_meta(
    notifier: State<'_, Arc<Notifier>>,
    id: String,
    repo: String,
    task: String,
) {
    notifier.set_meta(id, PaneMeta { repo, task });
}

#[tauri::command]
pub fn pane_focus(notifier: State<'_, Arc<Notifier>>, app: AppHandle, id: String) {
    notifier.on_not_attention(&app, &id);
}

#[tauri::command]
pub fn list_dir_completions(prefix: String) -> Vec<String> {
    use std::fs;
    use std::path::Path;

    // Expand a leading ~ to the home dir
    let expanded = if let Some(stripped) = prefix.strip_prefix('~') {
        if let Some(home) = dirs::home_dir() {
            home.join(stripped.trim_start_matches('/')).to_string_lossy().into_owned()
        } else {
            prefix.clone()
        }
    } else {
        prefix.clone()
    };

    let path = Path::new(&expanded);
    // If the user typed a complete dir (ending in /), list its children.
    // Otherwise treat the basename as a partial prefix to filter siblings.
    let (parent, partial) = if expanded.ends_with('/') || (path.is_dir() && expanded != "~") {
        (path.to_path_buf(), String::new())
    } else if let (Some(p), Some(n)) = (path.parent(), path.file_name()) {
        (p.to_path_buf(), n.to_string_lossy().into_owned())
    } else {
        (Path::new(".").to_path_buf(), String::new())
    };

    let mut out: Vec<String> = match fs::read_dir(&parent) {
        Ok(rd) => rd
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
            .filter_map(|e| e.file_name().into_string().ok())
            .filter(|name| !name.starts_with('.') || partial.starts_with('.'))
            .filter(|name| {
                partial.is_empty() || name.to_lowercase().starts_with(&partial.to_lowercase())
            })
            .take(40)
            .map(|name| {
                let mut p = parent.clone();
                p.push(name);
                p.to_string_lossy().into_owned()
            })
            .collect(),
        Err(_) => Vec::new(),
    };
    out.sort();
    out
}
