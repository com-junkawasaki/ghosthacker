/**
 * GraphQL Schema Definition
 * ゲーム専用GraphQLスキーマ定義
 * 
 * @context {
 *   "@id": "ex:GraphQLSchema",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:GraphQLSchema"
 * }
 */

use async_graphql::{Error, InputObject, Object, Result, SimpleObject, Subscription};
use async_stream::stream;
use futures::Stream;
use uuid::Uuid;

use game_core::ghost::GhostState;
use crate::terminusdb::client::get_client;
use crate::models::{
    ghost_from_document, ghost_to_document,
    event_fragment_from_document, event_fragment_to_document,
    session_from_document, session_to_document,
    Ghost, EventFragment, Session, PlayerProfile, GhostStateGraphQL
};
use crate::hume::client::{generate_event_fragments, generate_ghost_monologue, generate_insight};
use game_core::puzzle::{Timeline, Causality, Emotion};
use game_core::math::update::{update_timeline_correction, update_causality_correction, update_emotion_correction, UpdateParams};
use game_core::session::Reflection;

#[derive(Default)]
pub struct QueryRoot;

#[Object]
impl QueryRoot {
    /// ゴースト取得
    async fn ghost(&self, id: Uuid) -> Result<Ghost> {
        let client = get_client()?;
        let doc_id = format!("ghost:{}", id);
        let doc = client.get_document(&doc_id).await?;
        ghost_from_document(&doc)
            .ok_or_else(|| Error::new(format!("Failed to parse ghost document: {}", id)))
    }

    /// イベント断片取得
    async fn event_fragments(&self, ghost_id: Uuid) -> Result<Vec<EventFragment>> {
        let client = get_client()?;
        // TODO: TerminusDBからイベント断片を取得
        Err(Error::new("Not implemented"))
    }

    /// セッション取得
    async fn session(&self, id: Uuid) -> Result<Session> {
        let client = get_client()?;
        // TODO: TerminusDBからセッションを取得
        Err(Error::new("Not implemented"))
    }

    /// プレイヤープロフィール取得
    async fn player_profile(&self, user_id: Uuid) -> Result<PlayerProfile> {
        let client = get_client()?;
        // TODO: TerminusDBからプレイヤープロフィールを取得
        Err(Error::new("Not implemented"))
    }
}

#[derive(Default)]
pub struct MutationRoot;

#[Object]
impl MutationRoot {
    /// ゴースト生成
    async fn create_ghost(&self, input: CreateGhostInput) -> Result<Ghost> {
        let client = get_client()?;
        
        // 初期状態を計算（TODO: 入力から計算）
        let initial_state = GhostState::default();
        
        let ghost_id = Uuid::new_v4();
        let ghost = Ghost {
            id: ghost_id,
            state: GhostStateGraphQL::from(initial_state),
        };
        
        // TerminusDBに保存
        let doc = ghost_to_document(&ghost);
        client.insert_document(&doc).await?;
        
        Ok(ghost)
    }

    /// ゴースト状態更新
    async fn update_ghost_state(
        &self,
        ghost_id: Uuid,
        state: GhostStateInput,
    ) -> Result<Ghost> {
        let client = get_client()?;
        
        // 既存のゴーストが存在することを確認
        let doc_id = format!("ghost:{}", ghost_id);
        let _doc = client.get_document(&doc_id).await?;
        
        // 状態を更新
        let updated_state = GhostState::new(
            state.truth,
            state.coherence,
            state.memory_integrity,
            state.noise,
            state.emotion_distortion,
        );
        
        let ghost = Ghost {
            id: ghost_id,
            state: GhostStateGraphQL::from(updated_state),
        };
        
        // TerminusDBを更新
        let updated_doc = ghost_to_document(&ghost);
        client.update_document(&updated_doc).await?;
        
        Ok(ghost)
    }

