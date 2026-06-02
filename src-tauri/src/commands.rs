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
