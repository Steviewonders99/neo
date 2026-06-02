use tauri::{WebviewWindow, Manager, Runtime};

#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

pub fn apply_macos_vibrancy<R: Runtime>(window: &WebviewWindow<R>) -> tauri::Result<()> {
    #[cfg(target_os = "macos")]
    {
        let _ = apply_vibrancy(
            window,
            NSVisualEffectMaterial::HudWindow,
            None,
            Some(12.0),
        );
    }
    #[cfg(not(target_os = "macos"))]
    let _ = window;
    Ok(())
}

pub fn configure_main_window<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window("main") {
        apply_macos_vibrancy(&window)?;
    }
    Ok(())
}
