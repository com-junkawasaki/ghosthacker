use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

/// Character context from JSON-LD file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterContext {
    #[serde(rename = "@id")]
    pub id: String,
    pub name: Option<String>,
    pub backstory: Option<String>,
    pub traits: Option<Vec<String>>,
    pub relationships: Option<serde_json::Value>,
}

/// Dialogue generated from character context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dialogue {
    pub character_id: String,
    pub character_name: String,
    pub lines: Vec<DialogueLine>,
    pub scene_setting: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DialogueLine {
    pub speaker: String,
    pub text: String,
    pub emotion: Option<String>,
}

/// Episode composed from dialogue
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Episode {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub episode_type: String,
    pub title: String,
    pub content: String,
    pub character_ids: Vec<String>,
    pub dialogue_ids: Vec<String>,
}

pub struct EpisodeActivities;

impl EpisodeActivities {
    /// Get resources directory path
    fn get_resources_dir() -> PathBuf {
        // In production, this should be configurable via environment variable
        PathBuf::from("resources")
    }

    /// Load character context from JSON-LD file
    pub fn load_character_context(character_id: &str) -> Result<CharacterContext, String> {
        let resources_dir = Self::get_resources_dir();
        let file_path = resources_dir.join("characters").join(format!("{}.jsonld", character_id));

        if !file_path.exists() {
            return Err(format!("Character file not found: {}", file_path.display()));
        }

        let content = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read character file: {}", e))?;

        let json_ld: serde_json::Value = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse JSON-LD: {}", e))?;

        // Extract character from @graph or direct object
        let character = if let Some(graph) = json_ld.get("@graph").and_then(|g| g.as_array()) {
            graph
                .iter()
                .find(|item| {
                    item.get("@id")
                        .and_then(|id| id.as_str())
                        .map(|id| id.contains(character_id))
                        .unwrap_or(false)
                })
                .ok_or_else(|| "Character not found in @graph".to_string())?
        } else {
            &json_ld
        };

        Ok(CharacterContext {
            id: character
                .get("@id")
                .and_then(|id| id.as_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| character_id.to_string()),
            name: character
                .get("schema:name")
                .or_else(|| character.get("name"))
                .and_then(|n| n.as_str())
                .map(|s| s.to_string()),
            backstory: character
                .get("gh:backstory")
                .or_else(|| character.get("backstory"))
                .and_then(|b| b.as_str())
                .map(|s| s.to_string()),
            traits: character
                .get("gh:traits")
                .or_else(|| character.get("traits"))
                .and_then(|t| {
                    if let Some(arr) = t.as_array() {
                        Some(
                            arr.iter()
                                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                                .collect(),
                        )
                    } else if let Some(s) = t.as_str() {
                        Some(vec![s.to_string()])
                    } else {
                        None
                    }
                }),
            relationships: character
                .get("gh:relationships")
                .or_else(|| character.get("relationships"))
                .cloned(),
        })
    }

    /// Generate character dialogue using GPT API
    /// Note: This is a stub - actual GPT API integration should be added
    pub async fn generate_character_dialogue(
        character_id: &str,
        scene_setting: Option<&str>,
    ) -> Result<Dialogue, String> {
        // Load character context
        let context = Self::load_character_context(character_id)?;

        // TODO: Integrate with GPT API (OpenRouter/OpenAI)
        // For now, return a stub dialogue
        let dialogue = Dialogue {
            character_id: character_id.to_string(),
            character_name: context.name.unwrap_or_else(|| character_id.to_string()),
            lines: vec![DialogueLine {
                speaker: context.name.unwrap_or_else(|| character_id.to_string()),
                text: format!(
                    "This is a generated dialogue for {} in scene: {}",
                    character_id,
                    scene_setting.unwrap_or("default")
                ),
                emotion: Some("neutral".to_string()),
            }],
            scene_setting: scene_setting.map(|s| s.to_string()),
        };

        Ok(dialogue)
    }

    /// Compose episode from dialogue and context
    pub async fn compose_episode_from_dialogue(
        dialogue: Dialogue,
        episode_structure: Option<&str>,
    ) -> Result<Episode, String> {
        // TODO: Integrate with GPT API to compose episode from dialogue
        // For now, create a basic episode structure

        let episode_id = format!("episode:{}", Uuid::new_v4());
        let content = format!(
            "# {}\n\n{}\n\n## Dialogue\n\n{}",
            dialogue.character_name,
            episode_structure.unwrap_or("Episode content"),
            dialogue
                .lines
                .iter()
                .map(|line| format!("**{}**: {}", line.speaker, line.text))
                .collect::<Vec<_>>()
                .join("\n\n")
        );

        let episode = Episode {
            id: episode_id.clone(),
            episode_type: "gh:Episode".to_string(),
            title: format!("Episode: {}", dialogue.character_name),
            content,
            character_ids: vec![dialogue.character_id],
            dialogue_ids: vec![],
        };

        // Save episode to JSON-LD file
        Self::save_episode(&episode)?;

        Ok(episode)
    }

    /// Save episode to JSON-LD file
    pub fn save_episode(episode: &Episode) -> Result<(), String> {
        let resources_dir = Self::get_resources_dir();
        let episodes_dir = resources_dir.join("episodes");

        // Create directory if it doesn't exist
        fs::create_dir_all(&episodes_dir)
            .map_err(|e| format!("Failed to create episodes directory: {}", e))?;

        let file_path = episodes_dir.join(format!("{}.jsonld", episode.id.replace("episode:", "")));

        let json_ld = serde_json::json!({
            "@context": {
                "@base": "https://ghosthacker.gftd.co.jp/",
                "@vocab": "https://ghosthacker.gftd.co.jp/ontology#",
                "gh": "https://ghosthacker.gftd.co.jp/ontology#",
                "schema": "http://schema.org/",
            },
            "@graph": [{
                "@id": episode.id,
                "@type": episode.episode_type,
                "schema:title": episode.title,
                "gh:content": episode.content,
                "gh:character_ids": episode.character_ids,
                "gh:dialogue_ids": episode.dialogue_ids,
            }]
        });

        fs::write(&file_path, serde_json::to_string_pretty(&json_ld).unwrap())
            .map_err(|e| format!("Failed to write episode file: {}", e))?;

        Ok(())
    }

    /// Translate episode sentence
    pub async fn translate_episode_sentence(
        episode_id: &str,
        sentence_id: &str,
        target_language: &str,
    ) -> Result<String, String> {
        // Load episode
        let resources_dir = Self::get_resources_dir();
        let file_path = resources_dir
            .join("episodes")
            .join(format!("{}.jsonld", episode_id.replace("episode:", "")));

        if !file_path.exists() {
            return Err(format!("Episode file not found: {}", file_path.display()));
        }

        let content = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read episode file: {}", e))?;

        // TODO: Extract sentence and translate using GPT API
        // For now, return a stub translation
        Ok(format!(
            "Translated sentence {} from episode {} to {}",
            sentence_id, episode_id, target_language
        ))
    }
}

