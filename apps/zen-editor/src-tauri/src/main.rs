// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tauri_plugin_shell::ShellExt;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Tauri 2.x Standard Sidecar Implementation
            // This works for both dev (if binary exists) and production
            let sidecar_command = app.shell().sidecar("backend-server").map_err(|e| {
                eprintln!("Failed to create sidecar command: {}", e);
                e
            })?;

            let (mut _rx, _child) = sidecar_command.spawn().map_err(|e| {
                eprintln!("Failed to spawn sidecar: {}", e);
                e
            })?;

            println!("Backend sidecar started successfully via Tauri Shell API");
            
            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                // Tauri 2.x handles sidecar cleanup automatically if spawned via Shell API
                println!("Application exiting, cleaning up...");
            }
        });
}
}

