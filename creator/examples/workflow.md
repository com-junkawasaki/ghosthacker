# 統合IRワークフロー: エンドツーエンド使用例

## 概要

このドキュメントは、統合IR（Symbolic + Graph + Vector）システムを使用したエンドツーエンドのワークフローを説明します。

## 前提条件

- PostgreSQLデータベースが起動している（`docker-compose up -d`）
- OpenAI APIキーが設定されている（`OPENAI_API_KEY`環境変数）
- Rustツールチェーンがインストールされている

## ワークフロー全体像

```
ログライン作成
    ↓
IR作成（JSON-LD）
    ↓
PostgreSQLに保存
    ↓
Embedding生成
    ↓
LLMで脚本生成
    ↓
IR更新（生成テキストから情報抽出）
    ↓
画像生成（DALL-E 3）
    ↓
画像分析（GPT-4 Vision）
    ↓
IR更新（視覚情報の反映）
```

## ステップ1: IR作成と保存

### 1.1 JSON-LD IRファイルの準備

`examples/ghost-hacker-episode1.jsonld`を参照してください。このファイルには：
- World（世界観）
- Characters（キャラクター）
- Scene（シーン）
- Shot（ショット）
- Relations（関係）

が含まれています。

### 1.2 PostgreSQLに保存

```rust
use rag_storage::{StorageClient, save_ir_entity, save_ir_relation};
use serde_json::Value;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let storage = StorageClient::new().await?;
    
    // JSON-LDファイルを読み込む
    let jsonld: Value = serde_json::from_str(include_str!("ghost-hacker-episode1.jsonld"))?;
    
    // @graphから各Entityを保存
    if let Some(graph) = jsonld.get("@graph").and_then(|g| g.as_array()) {
        for entity in graph {
            let entity_id = entity.get("@id").and_then(|v| v.as_str()).unwrap();
            let entity_type = entity.get("@type").and_then(|v| v.as_str()).unwrap();
            
            if entity_type == "Relation" {
                // Relationの処理
                let relation_type = entity.get("relationType").and_then(|v| v.as_str()).unwrap();
                let from = entity.get("from").and_then(|v| v.as_str()).unwrap();
                let to = entity.get("to").and_then(|v| v.as_str()).unwrap();
                
                save_ir_relation(
                    &storage,
                    entity_id,
                    relation_type,
                    from,
                    to,
                    entity,
                    None,
                    None,
                ).await?;
            } else {
                // Entityの処理
                save_ir_entity(
                    &storage,
                    entity_id,
                    entity_type,
                    entity,
                    None,
                ).await?;
            }
        }
    }
    
    Ok(())
}
```

## ステップ2: Embedding生成

### 2.1 自動Embedding生成

```rust
use rag_embedding::generate_and_store_embeddings;
use rag_openai::OpenAIClient;
use rag_storage::StorageClient;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let openai = OpenAIClient::new()?;
    let storage = StorageClient::new().await?;
    
    // Entityのembeddingを生成
    let entity_ids = vec![
        "char:ghost-hacker",
        "char:intel-girl",
        "scene:001-rooftop-setup",
    ];
    
    for entity_id in entity_ids {
        generate_and_store_embeddings(&openai, &storage, entity_id).await?;
        println!("Generated embedding for: {}", entity_id);
    }
    
    Ok(())
}
```

## ステップ3: LLMで脚本生成

### 3.1 Sceneから脚本生成

```rust
use rag_openai::{llm::generate_script_from_scene, LLMModel, OpenAIClient};
use rag_storage::{load_ir_entity, StorageClient};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let openai = OpenAIClient::new()?;
    let storage = StorageClient::new().await?;
    
    // Sceneを読み込む
    let scene = load_ir_entity(&storage, "scene:001-rooftop-setup").await?;
    
    // キャラクター情報を取得
    let mut characters = Vec::new();
    if let Some(char_ids) = scene.get("characters").and_then(|c| c.as_array()) {
        for char_id in char_ids {
            if let Some(id_str) = char_id.as_str() {
                let char_entity = load_ir_entity(&storage, id_str).await?;
                let name = char_entity.get("name").and_then(|v| v.as_str()).unwrap_or("");
                let llm_label = char_entity.get("llmLabel").and_then(|v| v.as_str());
                characters.push((name.to_string(), llm_label.map(|s| s.to_string())));
            }
        }
    }
    
    // 脚本生成
    let script = generate_script_from_scene(
        &openai,
        scene.get("title").and_then(|v| v.as_str()).unwrap_or(""),
        scene.get("summary").and_then(|v| v.as_str()).unwrap_or(""),
        scene.get("llmLabel").and_then(|v| v.as_str()),
        &characters.iter().map(|(n, l)| (n.clone(), l.as_deref())).collect::<Vec<_>>(),
        LLMModel::Gpt4Turbo,
    ).await?;
    
    println!("Generated Script:\n{}", script);
    
    Ok(())
}
```

## ステップ4: 画像生成

### 4.1 Sceneから画像生成

