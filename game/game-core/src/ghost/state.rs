/**
 * Ghost State
 * ゴースト内部パラメータ定義
 * 
 * @context {
 *   "@id": "ex:GhostState",
 *   "@type": "ex:DataType",
 *   "ex:fields": [
 *     {"@id": "ex:truth", "ex:type": "xsd:float", "ex:range": "[0, 1]"},
 *     {"@id": "ex:coherence", "ex:type": "xsd:float", "ex:range": "[0, 1]"},
 *     {"@id": "ex:memoryIntegrity", "ex:type": "xsd:float", "ex:range": "[0, 1]"},
 *     {"@id": "ex:noise", "ex:type": "xsd:float", "ex:range": "[0, 1]"},
 *     {"@id": "ex:emotionDistortion", "ex:type": "xsd:float", "ex:range": "[0, 1]"}
 *   ]
 * }
 */

use serde::{Deserialize, Serialize};

/// ゴースト内部パラメータ
/// 各パラメータは [0, 1] の連続値
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GhostState {
    /// ゴーストが「事実に沿って語れている度合い」
    pub truth: f32,
    /// 語りの一貫性（自己矛盾の少なさ）
    pub coherence: f32,
    /// 時系列や因果構造が安定している度合い
    pub memory_integrity: f32,
    /// 語りに含まれるランダム要素・飛躍・錯覚の強さ
    pub noise: f32,
    /// 実際の状況と感情ラベルのズレの大きさ
    pub emotion_distortion: f32,
}

impl GhostState {
    /// 初期状態を作成
    pub fn new(
        truth: f32,
        coherence: f32,
        memory_integrity: f32,
        noise: f32,
        emotion_distortion: f32,
    ) -> Self {
        Self {
            truth: truth.clamp(0.0, 1.0),
            coherence: coherence.clamp(0.0, 1.0),
            memory_integrity: memory_integrity.clamp(0.0, 1.0),
            noise: noise.clamp(0.0, 1.0),
            emotion_distortion: emotion_distortion.clamp(0.0, 1.0),
        }
    }

    /// デフォルト状態（中立的な値）
    pub fn default() -> Self {
        Self {
            truth: 0.5,
            coherence: 0.5,
            memory_integrity: 0.5,
            noise: 0.5,
            emotion_distortion: 0.5,
        }
    }

    /// パラメータが安定しているか（成仏可能か）を判定
    pub fn is_stable(&self, threshold: f32) -> bool {
        self.truth >= threshold
            && self.coherence >= threshold
            && self.memory_integrity >= threshold
            && self.noise <= (1.0 - threshold)
            && self.emotion_distortion <= (1.0 - threshold)
    }
}

