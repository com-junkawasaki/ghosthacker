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
        .add_systems(Startup, setup)
        .add_systems(Update, (
            input_system,
            ui_system,
            ghost_render_system,
            graph_3d_system,
        ))
        .run();
}

fn setup(mut commands: Commands) {
    // 初期セットアップ
}

