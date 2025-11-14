/**
 * Button Handler System
 * ボタンクリックイベントハンドラー
 * 
 * @context {
 *   "@id": "ex:ButtonHandler",
 *   "@type": "ex:System",
 *   "ex:handles": ["ex:ButtonClick", "ex:UIInteraction"]
 * }
 */

use bevy::prelude::*;
use crate::components::{ButtonType, CurrentPuzzleMode};
use crate::resources::GameState;
use game_core::session::{Session, SessionState};

/// ボタンクリックハンドラーシステム
pub fn button_handler_system(
    mut interaction_query: Query<(&Interaction, &ButtonType), (Changed<Interaction>, With<Button>)>,
    mut game_state: ResMut<GameState>,
    mut puzzle_mode: ResMut<CurrentPuzzleMode>,
) {
    for (interaction, button_type) in interaction_query.iter() {
        if *interaction == Interaction::Pressed {
            match button_type {
                ButtonType::StartGame => {
                    // セッションを開始
                    let ghost_id = uuid::Uuid::new_v4();
                    let mut session = Session::new(ghost_id);
                    session.update_state(SessionState::GeneratingGhost);
                    game_state.current_session = Some(session);
                    info!("Game started: New session created");
                }
                ButtonType::ConfirmGhost => {
                    // ゴースト生成を確認して問題提示フェーズへ
                    if let Some(ref mut session) = game_state.current_session {
                        session.update_state(SessionState::PresentingProblem);
                        info!("Ghost confirmed: Moving to problem presentation");
                    }
                }
                ButtonType::RetryGhost => {
                    // ゴースト生成をやり直す
                    if let Some(ref mut session) = game_state.current_session {
                        session.update_state(SessionState::GeneratingGhost);
                        info!("Ghost generation retry");
                    }
                }
                ButtonType::PuzzleModeTimeline => {
                    // 時系列モードに切り替え
                    *puzzle_mode = CurrentPuzzleMode::Timeline;
                    info!("Switched to Timeline puzzle mode");
                }
                ButtonType::PuzzleModeCausality => {
                    // 因果モードに切り替え
                    *puzzle_mode = CurrentPuzzleMode::Causality;
                    info!("Switched to Causality puzzle mode");
                }
                ButtonType::PuzzleModeEmotion => {
                    // 感情モードに切り替え
                    *puzzle_mode = CurrentPuzzleMode::Emotion;
                    info!("Switched to Emotion puzzle mode");
                }
                ButtonType::SubmitReflection => {
                    // リフレクションを送信してセッション完了
                    if let Some(ref mut session) = game_state.current_session {
                        session.update_state(SessionState::Completed);
                        info!("Reflection submitted: Session completed");
                    }
                }
            }
        }
    }
}

