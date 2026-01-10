// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Command, Stdio, Child};
use std::sync::Mutex;
use std::path::PathBuf;
use tauri::Manager;

static SIDECAR_PROCESS: Mutex<Option<Child>> = Mutex::new(None);

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                // 開発時: go run で起動
                // 複数の方法で backend ディレクトリを探す
                let mut backend_dir: Option<PathBuf> = None;
                
                // 方法1: 実行ファイルの場所から相対パスで解決
                // src-tauri/target/debug/zen-editor から ../../backend
                if let Ok(exe_path) = std::env::current_exe() {
                    if let Some(target_dir) = exe_path.parent() {
                        if let Some(src_tauri_dir) = target_dir.parent().and_then(|p| p.parent()) {
                            let candidate = src_tauri_dir.join("backend");
                            if candidate.join("cmd").join("server").join("main.go").exists() {
                                backend_dir = Some(candidate);
                            }
                        }
                    }
                }
                
                // 方法2: 現在の作業ディレクトリから探す
                if backend_dir.is_none() {
                    if let Ok(cwd) = std::env::current_dir() {
                        let candidate = cwd.join("backend");
                        if candidate.join("cmd").join("server").join("main.go").exists() {
                            backend_dir = Some(candidate);
                        }
                    }
                }
                
                // 方法3: 環境変数から取得
                if backend_dir.is_none() {
                    if let Ok(env_path) = std::env::var("ZEN_EDITOR_BACKEND_DIR") {
                        let candidate = PathBuf::from(env_path);
                        if candidate.join("cmd").join("server").join("main.go").exists() {
                            backend_dir = Some(candidate);
                        }
                    }
                }
                
                if let Some(backend_dir) = backend_dir {
                    match Command::new("go")
                        .args(&["run", "cmd/server/main.go"])
                        .current_dir(&backend_dir)
                        .stdout(Stdio::piped())
                        .stderr(Stdio::piped())
                        .spawn()
                    {
                        Ok(child) => {
                            let pid = child.id();
                            println!("Started backend sidecar (dev mode) with PID: {} from {:?}", pid, backend_dir);
                            *SIDECAR_PROCESS.lock().unwrap() = Some(child);
                        }
                        Err(e) => {
                            eprintln!("Failed to start backend sidecar (dev mode): {}", e);
                            eprintln!("Make sure 'go' is in your PATH");
                            eprintln!("Backend directory: {:?}", backend_dir);
                        }
                    }
                } else {
                    eprintln!("Could not find backend directory. Tried:");
                    eprintln!("  - Relative to executable");
                    eprintln!("  - Current working directory");
                    eprintln!("  - ZEN_EDITOR_BACKEND_DIR environment variable");
                }
            } else {
                // 本番時: バンドルされたバイナリを起動
                let resource_dir = app.path_resolver()
                    .resource_dir()
                    .expect("failed to resolve resource directory");
                
                #[cfg(target_os = "macos")]
                let sidecar_path = resource_dir.join("binaries").join("backend-server");
                #[cfg(target_os = "windows")]
                let sidecar_path = resource_dir.join("binaries").join("backend-server.exe");
                #[cfg(target_os = "linux")]
                let sidecar_path = resource_dir.join("binaries").join("backend-server");
                
                if sidecar_path.exists() {
                    match Command::new(&sidecar_path)
                        .stdout(Stdio::piped())
                        .stderr(Stdio::piped())
                        .spawn()
                    {
                        Ok(child) => {
                            let pid = child.id();
                            println!("Started backend sidecar (production) with PID: {}", pid);
                            *SIDECAR_PROCESS.lock().unwrap() = Some(child);
                        }
                        Err(e) => {
                            eprintln!("Failed to start backend sidecar (production): {}", e);
                        }
                    }
                } else {
                    eprintln!("Backend sidecar binary not found at: {:?}", sidecar_path);
                }
            }
            
            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| {
            // アプリ終了時に sidecar プロセスを終了
            if let tauri::RunEvent::ExitRequested { .. } = event {
                if let Ok(mut process) = SIDECAR_PROCESS.lock() {
                    if let Some(mut child) = process.take() {
                        let _ = child.kill();
                        println!("Terminated backend sidecar");
                    }
                }
            }
        });
}

