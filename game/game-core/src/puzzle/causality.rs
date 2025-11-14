/**
 * Causality Puzzle
 * 因果モードのパズルロジック
 */

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

/// 因果リンク
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CausalLink {
    pub id: Uuid,
    pub from: Uuid, // 原因イベント
    pub to: Uuid,   // 結果イベント
    pub is_correct: bool, // 正しい因果関係か
}

/// 因果パズル
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Causality {
    pub links: Vec<CausalLink>,
}

impl Causality {
    pub fn new(links: Vec<CausalLink>) -> Self {
        Self { links }
    }

    /// 因果リンクを更新
    pub fn update_link(&mut self, link_id: Uuid, from: Uuid, to: Uuid, is_correct: bool) {
        if let Some(link) = self.links.iter_mut().find(|l| l.id == link_id) {
            link.from = from;
            link.to = to;
            link.is_correct = is_correct;
        }
    }

    /// ループを検出
    pub fn has_loop(&self) -> bool {

        // グラフを構築
        let mut graph: HashMap<Uuid, Vec<Uuid>> = HashMap::new();
        for link in &self.links {
            graph.entry(link.from).or_insert_with(Vec::new).push(link.to);
        }

        // DFSでサイクル検出
        let mut visited = HashSet::new();
        let mut rec_stack = HashSet::new();

        for node in graph.keys() {
            if !visited.contains(node) {
                if self.dfs_has_cycle(*node, &graph, &mut visited, &mut rec_stack) {
                    return true;
                }
            }
        }

        false
    }

    fn dfs_has_cycle(
        &self,
        node: Uuid,
        graph: &HashMap<Uuid, Vec<Uuid>>,
        visited: &mut HashSet<Uuid>,
        rec_stack: &mut HashSet<Uuid>,
    ) -> bool {
        visited.insert(node);
        rec_stack.insert(node);

        if let Some(neighbors) = graph.get(&node) {
            for neighbor in neighbors {
                if !visited.contains(neighbor) {
                    if self.dfs_has_cycle(*neighbor, graph, visited, rec_stack) {
                        return true;
                    }
                } else if rec_stack.contains(neighbor) {
                    return true;
                }
            }
        }

        rec_stack.remove(&node);
        false
    }

    /// 正しい因果リンク数を取得
    pub fn correct_link_count(&self) -> usize {
        self.links.iter().filter(|l| l.is_correct).count()
    }
}

