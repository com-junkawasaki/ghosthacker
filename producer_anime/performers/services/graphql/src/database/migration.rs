/**
 * Database Migration
 * PostgreSQLからHelixDBへのデータ移行スクリプト
 * 
 * @context {
 *   "@id": "ex:DatabaseMigration",
 *   "@type": "ex:Activity",
 *   "ex:provides": "ex:DataMigration"
 * }
 */

use anyhow::{Context, Result};
use serde_json::Value;
use tracing::{info, error};
use sqlx::FromRow;

use crate::database::client::get_pool;
use crate::graph::helixdb::{get_client, GraphNode, GraphEdge};
use crate::graph::jsonld::JsonLdProcessor;
use crate::graph::embedding::get_service as get_embedding_service;

#[derive(FromRow)]
struct TripleRow {
    subject: String,
    predicate: String,
    object: String,
    object_type: String,
    graph: Option<String>,
}

#[derive(FromRow)]
struct ContextRow {
    id: String,
    #[sqlx(json)]
    context: Value,
}

/// PostgreSQLからHelixDBへのRDFトリプルデータを移行
pub async fn migrate_rdf_triples() -> Result<()> {
    info!("Starting RDF triples migration from PostgreSQL to HelixDB");

    let pool = get_pool()?;
    let helixdb = get_client()?;
    let embedding_service = get_embedding_service()?;

    // RDFトリプルを取得
    let triples: Vec<TripleRow> = sqlx::query_as::<_, TripleRow>(
        r#"
        SELECT subject, predicate, object, object_type, graph
        FROM rdf_triples
        ORDER BY subject, predicate
        "#
    )
    .fetch_all(pool.as_ref())
    .await?;

    info!("Found {} RDF triples to migrate", triples.len());

    let mut node_map: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    let mut processed_nodes: std::collections::HashSet<String> = std::collections::HashSet::new();

    // ノードを作成
    for triple in &triples {
        if !processed_nodes.contains(&triple.subject) {
            // ノードが既に存在するか確認
            if helixdb.get_node(&triple.subject).await?.is_none() {
                let node = GraphNode {
                    id: Some(triple.subject.clone()),
                    label: format!("RDF Resource: {}", triple.subject),
                    properties: serde_json::json!({
                        "rdf_type": "Resource",
                        "source": "postgresql_migration"
                    }),
                    vector: None,
                };

                let node_id = helixdb.create_node(&node).await?;
                node_map.insert(triple.subject.clone(), node_id.clone());
                processed_nodes.insert(triple.subject.clone());

                info!("Created node: {}", node_id);
            } else {
                node_map.insert(triple.subject.clone(), triple.subject.clone());
                processed_nodes.insert(triple.subject.clone());
            }
        }
    }

    // エッジを作成
    let mut edge_count = 0;
    for triple in &triples {
        if triple.object_type == "uri" {
            let source = node_map.get(&triple.subject)
                .ok_or_else(|| anyhow::anyhow!("Source node not found: {}", triple.subject))?;
            let target = node_map.get(&triple.object)
                .ok_or_else(|| anyhow::anyhow!("Target node not found: {}", triple.object))?;

            let edge = GraphEdge {
                id: None,
                source: source.clone(),
                target: target.clone(),
                label: triple.predicate.clone(),
                properties: serde_json::json!({
                    "graph": triple.graph.clone().unwrap_or_default(),
                    "source": "postgresql_migration"
                }),
            };

            helixdb.create_edge(&edge).await?;
            edge_count += 1;

            if edge_count % 100 == 0 {
                info!("Created {} edges", edge_count);
            }
        }
    }

    info!("Migration completed: {} nodes, {} edges", processed_nodes.len(), edge_count);
    Ok(())
}

/// JSON-LDデータをHelixDBに移行
pub async fn migrate_jsonld_data() -> Result<()> {
    info!("Starting JSON-LD data migration to HelixDB");

    let pool = get_pool()?;
    let helixdb = get_client()?;
    let embedding_service = get_embedding_service()?;

    // JSON-LDコンテキストを取得
    let contexts: Vec<ContextRow> = sqlx::query_as::<_, ContextRow>(
        r#"
        SELECT id, context
        FROM rdf_contexts
        "#
    )
    .fetch_all(pool.as_ref())
    .await?;

    info!("Found {} JSON-LD contexts to migrate", contexts.len());

    for ctx in &contexts {
        let context_value: Value = serde_json::from_value(ctx.context.clone())
            .context("Failed to parse context JSON")?;

        // JSON-LDを検証
        if let Err(e) = JsonLdProcessor::validate(&context_value) {
            error!("Invalid JSON-LD context {}: {}", ctx.id, e);
            continue;
        }

        // 正規化（context=embedded形式）
        let normalized = JsonLdProcessor::normalize_with_embedded_context(&context_value)?;

        // ベクトル埋め込みを生成
        let embedding = embedding_service.embed_jsonld(&normalized).await?;

        // ノードを作成
        let node = GraphNode {
            id: Some(ctx.id.clone()),
            label: format!("JSON-LD Context: {}", ctx.id),
            properties: normalized,
            vector: Some(embedding),
        };

        if helixdb.get_node(&ctx.id).await?.is_none() {
            helixdb.create_node(&node).await?;
            info!("Migrated JSON-LD context: {}", ctx.id);
        } else {
            helixdb.update_node(&ctx.id, &node).await?;
            info!("Updated JSON-LD context: {}", ctx.id);
        }
    }

    info!("JSON-LD migration completed");
    Ok(())
}

/// すべてのデータを移行
pub async fn migrate_all() -> Result<()> {
    info!("Starting full database migration from PostgreSQL to HelixDB");

    migrate_rdf_triples().await?;
    migrate_jsonld_data().await?;

    info!("Full migration completed successfully");
    Ok(())
}