```rust
use rag_openai::{image::generate_image_from_scene, ImageQuality, ImageSize, OpenAIClient};
use rag_storage::{load_ir_entity, StorageClient};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let openai = OpenAIClient::new()?;
    let storage = StorageClient::new().await?;
    
    // Sceneを読み込む
    let scene = load_ir_entity(&storage, "scene:001-rooftop-setup").await?;
    
    // キャラクター情報を取得
    let mut char_prompts = Vec::new();
    if let Some(char_ids) = scene.get("characters").and_then(|c| c.as_array()) {
        for char_id in char_ids {
            if let Some(id_str) = char_id.as_str() {
                let char_entity = load_ir_entity(&storage, id_str).await?;
                if let Some(prompt) = char_entity.get("imagePrompt").and_then(|v| v.as_str()) {
                    char_prompts.push(prompt.to_string());
                }
            }
        }
    }
    
    // Shot情報を取得（オプション）
    // ...
    
    // 画像生成
    let image = generate_image_from_scene(
        &openai,
        scene.get("imagePrompt").and_then(|v| v.as_str()).unwrap_or(""),
        Some(&char_prompts),
        None,
        ImageSize::Square1024,
        ImageQuality::Standard,
    ).await?;
    
    println!("Generated Image URL: {}", image.url);
    if let Some(revised) = image.revised_prompt {
        println!("Revised Prompt: {}", revised);
    }
    
    Ok(())
}
```

## ステップ5: 画像分析とIR更新

### 5.1 生成画像を分析

```rust
use rag_openai::{vision::analyze_scene_image, OpenAIClient};
use rag_pipeline::image_to_ir;
use rag_storage::{load_ir_entity, save_ir_entity, StorageClient};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let openai = OpenAIClient::new()?;
    let storage = StorageClient::new().await?;
    
    // 生成された画像URL（前のステップから）
    let image_url = "https://..."; // 実際の画像URL
    
    // Scene情報を読み込む
    let scene = load_ir_entity(&storage, "scene:001-rooftop-setup").await?;
    let scene_title = scene.get("title").and_then(|v| v.as_str()).unwrap_or("");
    
    // 画像分析
    let analysis = analyze_scene_image(&openai, image_url, scene_title).await?;
    
    println!("Analysis Description: {}", analysis.description);
    println!("Visual Elements: {:?}", analysis.visual_elements);
    println!("Suggested Updates: {:?}", analysis.suggested_updates);
    
    // IR更新
    let updates = image_to_ir(&analysis);
    
    // Sceneを更新
    let mut updated_scene = scene.clone();
    if let Some(llm_label) = updates.get("llmLabel") {
        updated_scene["llmLabel"] = llm_label.clone();
    }
    // その他の更新...
    
    // 保存
    save_ir_entity(
        &storage,
        "scene:001-rooftop-setup",
        "Scene",
        &updated_scene,
        None,
    ).await?;
    
    Ok(())
}
```

## ステップ6: グラフ探索とベクトル検索

### 6.1 関連Entityの探索

```rust
use rag_storage::{find_related_entities, StorageClient};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let storage = StorageClient::new().await?;
    
    // 関連Entityを探索
    let related = find_related_entities(
        &storage,
        "char:ghost-hacker",
        Some("Mentors"), // 特定の関係型でフィルタ
        2, // 最大深度
    ).await?;
    
    println!("Related Entities:");
    for entity in related {
        println!("- {}: {}", 
            entity.get("@id").and_then(|v| v.as_str()).unwrap_or(""),
            entity.get("name").and_then(|v| v.as_str()).unwrap_or("")
        );
    }
    
    Ok(())
}
```

### 6.2 ベクトル類似度検索

```rust
use rag_openai::{embedding::generate_embedding, EmbeddingModel, OpenAIClient};
use rag_storage::{query_by_embedding, StorageClient};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let openai = OpenAIClient::new()?;
    let storage = StorageClient::new().await?;
    
    // クエリテキストからembedding生成
    let query_text = "elite hacker in Tokyo";
    let query_vector = generate_embedding(&openai, query_text, EmbeddingModel::Ada002).await?;
    
    // 類似Entityを検索
    let similar = query_by_embedding(
        &storage,
        &query_vector,
        None, // collection_id
        5, // limit
        0.7, // threshold
    ).await?;
    
    println!("Similar Entities:");
    for entity in similar {
        println!("- {}: {}", 
            entity.get("@id").and_then(|v| v.as_str()).unwrap_or(""),
            entity.get("name").and_then(|v| v.as_str()).unwrap_or("")
        );
    }
    
    Ok(())
}
```

## まとめ

このワークフローにより、以下が実現できます：

1. **IR作成**: JSON-LDで世界観・キャラクター・シーンを定義
2. **自動Embedding**: embedHint/llmLabelからベクトル生成
3. **LLM生成**: Sceneから脚本・小説を生成
4. **画像生成**: imagePromptから画像を生成
5. **画像分析**: 生成画像を分析してIR更新
6. **グラフ探索**: 関係性に基づくEntity探索
7. **ベクトル検索**: 意味的類似性に基づく検索

これにより、**Symbolic + Graph + Vector**の統合IRシステムが完成します。
