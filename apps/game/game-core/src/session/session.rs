/**
 * Session
 * セッションライフサイクル管理
 */

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::ghost::GhostState;

/// セッション状態
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SessionState {
    /// 初期化中
    Initializing,
    /// ゴースト生成中
    GeneratingGhost,
    /// 問題提示中
    PresentingProblem,
    /// パズル解決中
    SolvingPuzzle,
    /// 再推論中
    Reconstructing,
    /// リフレクション中
    Reflecting,
    /// 完了
    Completed,
}

/// リフレクション回答
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Reflection {
    pub question: String,
    pub answer: String,
}

/// セッション
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: Uuid,
    pub ghost_id: Uuid,
    pub state: SessionState,
    pub ghost_state: GhostState,
    pub reflections: Vec<Reflection>,
    pub created_at: i64,
    pub updated_at: i64,
}

impl Session {
    pub fn new(ghost_id: Uuid) -> Self {
        let now = chrono::Utc::now().timestamp();
        Self {
            id: Uuid::new_v4(),
            ghost_id,
            state: SessionState::Initializing,
            ghost_state: GhostState::default(),
            reflections: Vec::new(),
            created_at: now,
            updated_at: now,
        }
    }

    pub fn update_state(&mut self, new_state: SessionState) {
        self.state = new_state;
        self.updated_at = chrono::Utc::now().timestamp();
    }

    pub fn update_ghost_state(&mut self, ghost_state: GhostState) {
        self.ghost_state = ghost_state;
        self.updated_at = chrono::Utc::now().timestamp();
    }

    pub fn add_reflection(&mut self, reflection: Reflection) {
        self.reflections.push(reflection);
        self.updated_at = chrono::Utc::now().timestamp();
    }
}

