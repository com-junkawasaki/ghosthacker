/**
 * Emotion Puzzle
 * 感情モードのパズルロジック
 */

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// 感情タイプ
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum EmotionType {
    Joy,
    Sadness,
    Anger,
    Fear,
    Surprise,
    Disgust,
    Neutral,
}

/// 感情ラベル
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmotionLabel {
    pub event_id: Uuid,
    pub emotion: EmotionType,
    pub intensity: f32, // [0, 1]
    pub is_correct: bool, // 適切な感情ラベルか
}

/// 感情パズル
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Emotion {
    pub labels: Vec<EmotionLabel>,
}

impl Emotion {
    pub fn new(labels: Vec<EmotionLabel>) -> Self {
        Self { labels }
    }

    /// 感情ラベルを更新
    pub fn update_label(
        &mut self,
        event_id: Uuid,
        emotion: EmotionType,
        intensity: f32,
        is_correct: bool,
    ) {
        if let Some(label) = self.labels.iter_mut().find(|l| l.event_id == event_id) {
            label.emotion = emotion;
            label.intensity = intensity.clamp(0.0, 1.0);
            label.is_correct = is_correct;
        } else {
            self.labels.push(EmotionLabel {
                event_id,
                emotion,
                intensity: intensity.clamp(0.0, 1.0),
                is_correct,
            });
        }
    }

    /// 修正された感情ラベル数を取得
    pub fn corrected_count(&self) -> usize {
        self.labels.iter().filter(|l| l.is_correct).count()
    }
}

