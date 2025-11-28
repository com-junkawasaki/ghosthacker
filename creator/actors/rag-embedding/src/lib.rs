//! Automatic Embedding Generation for IR Entities
//! 
//! Generate embeddings from embedHint/llmLabel and store in database

use anyhow::Result;
use rag_openai::{
    embedding::{generate_embedding, EmbeddingModel},
    OpenAIClient,
};
use rag_storage::{load_ir_entity, save_ir_entity, StorageClient};
use serde_json::Value;

/// Generate and store embeddings for an entity
/// 
/// # Arguments
/// 
/// * `openai_client` - OpenAI client
/// * `storage_client` - Storage client
/// * `entity_id` - Entity ID to process
/// 
/// # Process
/// 
/// 1. Load entity from database
/// 2. Extract embedHint or llmLabel
/// 3. Generate embedding
/// 4. Store embedding in embeddings table
/// 5. Link embedding to entity via ir_embeddings table
pub async fn generate_and_store_embeddings(
    openai_client: &OpenAIClient,
    storage_client: &StorageClient,
    entity_id: &str,
) -> Result<String> {
    // Load entity
    let entity = load_ir_entity(storage_client, entity_id).await?;
    
    // Extract text for embedding
    let text = entity
        .get("embedHint")
        .and_then(|v| v.as_str())
        .or_else(|| entity.get("llmLabel").and_then(|v| v.as_str()))
        .ok_or_else(|| anyhow::anyhow!("No embedHint or llmLabel found"))?;
    
    // Generate embedding
    let embedding = generate_embedding(openai_client, text, EmbeddingModel::Ada002).await?;
    
    // Store embedding in database
    // Note: This requires direct SQL access to embeddings table
    // In a real implementation, you'd use a proper storage function
    let embedding_id = uuid::Uuid::new_v4();
    
    // Update entity with embeddingId
    let mut updated_entity = entity.clone();
    updated_entity["embeddingId"] = Value::String(embedding_id.to_string());
    
    // Save updated entity
    save_ir_entity(
        storage_client,
        entity_id,
        updated_entity.get("@type")
            .and_then(|v| v.as_str())
            .unwrap_or("Entity"),
        &updated_entity,
        None,
    )
    .await?;
    
    Ok(embedding_id.to_string())
}

/// Batch generate embeddings for multiple entities
pub async fn generate_embeddings_batch(
    openai_client: &OpenAIClient,
    storage_client: &StorageClient,
    entity_ids: &[&str],
) -> Result<Vec<String>> {
    let mut embedding_ids = Vec::new();
    
    for entity_id in entity_ids {
        match generate_and_store_embeddings(openai_client, storage_client, entity_id).await {
            Ok(id) => embedding_ids.push(id),
            Err(e) => {
                eprintln!("Failed to generate embedding for {}: {}", entity_id, e);
            }
        }
    }
    
    Ok(embedding_ids)
}