    /// イベント断片生成
    async fn create_event_fragment(
        &self,
        ghost_id: Uuid,
        fragment: EventFragmentInput,
    ) -> Result<EventFragment> {
        let client = get_client()?;
        
        // ゴーストを取得
        let ghost_doc_id = format!("ghost:{}", ghost_id);
        let ghost_doc = client.get_document(&ghost_doc_id).await?;
        let ghost = ghost_from_document(&ghost_doc)
            .ok_or_else(|| Error::new(format!("Ghost not found: {}", ghost_id)))?;
        
        // Hume LLMでイベント断片を生成（オプション）
        let content = if fragment.content.is_empty() {
            // プレイヤーの質問がない場合は、ゴーストの状態から生成
            // GhostStateGraphQLからGhostStateに変換
            let ghost_state = GhostState::new(
                ghost.state.truth,
                ghost.state.coherence,
                ghost.state.memory_integrity,
                ghost.state.noise,
                ghost.state.emotion_distortion,
            );
            generate_event_fragments(&ghost_state, "").await?
                .first()
                .cloned()
                .unwrap_or_else(|| "新しい記憶の断片が浮かんできた...".to_string())
        } else {
            fragment.content
        };
        
        let event_id = Uuid::new_v4();
        let event_fragment = EventFragment {
            id: event_id,
            content,
        };
        
        // TerminusDBに保存
        let doc = crate::models::event_fragment_to_document(&event_fragment);
        client.insert_document(&doc).await?;
        
        Ok(event_fragment)
    }

    /// 時系列更新
    async fn update_timeline(&self, ghost_id: Uuid, order: Vec<Uuid>) -> Result<bool> {
        let client = get_client()?;
        
        // ゴーストを取得
        let ghost_doc_id = format!("ghost:{}", ghost_id);
        let ghost_doc = client.get_document(&ghost_doc_id).await?;
        let ghost = ghost_from_document(&ghost_doc)
            .ok_or_else(|| Error::new(format!("Ghost not found: {}", ghost_id)))?;
        
        // GhostStateGraphQLからGhostStateに変換
        let mut ghost_state = GhostState::new(
            ghost.state.truth,
            ghost.state.coherence,
            ghost.state.memory_integrity,
            ghost.state.noise,
            ghost.state.emotion_distortion,
        );
        
        // イベント断片を取得
        // TODO: WOQLクエリでゴーストに関連するイベント断片を取得
        // 簡易実装: 順序からイベント断片を構築
        let fragments = order.iter().map(|&id| {
            game_core::puzzle::timeline::EventFragment {
                id,
                content: String::new(),
                timestamp: None, // TODO: 実際のタイムスタンプを設定
            }
        }).collect();
        
        let timeline = Timeline::new(fragments);
        let params = UpdateParams::default();
        
        // ゴースト状態を更新
        update_timeline_correction(&mut ghost_state, &timeline, &params);
        
        // TerminusDBを更新
        let updated_ghost = Ghost {
            id: ghost.id,
            state: GhostStateGraphQL::from(ghost_state),
        };
        let updated_doc = ghost_to_document(&updated_ghost);
        client.update_document(&updated_doc).await?;
        
        Ok(true)
    }

    /// 因果関係更新
    async fn update_causality(
        &self,
        ghost_id: Uuid,
        links: Vec<CausalLinkInput>,
    ) -> Result<bool> {
        let client = get_client()?;
        
        // ゴーストを取得
        let ghost_doc_id = format!("ghost:{}", ghost_id);
        let ghost_doc = client.get_document(&ghost_doc_id).await?;
        let ghost = ghost_from_document(&ghost_doc)
            .ok_or_else(|| Error::new(format!("Ghost not found: {}", ghost_id)))?;
        
        // GhostStateGraphQLからGhostStateに変換
        let mut ghost_state = GhostState::new(
            ghost.state.truth,
            ghost.state.coherence,
            ghost.state.memory_integrity,
            ghost.state.noise,
            ghost.state.emotion_distortion,
        );
        
        // 因果リンクを構築
        let causal_links = links.iter().map(|link| {
            game_core::puzzle::causality::CausalLink {
                id: Uuid::new_v4(),
                from: link.from,
                to: link.to,
                is_correct: true, // TODO: 実際の検証ロジックを実装
            }
        }).collect();
        
        let causality = Causality::new(causal_links);
        let params = UpdateParams::default();
        
        // ゴースト状態を更新
        update_causality_correction(&mut ghost_state, &causality, &params);
        
        // TerminusDBを更新
        let updated_ghost = Ghost {
            id: ghost.id,
            state: GhostStateGraphQL::from(ghost_state),
        };
        let updated_doc = ghost_to_document(&updated_ghost);
        client.update_document(&updated_doc).await?;
        
        Ok(true)
    }

