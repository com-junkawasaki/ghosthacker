/**
 * UI Components
 * UIコンポーネント定義
 */

use bevy::prelude::*;

/// ボタンタイプ
#[derive(Component, Debug, Clone, Copy, PartialEq, Eq)]
pub enum ButtonType {
    /// イントロ画面の「はじめる」ボタン
    StartGame,
    /// ゴースト生成の「このゴーストで始める」ボタン
    ConfirmGhost,
    /// ゴースト生成の「もう一度やり直す」ボタン
    RetryGhost,
    /// パズルモード切り替え: 時系列
    PuzzleModeTimeline,
    /// パズルモード切り替え: 因果
    PuzzleModeCausality,
    /// パズルモード切り替え: 感情
    PuzzleModeEmotion,
    /// リフレクション送信ボタン
    SubmitReflection,
}

/// パズルモード状態
#[derive(Resource, Default, Debug, Clone, Copy, PartialEq, Eq)]
pub enum CurrentPuzzleMode {
    #[default]
    Timeline,
    Causality,
    Emotion,
}

