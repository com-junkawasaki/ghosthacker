//! OpenAI API Integration for Unified IR System
//! 
//! This module provides integration with OpenAI APIs:
//! - Embeddings API (text-embedding-ada-002)
//! - Chat Completions API (GPT-4)
//! - Images API (DALL-E 3)
//! - Vision API (GPT-4 Vision)

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::env;

pub mod embedding;
pub mod llm;
pub mod image;
pub mod vision;

/// OpenAI API client configuration
#[derive(Debug, Clone)]
pub struct OpenAIClient {
    api_key: String,
    base_url: String,
}

impl OpenAIClient {
    /// Create a new OpenAI client
    /// 
    /// Reads API key from OPENAI_API_KEY environment variable
    pub fn new() -> Result<Self> {
        let api_key = env::var("OPENAI_API_KEY")
            .context("OPENAI_API_KEY environment variable not set")?;
        
        Ok(Self {
            api_key,
            base_url: "https://api.openai.com/v1".to_string(),
        })
    }
    
    /// Create a client with custom base URL (for testing or proxies)
    pub fn with_base_url(base_url: String) -> Result<Self> {
        let api_key = env::var("OPENAI_API_KEY")
            .context("OPENAI_API_KEY environment variable not set")?;
        
        Ok(Self {
            api_key,
            base_url,
        })
    }
    
    /// Get the API key
    pub fn api_key(&self) -> &str {
        &self.api_key
    }
    
    /// Get the base URL
    pub fn base_url(&self) -> &str {
        &self.base_url
    }
}

impl Default for OpenAIClient {
    fn default() -> Self {
        Self::new().expect("Failed to create OpenAI client")
    }
}
