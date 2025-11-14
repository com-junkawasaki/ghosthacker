/**
 * Event Component
 * イベントECSコンポーネント
 */

use bevy::prelude::*;
use uuid::Uuid;

#[derive(Component)]
pub struct EventComponent {
    pub id: Uuid,
    pub content: String,
}

