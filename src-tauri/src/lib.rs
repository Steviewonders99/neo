mod activity;
mod commands;
mod notifier;
mod pty;
mod recents;
mod window;

use std::sync::Arc;
use notifier::Notifier;
use pty::PtyManager;

pub fn run() {
    let pty_manager = PtyManager::new();
    let notifier = Notifier::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .manage::<Arc<PtyManager>>(pty_manager)
        .manage::<Arc<Notifier>>(notifier)
        .setup(|app| {
            window::configure_main_window(&app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::pane_spawn,
            commands::pane_write,
            commands::pane_resize,
            commands::pane_kill,
            commands::list_recent_dirs,
            commands::add_recent_dir,
            commands::set_pane_meta,
            commands::pane_focus,
            commands::list_dir_completions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
