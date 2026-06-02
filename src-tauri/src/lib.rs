mod activity;
mod commands;
mod notifier;
mod pty;
mod recents;
mod repo_context;
mod summarizer;
mod window;

use std::sync::Arc;
use notifier::Notifier;
use pty::PtyManager;

pub fn run() {
    // Load .env from the project root (parent of src-tauri) so OPENROUTER_API_KEY
    // and similar are visible to std::env::var(). Silently no-ops if absent.
    if let Ok(mut cwd) = std::env::current_dir() {
        // tauri dev runs with cwd = src-tauri/; .env lives one level up.
        cwd.push(".env");
        let _ = dotenvy::from_path(&cwd);
        cwd.pop();
        cwd.pop();
        cwd.push(".env");
        let _ = dotenvy::from_path(&cwd);
    }

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
            repo_context::build_repo_context_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
