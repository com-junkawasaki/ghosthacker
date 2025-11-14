/**
 * Timeline Puzzle
 * 時系列モードのパズルロジック
 */

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// イベント断片
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventFragment {
    pub id: Uuid,
    pub content: String,
    pub timestamp: Option<i64>, // 正しい時系列順序のタイムスタンプ
}

/// 時系列パズル
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Timeline {
    pub fragments: Vec<EventFragment>,
    pub current_order: Vec<Uuid>, // 現在の順序
}

impl Timeline {
    pub fn new(fragments: Vec<EventFragment>) -> Self {
        let current_order: Vec<Uuid> = fragments.iter().map(|f| f.id).collect();
        Self {
            fragments,
            current_order,
        }
    }

    /// イベントの順序を更新
    pub fn update_order(&mut self, new_order: Vec<Uuid>) {
        // 全てのfragmentが含まれているか検証
        let fragment_ids: std::collections::HashSet<Uuid> =
            self.fragments.iter().map(|f| f.id).collect();
        let order_set: std::collections::HashSet<Uuid> = new_order.iter().copied().collect();

        if fragment_ids == order_set && fragment_ids.len() == new_order.len() {
            self.current_order = new_order;
        }
    }

    /// 正しい順序かどうかを検証
    pub fn is_correct(&self) -> bool {
        // タイムスタンプが設定されている場合、順序を検証
        let mut sorted_fragments: Vec<&EventFragment> = self.fragments.iter().collect();
        sorted_fragments.sort_by_key(|f| f.timestamp.unwrap_or(0));

        let correct_order: Vec<Uuid> = sorted_fragments.iter().map(|f| f.id).collect();
        self.current_order == correct_order
    }

    /// 修正されたイベント数を取得
    pub fn corrected_count(&self) -> usize {
        let mut sorted_fragments: Vec<&EventFragment> = self.fragments.iter().collect();
        sorted_fragments.sort_by_key(|f| f.timestamp.unwrap_or(0));

        let correct_order: Vec<Uuid> = sorted_fragments.iter().map(|f| f.id).collect();
        self.current_order
            .iter()
            .zip(correct_order.iter())
            .filter(|(a, b)| a == b)
            .count()
    }
}

