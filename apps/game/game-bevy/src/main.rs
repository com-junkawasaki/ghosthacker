/**
 * Bevy Game Engine Application
 * ゲームエンジン層のメインエントリーポイント
 * 
 * @context {
 *   "@id": "ex:GameBevy",
 *   "@type": "ex:Application",
 *   "ex:uses": ["ex:GameCore", "ex:BevyEngine"]
 * }
 */

use bevy::prelude::*;

mod systems;
mod components;
mod resources;
mod ui;

use systems::*;
use components::*;
use resources::*;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                title: "Ghost Hacker".into(),
                resolution: (1280.0, 720.0).into(),
                ..default()
            }),
            ..default()
        }))
        .init_resource::<GameState>()
        .init_resource::<CurrentPuzzleMode>()
        .add_systems(Startup, (setup, load_font))
        .add_systems(Update, (
            button_handler_system,
            input_system,
            ui_system,
            ghost_render_system,
            graph_3d_system,
        ))
        .run();
}

fn setup(mut commands: Commands) {
    // 2Dカメラを作成（UI表示用）
    commands.spawn(Camera2dBundle::default());
}

fn load_font(mut commands: Commands, asset_server: Res<AssetServer>) {
    // Google Noto Sans JPフォントを読み込む
    let font_handle = asset_server.load("fonts/NotoSansJP-Regular.ttf");
    commands.insert_resource(JapaneseFont(font_handle));
}

