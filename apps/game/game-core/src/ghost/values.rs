/**
 * Ghost Values
 * 価値観モデル定義
 * 
 * @context {
 *   "@id": "ex:GhostValue",
 *   "@type": "ex:DataType",
 *   "ex:examples": ["freedom", "order", "efficiency", "beauty", "fairness", "chaos"]
 * }
 */

use serde::{Deserialize, Serialize};

/// 価値観タイプ
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ValueType {
    /// 自由
    Freedom,
    /// 秩序
    Order,
    /// 効率
    Efficiency,
    /// 美しさ
    Beauty,
    /// 公平
    Fairness,
    /// 混沌
    Chaos,
}

/// 価値観の重み付き設定
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValuePreference {
    pub value_type: ValueType,
    pub weight: f32, // [0, 1]
}

impl ValuePreference {
    pub fn new(value_type: ValueType, weight: f32) -> Self {
        Self {
            value_type,
            weight: weight.clamp(0.0, 1.0),
        }
    }
}

/// ゴーストの価値観セット（最大3つまで）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GhostValue {
    pub preferences: Vec<ValuePreference>,
}

impl GhostValue {
    pub fn new(preferences: Vec<ValuePreference>) -> Self {
        let mut prefs = preferences;
        prefs.truncate(3); // 最大3つまで
        prefs.sort_by(|a, b| b.weight.partial_cmp(&a.weight).unwrap());
        Self { preferences: prefs }
    }

    pub fn is_empty(&self) -> bool {
        self.preferences.is_empty()
    }

    pub fn len(&self) -> usize {
        self.preferences.len()
    }
}

