/**
 * Ghost Component
 * ゴーストECSコンポーネント
 */

use bevy::prelude::*;
use game_core::ghost::GhostState;

#[derive(Component)]
pub struct GhostComponent {
    pub state: GhostState,
}

