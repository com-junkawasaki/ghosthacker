/**
 * UI System
 * UIシステム実装
 * 
 * @context {
 *   "@id": "ex:UISystem",
 *   "@type": "ex:System",
 *   "ex:handles": ["ex:GhostGenerationUI", "ex:ProblemPresentationUI", "ex:PuzzleUI", "ex:ReconstructionUI"]
 * }
 */

use bevy::prelude::*;
use crate::components::PuzzleMode;
use crate::resources::GameState;
use game_core::session::SessionState;

/// UIシステム: 各フェーズに応じたUIを表示
pub fn ui_system(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
    game_state: Res<GameState>,
) {
    if let Some(session) = &game_state.current_session {
        match session.state {
            SessionState::GeneratingGhost => {
                // ゴースト生成フェーズUI
                // TODO: カード選択、タグ選択、スライダーUIを実装
            }
            SessionState::PresentingProblem => {
                // 問題提示フェーズUI
                // TODO: ゴースト発話表示、断片カード横スクロールUIを実装
            }
            SessionState::SolvingPuzzle => {
                // 因果パズルフェーズUI
                // TODO: 時系列/因果/感情モード切り替えUIを実装
            }
            SessionState::Reconstructing => {
                // 再構成フェーズUI
                // TODO: 3Dグラフアニメーション、気づきモノローグUIを実装
            }
            SessionState::Reflecting => {
                // リフレクションフェーズUI
                // TODO: 簡易な問いへの回答UIを実装
            }
            _ => {}
        }
    }
}

