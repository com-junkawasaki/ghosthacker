# LLM RAG PostgreSQL Schema Design

TypeDB ERAモデルとpgvectorを使ったLLM RAG用のPostgreSQLテーブル設計

## 概要

このスキーマは、TypeDBのEntity-Relationship-Attribute (ERA) モデルに基づいて設計された、LLM RAG (Retrieval-Augmented Generation) システム用のPostgreSQLデータベースです。

### 主な特徴

- **TypeDB ERAモデル準拠**: Entity、Relation、Attributeの概念をPostgreSQLテーブルにマッピング
- **pgvector統合**: ベクトル類似度検索のためのpgvector拡張機能を使用
- **wasmCloud対応**: WebAssemblyクラウド環境での運用を考慮した設計
- **スケーラブル**: HNSWインデックスによる高速な近似最近傍検索

## ファイル構成

- `typedb-era-schema.tql`: TypeDBのERAモデル定義
- `postgresql-schema.sql`: PostgreSQLテーブル定義とpgvector設定
- `example-queries.sql`: 使用例とクエリサンプル

## エンティティ構造

### 1. Collection (コレクション)
- ドキュメントの名前空間・グループ化
- 複数のユーザーがアクセス可能

### 2. User (ユーザー)
- wasmCloudアクターを表す
- アクターIDと名前を保持

### 3. Document (ドキュメント)
- 元のドキュメント情報
- タイトル、ソース、URI、メタデータを保持

### 4. Chunk (チャンク)
- ドキュメントを分割したテキストチャンク
- インデックスとサイズ情報を保持

### 5. Embedding (埋め込み)
- pgvector型のベクトル埋め込み
- デフォルト1536次元（OpenAI ada-002対応）
- 複数の埋め込みモデルに対応

### 6. Query (クエリ)
- 検索クエリの記録
- クエリベクトルと結果数を保持

## 関係構造

- `document_chunk`: ドキュメントとチャンクの包含関係
- `chunk_embedding`: チャンクと埋め込みの関係
- `document_collection`: ドキュメントとコレクションの所属関係
- `user_collection`: ユーザーとコレクションのアクセス権限
- `query_collection`: クエリとコレクションの検索関係
- `query_result`: クエリ結果とチャンクの関係
- `chunk_sequence`: チャンク間の前後関係

## インデックス戦略

### ベクトル検索インデックス

1. **HNSW Index** (推奨)
   - 高速な近似最近傍検索
   - `m = 16, ef_construction = 64` で設定
   - コサイン類似度検索に最適化

2. **IVFFlat Index** (代替)
   - より高速な構築時間
   - メモリ使用量が少ない
   - クエリ性能はHNSWより低い

### その他のインデックス

- B-tree: 主キー、外部キー、一般的な検索
- GIN: JSONBメタデータの高速検索
- 複合インデックス: 頻繁なクエリパターンに対応

## 使用方法

### 1. データベースセットアップ

```sql
-- pgvector拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- スキーマを実行
\i schema/postgresql-schema.sql
```

### 2. 基本的な操作

#### コレクション作成
```sql
INSERT INTO collections (collection_name, collection_description)
VALUES ('my-docs', 'My document collection');
```

#### ドキュメント追加
```sql
INSERT INTO documents (collection_id, document_title, document_source)
SELECT collection_id, 'My Document', 'source'
FROM collections WHERE collection_name = 'my-docs';
```

#### チャンク追加
```sql
INSERT INTO chunks (document_id, chunk_text, chunk_index)
SELECT document_id, 'Chunk text here', 0
FROM documents WHERE document_title = 'My Document';
```

#### 埋め込み追加
```sql
INSERT INTO embeddings (chunk_id, embedding_model, embedding_dimension, embedding)
VALUES (
    'chunk-uuid',
    'text-embedding-ada-002',
    1536,
    '[0.1, 0.2, ...]'::vector(1536)
);
```

### 3. ベクトル類似度検索

```sql
-- 関数を使用した検索
SELECT * FROM find_similar_chunks(
    p_query_vector := '[0.1, 0.2, ...]'::vector(1536),
    p_collection_id := 'collection-uuid',
    p_limit := 10,
    p_threshold := 0.7
);

-- 直接クエリ
SELECT 
    c.chunk_text,
    1 - (e.embedding <=> '[0.1, 0.2, ...]'::vector(1536)) AS similarity
FROM embeddings e
JOIN chunks c ON e.chunk_id = c.chunk_id
ORDER BY e.embedding <=> '[0.1, 0.2, ...]'::vector(1536)
LIMIT 10;
```

### 4. ハイブリッド検索

```sql
SELECT * FROM hybrid_search(
    p_query_vector := '[0.1, 0.2, ...]'::vector(1536),
    p_collection_id := 'collection-uuid',
    p_metadata_filter := '{"section": "introduction"}'::jsonb,
    p_limit := 10
);
```

## wasmCloud統合

### アクターからのアクセス

wasmCloudアクターは以下の方法でデータベースにアクセスできます：

1. **SQLx経由**: Rustアクターから直接SQLxを使用
2. **HTTP API経由**: データベースアクセス用のHTTPサーバーアクター経由
3. **カスタムインターフェース**: wasmCloudのインターフェース定義を使用

### 推奨パターン

```rust
// Rustアクターでの使用例（概念）
use sqlx::postgres::PgPool;

async fn search_similar_chunks(
    pool: &PgPool,
    query_vector: Vec<f32>,
    collection_id: Uuid,
    limit: i32,
) -> Result<Vec<Chunk>> {
    let query = sqlx::query_as!(
        Chunk,
        "SELECT * FROM find_similar_chunks($1, $2, $3, 0.0, 'text-embedding-ada-002')",
        query_vector.as_slice(),
        collection_id,
        limit
    )
    .fetch_all(pool)
    .await?;
    
    Ok(query)
}
```

## パフォーマンス最適化

### 1. インデックス調整

データセットサイズに応じてHNSWパラメータを調整：

```sql
-- 大規模データセット用
CREATE INDEX idx_embeddings_hnsw_large ON embeddings 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 32, ef_construction = 128);
```

### 2. 接続プーリング

wasmCloud環境では、接続プーリングを適切に設定：

```rust
let pool = PgPoolOptions::new()
    .max_connections(10)
    .connect(&database_url)
    .await?;
```

### 3. バッチ処理

大量の埋め込みを挿入する場合は、バッチ処理を使用：

```sql
-- バッチ挿入関数を使用
SELECT * FROM batch_insert_embeddings('[...]'::jsonb);
```

## メンテナンス

### 定期的なタスク

1. **古いクエリの削除**
   ```sql
   DELETE FROM queries WHERE created_at < NOW() - INTERVAL '30 days';
   ```

2. **インデックスの再構築**
   ```sql
   REINDEX INDEX idx_embeddings_hnsw;
   ```

3. **統計情報の更新**
   ```sql
   ANALYZE embeddings;
   ```

## 制限事項と注意点

1. **ベクトル次元**: デフォルトは1536次元。異なる次元を使用する場合はスキーマを変更
2. **インデックスサイズ**: HNSWインデックスはメモリを多く使用する可能性がある
3. **近似検索**: HNSW/IVFFlatは近似検索のため、完全一致ではない
4. **同時実行**: 高負荷時は接続プーリングとトランザクション管理に注意

## ライセンス

このスキーマ設計はプロジェクトの一部として提供されます。
