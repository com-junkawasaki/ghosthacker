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
    let id_str = doc.get("@id")?.as_str()?;
    // ID形式: "ghost:uuid" または "uuid" をサポート
    let id = if id_str.contains(':') {
        id_str.split(':').nth(1).and_then(|s| Uuid::parse_str(s).ok())?
    } else {
        Uuid::parse_str(id_str).ok()?
    };
    
    // 状態を読み取る
    let state = if let Some(state_obj) = doc.get("gh:hasInitialState") {
        GhostState::new(
            state_obj.get("gh:truth")?.as_f64()? as f32,
            state_obj.get("gh:coherence")?.as_f64()? as f32,
            state_obj.get("gh:memoryIntegrity")?.as_f64()? as f32,
            state_obj.get("gh:noise")?.as_f64()? as f32,
            state_obj.get("gh:emotionDistortion")?.as_f64()? as f32,
        )
    } else {
        GhostState::default()
    };
    
    Some(Ghost { 
        id, 
        state: GhostStateGraphQL::from(state)
    })
}

/// TerminusDBからイベント断片を取得してGraphQL型に変換
pub fn event_fragment_from_document(doc: &Value) -> Option<EventFragment> {
    let id_str = doc.get("@id")?.as_str()?;
    // ID形式: "eventFragment:uuid" または "uuid" をサポート
    let id = if id_str.contains(':') {
        id_str.split(':').nth(1).and_then(|s| Uuid::parse_str(s).ok())?
    } else {
        Uuid::parse_str(id_str).ok()?
    };
    let content = doc.get("gh:content")?.as_str()?.to_string();
    Some(EventFragment { id, content })
}

/// GraphQL型からTerminusDBイベント断片ドキュメントに変換
pub fn event_fragment_to_document(fragment: &EventFragment) -> Value {
    json!({
        "@id": format!("eventFragment:{}", fragment.id),
        "@type": "gh:EventFragment",
        "gh:content": fragment.content,
    })
}

/// TerminusDBからセッションを取得してGraphQL型に変換
pub fn session_from_document(doc: &Value) -> Option<Session> {
    let id_str = doc.get("@id")?.as_str()?;
    // ID形式: "session:uuid" または "uuid" をサポート
    let id = if id_str.contains(':') {
        id_str.split(':').nth(1).and_then(|s| Uuid::parse_str(s).ok())?
    } else {
        Uuid::parse_str(id_str).ok()?
    };
    let ghost_id_str = doc.get("gh:hasGhost")?.as_str()?;
    // ghost_id形式: "ghost:uuid" または "uuid" をサポート
    let ghost_id = if ghost_id_str.contains(':') {
        ghost_id_str.split(':').nth(1).and_then(|s| Uuid::parse_str(s).ok())?
    } else {
        Uuid::parse_str(ghost_id_str).ok()?
    };
    Some(Session { id, ghost_id })
}

/// GraphQL型からTerminusDBセッションドキュメントに変換
pub fn session_to_document(session: &Session) -> Value {
    json!({
        "@id": format!("session:{}", session.id),
        "@type": "gh:Session",
        "gh:hasGhost": format!("ghost:{}", session.ghost_id),
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

/// GhostStateのGraphQL表現
#[derive(SimpleObject)]
pub struct GhostStateGraphQL {
    pub truth: f32,
    pub coherence: f32,
    pub memory_integrity: f32,
    pub noise: f32,
    pub emotion_distortion: f32,
}

impl From<GhostState> for GhostStateGraphQL {
    fn from(state: GhostState) -> Self {
        Self {
            truth: state.truth,
            coherence: state.coherence,
            memory_integrity: state.memory_integrity,
            noise: state.noise,
            emotion_distortion: state.emotion_distortion,
        }
    }
}

impl From<&GhostState> for GhostStateGraphQL {
    fn from(state: &GhostState) -> Self {
        Self {
            truth: state.truth,
            coherence: state.coherence,
            memory_integrity: state.memory_integrity,
            noise: state.noise,
            emotion_distortion: state.emotion_distortion,
        }
    }
}

#[derive(SimpleObject)]
pub struct Ghost {
    pub id: Uuid,
    pub state: GhostStateGraphQL,
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

/// TerminusDBからプレイヤープロフィールを取得してGraphQL型に変換
pub fn player_profile_from_document(doc: &Value) -> Option<PlayerProfile> {
    let id_str = doc.get("@id")?.as_str()?;
    // ID形式: "playerProfile:uuid" または "uuid" をサポート
    let id = if id_str.contains(':') {
        id_str.split(':').nth(1).and_then(|s| Uuid::parse_str(s).ok())?
    } else {
        Uuid::parse_str(id_str).ok()?
    };
    Some(PlayerProfile { id })
}

