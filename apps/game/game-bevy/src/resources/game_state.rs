/**
 * Game State Resource
 * ゲーム状態リソース
 */

use bevy::prelude::*;
use game_core::session::Session;

#[derive(Resource, Default)]
pub struct GameState {
    pub current_session: Option<Session>,
}

