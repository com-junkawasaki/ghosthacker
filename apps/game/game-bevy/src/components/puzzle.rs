/**
 * Puzzle Component
 * パズルECSコンポーネント
 */

use bevy::prelude::*;

#[derive(Component)]
pub struct PuzzleComponent {
    pub mode: PuzzleMode,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PuzzleMode {
    Timeline,
    Causality,
    Emotion,
}

