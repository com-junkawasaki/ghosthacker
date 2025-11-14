/**
 * Ghost Traits
 * ゴースト特性定義
 * 
 * @context {
 *   "@id": "ex:GhostTrait",
 *   "@type": "ex:DataType",
 *   "ex:examples": ["HighSocialSensitivity", "Impulsive", "Analytical", "Emotional"]
 * }
 */

use serde::{Deserialize, Serialize};

/// ゴースト特性タイプ
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum TraitType {
    /// 時間に厳しい
    TimeStrict,
    /// ざっくり
    Casual,
    /// 気にしない
    Carefree,
    /// 他人の評価がとても気になる
    HighSocialSensitivity,
    /// 少し気になる
    ModerateSocialSensitivity,
    /// あまり気にしない
    LowSocialSensitivity,
    /// 感情的になりやすい
    Emotional,
    /// 論理的に考えがち
    Analytical,
    /// 不安になりやすい
    Anxious,
    /// 落ち着きやすい
    Calm,
    /// 怒りやすい
    Angry,
    /// 我慢しがち
    Patient,
    /// 自分を責めがち
    SelfBlaming,
    /// 人のせいにしがち
    BlamingOthers,
}

/// ゴースト特性
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GhostTrait {
    pub trait_type: TraitType,
    pub intensity: f32, // [0, 1]
}

impl GhostTrait {
    pub fn new(trait_type: TraitType, intensity: f32) -> Self {
        Self {
            trait_type,
            intensity: intensity.clamp(0.0, 1.0),
        }
    }
}

