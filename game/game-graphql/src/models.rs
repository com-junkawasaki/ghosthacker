/**
 * GraphQL Models
 * GraphQL型とTerminusDBドキュメントの変換
 * 
 * @context {
 *   "@id": "ex:GraphQLModels",
 *   "@type": "ex:DataType",
 *   "ex:converts": ["ex:GraphQLToRDF", "ex:RDFToGraphQL"]
 * }
 */

use async_graphql::SimpleObject;
use game_core::ghost::GhostState;
use serde_json::{json, Value};
use uuid::Uuid;

/// TerminusDBからゴーストを取得してGraphQL型に変換
pub fn ghost_from_document(doc: &Value) -> Option<Ghost> {
    // TODO: TerminusDBドキュメントからGhost型に変換
    doc.get("@id")
        .and_then(|id| id.as_str())
        .and_then(|id_str| Uuid::parse_str(id_str).ok())
        .map(|id| Ghost {
            id,
            state: GhostState::default(), // TODO: ドキュメントから状態を読み取る
        })
}

/// GraphQL型からTerminusDBドキュメントに変換
pub fn ghost_to_document(ghost: &Ghost) -> Value {
    json!({
        "@id": format!("ghost:{}", ghost.id),
        "@type": "gh:Ghost",
        "gh:hasInitialState": {
            "@id": format!("ghostState:{}", ghost.id),
            "@type": "gh:GhostState",
            "gh:truth": ghost.state.truth,
            "gh:coherence": ghost.state.coherence,
            "gh:memoryIntegrity": ghost.state.memory_integrity,
            "gh:noise": ghost.state.noise,
            "gh:emotionDistortion": ghost.state.emotion_distortion,
        }
    })
}

// GraphQL型定義（schema.rsから移動）
#[derive(SimpleObject)]
pub struct Ghost {
    pub id: Uuid,
    pub state: GhostState,
}

#[derive(SimpleObject)]
pub struct EventFragment {
    pub id: Uuid,
    pub content: String,
}

#[derive(SimpleObject)]
pub struct Session {
    pub id: Uuid,
    pub ghost_id: Uuid,
}

#[derive(SimpleObject)]
pub struct PlayerProfile {
    pub id: Uuid,
}

