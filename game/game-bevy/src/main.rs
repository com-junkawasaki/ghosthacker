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

use systems::*;
use components::*;
use resources::*;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .init_resource::<GameState>()
        .init_resource::<CurrentPuzzleMode>()
        .add_systems(Startup, setup)
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

