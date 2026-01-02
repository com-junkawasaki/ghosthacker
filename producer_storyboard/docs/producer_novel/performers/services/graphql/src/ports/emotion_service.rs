/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/analyze-emotions
 * 
 * Emotion Analysis service integration
 * Supports Hume API and fallback deterministic analysis
 */
use crate::schema::emotion::{EmotionProfile, EmotionScore};
use crate::ports::postgres;
use anyhow::{Context, Result};
use chrono::Utc;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
struct HumeJobRequest {
    models: HashMap<String, HashMap<String, String>>,
    input: Vec<HumeInput>,
}

#[derive(Debug, Serialize, Deserialize)]
struct HumeInput {
    text: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct HumeJobResponse {
    job_id: Option<String>,
    id: Option<String>,
    jobId: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct HumeJobStatus {
    state: Option<String>,
    status: Option<String>,
    predictions: Option<Vec<HumePrediction>>,
    result: Option<HumePrediction>,
    outputs: Option<Vec<HumePrediction>>,
    language: Option<Vec<HumePrediction>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct HumePrediction {
    emotions: Option<HashMap<String, f64>>,
    scores: Option<HashMap<String, f64>>,
}

/// Split text into sentences
fn split_sentences(text: &str, max_sentences: usize) -> Vec<String> {
    let re = Regex::new(r"[。！？!?\.]\s*").unwrap();
    let raw: Vec<&str> = re.split(text).collect();
    raw.iter()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .take(max_sentences)
        .collect()
}

/// Fallback deterministic emotion analysis
fn fallback_emotions(text: &str) -> Vec<EmotionScore> {
    let lower = text.to_lowercase();
    let dims = vec![
        "joy", "sadness", "fear", "anger", "surprise", "trust", "anticipation", "disgust", "relief", "hope"
    ];
    
    let weights: Vec<f64> = dims.iter().map(|d| {
        let mut w = 0.0;
        match *d {
            "joy" => {
                let re = Regex::new(r"(?i)(笑う|嬉しい|楽しい|喜び|幸せ|joy|happy|smile|微笑)").unwrap();
                w += (re.find_iter(&lower).count() as f64) * 1.5;
            }
            "relief" => {
                let re = Regex::new(r"(?i)(解放|安心|ほっと|軽く|楽に|relief|安堵|大丈夫|自由)").unwrap();
                w += (re.find_iter(&lower).count() as f64) * 1.5;
            }
            "hope" => {
                let re = Regex::new(r"(?i)(希望|未来|明日|きっと|進む|道|光|hope|新しい|できる)").unwrap();
                w += (re.find_iter(&lower).count() as f64) * 1.5;
            }
            "trust" => {
                let re = Regex::new(r"(?i)(信頼|信じ|頼る|任せ|一緒|trust|繋がる|支え|守る)").unwrap();
                w += (re.find_iter(&lower).count() as f64) * 1.3;
            }
            "sadness" => {
                let re = Regex::new(r"(?i)(悲し|涙|泣|辛い|寂し|孤独|痛み|苦し|loss|sad|切ない)").unwrap();
                w += (re.find_iter(&lower).count() as f64) * 1.3;
            }
            "fear" => {
                let re = Regex::new(r"(?i)(恐れ|怖い|不安|心配|怯え|恐怖|fear|afraid|脅威)").unwrap();
                w += (re.find_iter(&lower).count() as f64) * 1.2;
            }
            "anger" => {
                let re = Regex::new(r"(?i)(怒り|腹立|憤り|怒る|イライラ|rage|angry|偽神)").unwrap();
                w += (re.find_iter(&lower).count() as f64) * 1.2;
            }
            "disgust" => {
                let re = Regex::new(r"(?i)(嫌|気持ち悪|汚い|嫌悪|disgust|醜い)").unwrap();
                w += (re.find_iter(&lower).count() as f64) * 1.0;
            }
            "surprise" => {
                let re = Regex::new(r"(?i)(驚|びっくり|意外|まさか|えっ|surprise|shocked)").unwrap();
                w += (re.find_iter(&lower).count() as f64) * 1.0;
            }
            "anticipation" => {
                let re = Regex::new(r"(?i)(期待|待つ|楽しみ|これから|次|anticipation|準備)").unwrap();
                w += (re.find_iter(&lower).count() as f64) * 1.0;
            }
            _ => {}
        }
        w
    }).collect();
    
    let total: f64 = weights.iter().sum();
    let total = if total > 0.0 { total } else { 1.0 };
    
    let mut scores: Vec<EmotionScore> = dims.iter().zip(weights.iter())
        .map(|(emotion, weight)| EmotionScore {
            emotion: emotion.to_string(),
            score: (weight / total * 10000.0).round() / 10000.0,
        })
        .collect();
    
    scores.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    scores.into_iter().take(10).collect()
}

/// Call Hume API for emotion analysis
async fn call_hume(text: &str) -> Result<Vec<EmotionScore>> {
    let hume_api_key = std::env::var("HUME_API_KEY")
        .or_else(|_| std::env::var("HUME_API"))
        .ok();
    let hume_language_url = std::env::var("HUME_LANGUAGE_URL").ok();
    let dry_run = std::env::var("DRY_RUN").map(|v| v == "1").unwrap_or(false);
    
    if dry_run || hume_api_key.is_none() || hume_language_url.is_none() {
        return Ok(fallback_emotions(text));
    }
    
    let api_key = hume_api_key.unwrap();
    let endpoint = hume_language_url.unwrap();
    
    // Create job
    let client = reqwest::Client::new();
    let request_body = HumeJobRequest {
        models: {
            let mut m = HashMap::new();
            m.insert("language".to_string(), HashMap::new());
            m
        },
        input: vec![HumeInput { text: text.to_string() }],
    };
    
    let create_res = client
        .post(&endpoint)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("X-API-Key", &api_key)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .context("Failed to create Hume job")?;
    
    if !create_res.status().is_success() {
        let body = create_res.text().await.unwrap_or_default();
        return Ok(fallback_emotions(text));
    }
    
    let job: HumeJobResponse = create_res.json().await.context("Failed to parse job response")?;
    let job_id = job.job_id.or(job.id).or(job.jobId);
    
    if job_id.is_none() {
        return Ok(fallback_emotions(text));
    }
    
    let job_id = job_id.unwrap();
    let job_url = if endpoint.ends_with("/jobs") {
        format!("{}/{}", endpoint, job_id)
    } else {
        format!("{}/{}", endpoint, job_id)
    };
    
    // Poll for job completion
    let start = std::time::Instant::now();
    let timeout = std::time::Duration::from_secs(30);
    
    while start.elapsed() < timeout {
        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        
        let status_res = client
            .get(&job_url)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("X-API-Key", &api_key)
            .send()
            .await;
        
        if status_res.is_err() {
            break;
        }
        
        let status_res = status_res.unwrap();
        if !status_res.status().is_success() {
            break;
        }
        
        let status: Result<HumeJobStatus, _> = status_res.json().await;
        if status.is_err() {
            break;
        }
        
        let status = status.unwrap();
        let state = status.state.as_ref()
            .or(status.status.as_ref())
            .map(|s| s.to_lowercase())
            .unwrap_or_default();
        
        if matches!(state.as_str(), "succeeded" | "completed" | "done" | "finished") {
            // Extract emotions
            let outputs = status.predictions
                .or_else(|| status.outputs)
                .or_else(|| status.language)
                .or_else(|| status.result.map(|r| vec![r]));
            
            if let Some(outputs) = outputs {
                if let Some(first) = outputs.first() {
                    let entries = first.emotions.as_ref()
                        .or(first.scores.as_ref())
                        .cloned()
                        .unwrap_or_default();
                    
                    if !entries.is_empty() {
                        let total: f64 = entries.values().sum();
                        let total = if total > 0.0 { total } else { 1.0 };
                        
                        let mut scores: Vec<EmotionScore> = entries.into_iter()
                            .map(|(emotion, score)| EmotionScore {
                                emotion,
                                score: (score / total * 10000.0).round() / 10000.0,
                            })
                            .collect();
                        
                        scores.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
                        return Ok(scores.into_iter().take(12).collect());
                    }
                }
            }
        }
        
        if matches!(state.as_str(), "failed" | "error") {
            break;
        }
    }
    
    Ok(fallback_emotions(text))
}

/// Analyze emotions for text or chapter
pub async fn analyze_emotions(
    pool: &postgres::PostgresPool,
    text: Option<String>,
    chapter_id: Option<String>,
    language: Option<String>,
    max_sentences: Option<i32>,
) -> Result<EmotionProfile> {
    let lang = language.unwrap_or_else(|| "ja".to_string());
    let max_sent = max_sentences.unwrap_or(200) as usize;
    
    // Get text to analyze
    let text_to_analyze = if let Some(t) = text {
        t
    } else if let Some(cid) = chapter_id {
        let chapter = postgres::get_chapter(pool, cid)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to get chapter: {:?}", e))?
            .ok_or_else(|| anyhow::anyhow!("Chapter not found"))?;
        
        // Extract plain text from HTML (simple approach)
        let html = chapter.content_html;
        // Remove HTML tags (simple regex-based approach)
        let re = Regex::new(r"<[^>]+>").unwrap();
        re.replace_all(&html, " ").to_string()
    } else {
        return Err(anyhow::anyhow!("Either text or chapter_id must be provided"));
    };
    
    // Split into sentences
    let sentences = split_sentences(&text_to_analyze, max_sent);
    
    // Analyze each sentence
    let mut emotion_aggregate: HashMap<String, f64> = HashMap::new();
    let mut sentence_count = 0;
    
    for sentence in sentences {
        let scores = call_hume(&sentence).await?;
        for score in scores {
            *emotion_aggregate.entry(score.emotion).or_insert(0.0) += score.score;
        }
        sentence_count += 1;
    }
    
    // Normalize scores
    let total: f64 = emotion_aggregate.values().sum();
    let total = if total > 0.0 { total } else { 1.0 };
    
    let mut emotion_vector: Vec<EmotionScore> = emotion_aggregate.into_iter()
        .map(|(emotion, score)| EmotionScore {
            emotion,
            score: (score / total * 10000.0).round() / 10000.0,
        })
        .collect();
    
    emotion_vector.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    emotion_vector.truncate(12);
    
    Ok(EmotionProfile {
        emotion_vector,
        created_at: Utc::now().to_rfc3339(),
        language: lang,
    })
}

