//! Unified IR Processing Pipeline
//! 
//! End-to-end workflow for IR processing:
//! - IR → Embedding generation
//! - IR → LLM prompt generation
//! - IR → Image generation prompt
//! - Image analysis → IR update

use anyhow::Result;
use rag_openai::{
    embedding::{generate_embedding, EmbeddingModel},
    image::{generate_image_from_scene, ImageQuality, ImageSize},
    llm::{generate_novel_from_scene, generate_script_from_scene, LLMModel},
    vision::{analyze_character_image, analyze_scene_image},
    OpenAIClient,
};
use serde_json::Value;

/// IR processing pipeline
pub struct IRPipeline {
    client: OpenAIClient,
}

impl IRPipeline {
    pub fn new() -> Result<Self> {
        Ok(Self {
            client: OpenAIClient::new()?,
        })
    }
}

/// Generate embeddings from JSON-LD IR
/// 
/// Extracts embedHint and llmLabel from entities/relations and generates embeddings
pub async fn ir_to_embeddings(
    client: &OpenAIClient,
    jsonld: &Value,
) -> Result<Vec<(String, Vec<f32>)>> {
    let mut embeddings = Vec::new();
    
    // Extract @graph or single entity
    let entities = if let Some(graph) = jsonld.get("@graph").and_then(|g| g.as_array()) {
        graph.iter().collect()
    } else {
        vec![jsonld]
    };
    
    for entity in entities {
        if let Some(entity_id) = entity.get("@id").and_then(|id| id.as_str()) {
            // Try embedHint first, fallback to llmLabel
            let text = entity
                .get("embedHint")
                .and_then(|v| v.as_str())
                .or_else(|| entity.get("llmLabel").and_then(|v| v.as_str()));
            
            if let Some(text) = text {
                let embedding = generate_embedding(client, text, EmbeddingModel::Ada002).await?;
                embeddings.push((entity_id.to_string(), embedding));
            }
        }
    }
    
    Ok(embeddings)
}

/// Generate LLM prompt from Scene IR
/// 
/// Combines scene information with character details
pub async fn ir_to_llm_prompt(
    client: &OpenAIClient,
    scene: &Value,
) -> Result<String> {
    let title = scene
        .get("title")
        .and_then(|v| v.as_str())
        .unwrap_or("Untitled Scene");
    
    let summary = scene
        .get("summary")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    
    let llm_label = scene.get("llmLabel").and_then(|v| v.as_str());
    
    // Extract characters
    let mut characters = Vec::new();
    if let Some(char_ids) = scene.get("characters").and_then(|c| c.as_array()) {
        for char_id in char_ids {
            if let Some(id_str) = char_id.as_str() {
                // In a real implementation, load character from database
                characters.push((id_str.to_string(), None));
            }
        }
    }
    
    generate_script_from_scene(
        client,
        title,
        summary,
        llm_label,
        &characters,
        LLMModel::Gpt4Turbo,
    )
    .await
}

/// Generate image prompt from Scene IR
/// 
/// Combines scene imagePrompt with character visual profiles and shot info
pub async fn ir_to_image_prompt(
    client: &OpenAIClient,
    scene: &Value,
    characters: Option<&[Value]>,
    shot: Option<&Value>,
) -> Result<String> {
    let scene_prompt = scene
        .get("imagePrompt")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    
    let char_prompts: Option<Vec<String>> = characters.map(|chars| {
        chars
            .iter()
            .filter_map(|c| c.get("imagePrompt").and_then(|v| v.as_str()))
            .map(|s| s.to_string())
            .collect()
    });
    
    let shot_info = shot.and_then(|s| {
        let mut info = String::new();
        if let Some(camera) = s.get("camera") {
            if let Some(cam_type) = camera.get("type").and_then(|v| v.as_str()) {
                info.push_str(&format!("camera: {}", cam_type));
            }
        }
        if let Some(lighting) = s.get("lighting").and_then(|v| v.as_str()) {
            if !info.is_empty() {
                info.push_str(", ");
            }
            info.push_str(&format!("lighting: {}", lighting));
        }
        if info.is_empty() {
            None
        } else {
            Some(info)
        }
    });
    
    let image = generate_image_from_scene(
        client,
        scene_prompt,
        char_prompts.as_deref(),
        shot_info.as_deref(),
        ImageSize::Square1024,
        ImageQuality::Standard,
    )
    .await?;
    
    Ok(image.url)
}

/// Convert image analysis to IR updates
/// 
/// Takes image analysis results and suggests IR updates
pub fn image_to_ir(image_analysis: &rag_openai::vision::ImageAnalysis) -> Value {
    let mut updates = serde_json::json!({});
    
    if !image_analysis.description.is_empty() {
        updates["llmLabel"] = Value::String(image_analysis.description.clone());
    }
    
    if !image_analysis.visual_elements.is_empty() {
        updates["visualElements"] = Value::Array(
            image_analysis
                .visual_elements
                .iter()
                .map(|e| Value::String(e.clone()))
                .collect(),
        );
    }
    
    if !image_analysis.suggested_updates.is_empty() {
        updates["suggestedUpdates"] = Value::Array(
            image_analysis
                .suggested_updates
                .iter()
                .map(|u| Value::String(u.clone()))
                .collect(),
        );
    }
    
    updates
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    #[ignore]
    async fn test_ir_to_embeddings() {
        let client = OpenAIClient::new().unwrap();
        let jsonld = serde_json::json!({
            "@id": "char:ghost-hacker",
            "@type": "Character",
            "embedHint": "elite ethical hacker",
            "llmLabel": "ゴーストハッカー"
        });
        let embeddings = ir_to_embeddings(&client, &jsonld).await.unwrap();
        assert!(!embeddings.is_empty());
    }
}
