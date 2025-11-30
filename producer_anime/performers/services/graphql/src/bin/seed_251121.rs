/**
 * Seed Data Import Script for 251121
 * 251121フォルダ内のJSON-LDファイルをシードデータとしてインポート
 */

use anyhow::Result;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use dotenv::dotenv;
use producerv2_graphql::database::client::get_pool;
use producerv2_graphql::graph::postgres::{PostgreSQLGraphClient, GraphNode, GraphEdge};
use producerv2_graphql::graph::jsonld::JsonLdProcessor;
use serde_json::Value;

#[tokio::main]
async fn main() -> Result<()> {
    // 環境変数を読み込む
    dotenv().ok();
    
    tracing_subscriber::fmt::init();
    
    // データベース接続プールを初期化
    producerv2_graphql::database::client::initialize().await?;
    
    // データベースクライアントを取得
    let pool = get_pool()?;
    let client = PostgreSQLGraphClient::new(Arc::new(pool));
    
    // 251121フォルダのパス
    let base_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|p| p.parent())
        .and_then(|p| p.parent())
        .ok_or_else(|| anyhow::anyhow!("Failed to find project root"))?
        .join("251121");
    
    println!("Importing seed data from: {}", base_path.display());
    
    // インポートするファイルの順序
    let files = vec![
        "company_profile.jsonld",
        "character_profiles.jsonld",
        "story_draft.jsonld",
        "manga_script.jsonld",
        "generation_prompts.jsonld",
    ];
    
    let mut total_nodes = 0;
    let mut total_edges = 0;
    
    for file_name in files {
        let file_path = base_path.join(file_name);
        
        if !file_path.exists() {
            println!("⚠️  File not found: {}", file_path.display());
            continue;
        }
        
        println!("\n📄 Processing: {}", file_name);
        
        // ファイルを読み込む
        let content = fs::read_to_string(&file_path)?;
        let jsonld: Value = serde_json::from_str(&content)?;
        
        // JSON-LDを検証
        JsonLdProcessor::validate(&jsonld)
            .map_err(|e| anyhow::anyhow!("Invalid JSON-LD in {}: {}", file_name, e))?;
        
        // ノードとエッジを抽出
        let (node_data_list, edge_data_list) = JsonLdProcessor::extract_graph_nodes_and_edges(&jsonld)
            .map_err(|e| anyhow::anyhow!("Failed to extract nodes and edges from {}: {}", file_name, e))?;
        
        println!("  Found {} nodes, {} edges", node_data_list.len(), edge_data_list.len());
        
        // ノードをインポート
        let mut nodes_created = 0;
        for node_data in node_data_list {
            let node = GraphNode {
                id: Some(node_data.id.clone()),
                label: node_data.label,
                properties: node_data.properties,
                vector: None,
                jsonld: node_data.jsonld,
            };
            
            match client.create_node(&node).await {
                Ok(_) => {
                    nodes_created += 1;
                    total_nodes += 1;
                }
                Err(e) => {
                    eprintln!("  ⚠️  Failed to create node {}: {}", node_data.id, e);
                }
            }
        }
        
        // エッジをインポート
        let mut edges_created = 0;
        for edge_data in edge_data_list {
            let mut edge_props = serde_json::Map::new();
            edge_props.insert("edgeType".to_string(), serde_json::Value::String(edge_data.edge_type));
            
            let edge = GraphEdge {
                id: None,
                source: edge_data.source.clone(),
                target: edge_data.target.clone(),
                label: edge_data.label,
                properties: serde_json::Value::Object(edge_props),
            };
            
            match client.create_edge(&edge).await {
                Ok(_) => {
                    edges_created += 1;
                    total_edges += 1;
                }
                Err(e) => {
                    eprintln!("  ⚠️  Failed to create edge {} -> {}: {}", edge.source, edge.target, e);
                }
            }
        }
        
        println!("  ✓ Imported {} nodes, {} edges", nodes_created, edges_created);
    }
    
    println!("\n✅ Seed data import completed!");
    println!("   Total: {} nodes, {} edges", total_nodes, total_edges);
    
    Ok(())
}

