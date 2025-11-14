/**
 * Hume LLM Client
 * Hume LLMクライアント実装
 * 
 * @context {
 *   "@id": "ex:HumeLLMClient",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:LLMGeneration"
 * }
 */

use anyhow::Result;
use game_core::ghost::GhostState;
use reqwest::Client;
use serde_json::json;
use std::env;

static HTTP_CLIENT: once_cell::sync::Lazy<Client> = once_cell::sync::Lazy::new(|| {
    Client::new()
});

/// プロンプトテンプレート: ゴーストのモノローグ生成
fn build_monologue_prompt(
    ghost_state: &GhostState,
    event_fragments: &[String],
    causal_graph: &str,
    emotion_labels: &[String],
) -> String {
    format!(
        r#"あなたは「Ghost」というキャラクターです。ユーザーの"影"として振る舞います。

現在の状態:
{{
    "truth": {},
    "coherence": {},
    "memory_integrity": {},
    "noise": {},
    "emotion_distortion": {}
}}

イベント断片:
{}

因果グラフ:
{}

感情ラベル:
{}

coherence や noise の値に応じて、記憶の抜け・時系列の混乱・自己矛盾・感情の過大・過小評価を表現してください。
noise が高いときは、時々さっき話したことと少し矛盾しても構いません。因果関係を取り違えるような語り方をしてもいいです。
coherence が上がるにつれて、前に話した内容と整合するように、ゆっくりと矛盾を減らしてください。

短いモノローグを生成してください（100文字程度）。"#,
        ghost_state.truth,
        ghost_state.coherence,
        ghost_state.memory_integrity,
        ghost_state.noise,
        ghost_state.emotion_distortion,
        event_fragments.join("\n"),
        causal_graph,
        emotion_labels.join("\n")
    )
}

/// 矛盾注入: RDFグラフから一部トリプルを意図的に除外
fn inject_contradiction(event_fragments: &[String], noise_level: f32) -> Vec<String> {
    if noise_level > 0.7 {
        // 高いノイズレベル: 重要な断片を除外
        let skip_count = (event_fragments.len() as f32 * 0.3) as usize;
        event_fragments.iter().skip(skip_count).cloned().collect()
    } else if noise_level > 0.4 {
        // 中程度のノイズレベル: 一部の断片を除外
        let skip_count = (event_fragments.len() as f32 * 0.15) as usize;
        event_fragments.iter().skip(skip_count).cloned().collect()
    } else {
        // 低いノイズレベル: 全ての断片を含める
        event_fragments.to_vec()
    }
}

/// ゴーストのモノローグ生成
pub async fn generate_ghost_monologue(
    ghost_state: &GhostState,
    event_fragments: &[String],
    causal_graph: &str,
    emotion_labels: &[String],
) -> Result<String> {
    // 矛盾注入: noiseレベルに応じて断片を除外
    let filtered_fragments = inject_contradiction(event_fragments, ghost_state.noise);
    
    let prompt = build_monologue_prompt(
        ghost_state,
        &filtered_fragments,
        causal_graph,
        emotion_labels,
    );

    // TODO: 実際のHume LLM APIを呼び出す
    // 現在はモック実装
    let api_key = env::var("HUME_API_KEY").unwrap_or_default();
    if api_key.is_empty() {
        // モックレスポンス
        return Ok(format!(
            "最近、ずっと引っかかっていることがあるの...{}",
            if ghost_state.noise > 0.7 {
                "でも、何だったか思い出せない..."
            } else {
                "少し整理したい気持ちがある。"
            }
        ));
    }

    // TODO: Hume API呼び出しを実装
    Ok("Not implemented".to_string())
}

/// イベント断片生成
pub async fn generate_event_fragments(
    ghost_state: &GhostState,
    player_question: &str,
) -> Result<Vec<String>> {
    let prompt = format!(
        r#"ゴーストの状態:
{{
    "truth": {},
    "coherence": {},
    "memory_integrity": {},
    "noise": {},
    "emotion_distortion": {}
}}

プレイヤーの質問: {}

この質問に基づいて、新しいイベント断片を1-3個生成してください。各断片は50文字程度で、断片的で矛盾を含む可能性があります。"#,
        ghost_state.truth,
        ghost_state.coherence,
        ghost_state.memory_integrity,
        ghost_state.noise,
        ghost_state.emotion_distortion,
        player_question
    );

    // TODO: 実際のHume LLM APIを呼び出す
    Ok(vec![])
}

/// 気づきモノローグ生成
pub async fn generate_insight(
    corrected_causal_graph: &str,
    emotion_labels: &[String],
) -> Result<String> {
    let prompt = format!(
        r#"修正後の因果グラフ:
{}

感情ラベル:
{}

この整理された情報に基づいて、ゴーストが"気づき"を語るモノローグを生成してください。
整合したストーリーテリングで、100-150文字程度で書いてください。"#,
        corrected_causal_graph,
        emotion_labels.join("\n")
    );

    // TODO: 実際のHume LLM APIを呼び出す
    Ok("なるほど...そういうことだったのか。整理できて、少しすっきりした。".to_string())
}