    /// 感情ラベル更新
    async fn update_emotions(
        &self,
        ghost_id: Uuid,
        labels: Vec<EmotionLabelInput>,
    ) -> Result<bool> {
        let client = get_client()?;
        
        // ゴーストを取得
        let ghost_doc_id = format!("ghost:{}", ghost_id);
        let ghost_doc = client.get_document(&ghost_doc_id).await?;
        let ghost = ghost_from_document(&ghost_doc)
            .ok_or_else(|| Error::new(format!("Ghost not found: {}", ghost_id)))?;
        
        // GhostStateGraphQLからGhostStateに変換
        let mut ghost_state = GhostState::new(
            ghost.state.truth,
            ghost.state.coherence,
            ghost.state.memory_integrity,
            ghost.state.noise,
            ghost.state.emotion_distortion,
        );
        
        // 感情ラベルを構築
        use game_core::puzzle::emotion::{EmotionLabel, EmotionType};
        let emotion_labels: Vec<EmotionLabel> = labels.iter().map(|label| {
            let emotion_type = match label.emotion.as_str() {
                "joy" => EmotionType::Joy,
                "sadness" => EmotionType::Sadness,
                "anger" => EmotionType::Anger,
                "fear" => EmotionType::Fear,
                "surprise" => EmotionType::Surprise,
                "disgust" => EmotionType::Disgust,
                _ => EmotionType::Neutral,
            };
            EmotionLabel {
                event_id: label.event_id,
                emotion: emotion_type,
                intensity: label.intensity,
                is_correct: true, // TODO: 実際の検証ロジックを実装
            }
        }).collect();
        
        let emotion = Emotion::new(emotion_labels);
        let params = UpdateParams::default();
        
        // ゴースト状態を更新
        update_emotion_correction(&mut ghost_state, &emotion, &params);
        
        // TerminusDBを更新
        let updated_ghost = Ghost {
            id: ghost.id,
            state: GhostStateGraphQL::from(ghost_state),
        };
        let updated_doc = ghost_to_document(&updated_ghost);
        client.update_document(&updated_doc).await?;
        
        Ok(true)
    }

    /// セッション完了
    async fn complete_session(
        &self,
        session_id: Uuid,
        reflection: Option<ReflectionInput>,
    ) -> Result<Session> {
        let client = get_client()?;
        
        // セッションを取得（存在しない場合は新規作成）
        let session_doc_id = format!("session:{}", session_id);
        let session = match client.get_document(&session_doc_id).await {
            Ok(doc) => {
                session_from_document(&doc)
                    .ok_or_else(|| Error::new(format!("Failed to parse session: {}", session_id)))?
            }
            Err(_) => {
                // 新規セッション作成
                let ghost_id = Uuid::new_v4(); // TODO: 実際のゴーストIDを取得
                Session {
                    id: session_id,
                    ghost_id,
                }
            }
        };
        
        // リフレクションを追加（オプション）
        if let Some(_reflection_input) = reflection {
            // TODO: セッションにリフレクションを追加するロジックを実装
            // 現在はセッションドキュメントに直接保存
        }
        
        // TerminusDBに保存/更新
        let doc = session_to_document(&session);
        client.insert_document(&doc).await?;
        
        Ok(session)
    }
}

// GraphQL型定義は models.rs に移動

#[derive(InputObject)]
pub struct CreateGhostInput {
    pub traits: Vec<String>,
    pub values: Vec<ValuePreferenceInput>,
}

#[derive(InputObject)]
pub struct ValuePreferenceInput {
    pub value_type: String,
    pub weight: f32,
}

#[derive(InputObject)]
pub struct GhostStateInput {
    pub truth: f32,
    pub coherence: f32,
    pub memory_integrity: f32,
    pub noise: f32,
    pub emotion_distortion: f32,
}

#[derive(InputObject)]
pub struct EventFragmentInput {
    pub content: String,
}

#[derive(InputObject)]
pub struct CausalLinkInput {
    pub from: Uuid,
    pub to: Uuid,
}

#[derive(InputObject)]
pub struct EmotionLabelInput {
    pub event_id: Uuid,
    pub emotion: String,
    pub intensity: f32,
}

#[derive(InputObject)]
pub struct ReflectionInput {
    pub question: String,
    pub answer: String,
}

#[derive(Default)]
pub struct SubscriptionRoot;

#[Subscription]
impl SubscriptionRoot {
    /// ゴースト状態変更通知
    async fn ghost_state_changed(&self, _ghost_id: Uuid) -> impl Stream<Item = Result<GhostStateGraphQL>> {
        // TODO: リアルタイムでゴースト状態変更を通知
        stream! {
            yield Ok(GhostStateGraphQL::from(GhostState::default()));
        }
    }

    /// 新規イベント断片通知
    async fn new_event_fragment(&self, _ghost_id: Uuid) -> impl Stream<Item = Result<EventFragment>> {
        // TODO: リアルタイムで新規イベント断片を通知
        stream! {
            yield Ok(EventFragment {
                id: Uuid::new_v4(),
                content: String::new(),
            });
        }
    }
}
