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

    // Hume LLM APIを呼び出す
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

    // OpenRouter APIを使用（Hume APIの代替として）
    // 実際のHume APIを使用する場合は、適切なエンドポイントに変更
    let openrouter_url = env::var("OPENROUTER_URL")
        .unwrap_or_else(|_| "https://openrouter.ai/api/v1/chat/completions".to_string());
    
    let response = HTTP_CLIENT
        .post(&openrouter_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&json!({
            "model": "gpt-4o-mini",
            "messages": [
                {
                    "role": "system",
                    "content": "You are a Ghost character, the shadow of a user. Express fragmented memories, contradictions, and emotional distortions based on the given state."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7 + (ghost_state.noise * 0.3), // noiseが高いほどランダム性を増す
            "max_tokens": 150
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        tracing::warn!("LLM API error: {}", error_text);
        // フォールバック: モックレスポンス
        return Ok(format!(
            "最近、ずっと引っかかっていることがあるの...{}",
            if ghost_state.noise > 0.7 {
                "でも、何だったか思い出せない..."
            } else {
                "少し整理したい気持ちがある。"
            }
        ));
    }

    let result: serde_json::Value = response.json().await?;
    let content = result
        .get("choices")
        .and_then(|c| c.as_array())
        .and_then(|arr| arr.first())
        .and_then(|choice| choice.get("message"))
        .and_then(|msg| msg.get("content"))
        .and_then(|c| c.as_str())
        .unwrap_or("記憶が曖昧で...")
        .to_string();

    Ok(content)
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

    // LLM APIを呼び出してイベント断片を生成
    let api_key = env::var("HUME_API_KEY").unwrap_or_default();
    if api_key.is_empty() {
        // モックレスポンス
        return Ok(vec![
            "あの日、何かが起きた...".to_string(),
            "でも、詳細は思い出せない。".to_string(),
        ]);
    }

    let openrouter_url = env::var("OPENROUTER_URL")
        .unwrap_or_else(|_| "https://openrouter.ai/api/v1/chat/completions".to_string());
    
    let response = HTTP_CLIENT
        .post(&openrouter_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&json!({
            "model": "gpt-4o-mini",
            "messages": [
                {
                    "role": "system",
                    "content": "Generate 1-3 fragmented event descriptions in Japanese, each about 50 characters. Include contradictions and memory gaps based on the ghost's state."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.8 + (ghost_state.noise * 0.2),
            "max_tokens": 200
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        tracing::warn!("LLM API error for event fragments");
        return Ok(vec!["新しい記憶の断片が浮かんできた...".to_string()]);
    }

    let result: serde_json::Value = response.json().await?;
    let content = result
        .get("choices")
        .and_then(|c| c.as_array())
        .and_then(|arr| arr.first())
        .and_then(|choice| choice.get("message"))
        .and_then(|msg| msg.get("content"))
        .and_then(|c| c.as_str())
        .unwrap_or("")
        .to_string();

    // 改行で分割して断片として返す
    let fragments: Vec<String> = content
        .lines()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    if fragments.is_empty() {
        Ok(vec!["新しい記憶の断片が浮かんできた...".to_string()])
    } else {
        Ok(fragments)
    }
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

    // LLM APIを呼び出して気づきモノローグを生成
    let api_key = env::var("HUME_API_KEY").unwrap_or_default();
    if api_key.is_empty() {
        // モックレスポンス
        return Ok("なるほど...そういうことだったのか。整理できて、少しすっきりした。".to_string());
    }

    let openrouter_url = env::var("OPENROUTER_URL")
        .unwrap_or_else(|_| "https://openrouter.ai/api/v1/chat/completions".to_string());
    
    let response = HTTP_CLIENT
        .post(&openrouter_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&json!({
            "model": "gpt-4o-mini",
            "messages": [
                {
                    "role": "system",
                    "content": "You are a Ghost character who has gained insight. Express realization and clarity in Japanese, 100-150 characters."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.6,
            "max_tokens": 200
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        tracing::warn!("LLM API error for insight");
        return Ok("なるほど...そういうことだったのか。整理できて、少しすっきりした。".to_string());
    }

    let result: serde_json::Value = response.json().await?;
    let content = result
        .get("choices")
        .and_then(|c| c.as_array())
        .and_then(|arr| arr.first())
        .and_then(|choice| choice.get("message"))
        .and_then(|msg| msg.get("content"))
        .and_then(|c| c.as_str())
        .unwrap_or("なるほど...そういうことだったのか。整理できて、少しすっきりした。")
        .to_string();

    Ok(content)
}
