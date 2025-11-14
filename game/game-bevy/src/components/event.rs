/**
 * Event Component
 * イベントECSコンポーネント
 */

use bevy::prelude::*;

#[derive(Component)]
pub struct EventComponent {
    pub id: uuid::Uuid,
    pub content: String,
}

