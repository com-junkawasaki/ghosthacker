# Migration Guide: TypeDB ERA to PostgreSQL with pgvector

TypeDB ERAモデルからPostgreSQL + pgvectorへの移行ガイド

## 概要

このガイドは、TypeDBのERAモデルで設計されたスキーマを、PostgreSQL + pgvector実装に移行する際の手順を説明します。

## TypeDB ERA → PostgreSQL マッピング

### Entity → Table

| TypeDB Entity | PostgreSQL Table | 説明 |
|--------------|------------------|------|
| `document` | `documents` | ドキュメントエンティティ |
| `chunk` | `chunks` | チャンクエンティティ |
| `embedding` | `embeddings` | 埋め込みエンティティ（pgvector使用） |
| `collection` | `collections` | コレクションエンティティ |
| `user` | `users` | ユーザーエンティティ（wasmCloudアクター） |
| `query` | `queries` | クエリエンティティ |

### Relation → Junction Table / Foreign Key

| TypeDB Relation | PostgreSQL Implementation | 説明 |
|----------------|---------------------------|------|
| `document_chunk` | `chunks.document_id` (FK) + `chunk_order` | ドキュメント-チャンク関係 |
| `chunk_embedding` | `embeddings.chunk_id` (FK) | チャンク-埋め込み関係 |
| `document_collection` | `documents.collection_id` (FK) | ドキュメント-コレクション関係 |
| `user_collection` | `user_collections` (junction table) | ユーザー-コレクション関係 |
| `query_collection` | `queries.collection_id` (FK) | クエリ-コレクション関係 |
| `query_result` | `query_results` (junction table) | クエリ結果関係 |
| `chunk_sequence` | `chunk_sequences` (junction table) | チャンク順序関係 |

### Attribute → Column

| TypeDB Attribute | PostgreSQL Column Type | 説明 |
|-----------------|------------------------|------|
| `@key` attributes | `UUID PRIMARY KEY` | 主キー属性 |
| `string` | `VARCHAR`, `TEXT` | 文字列属性 |
| `long` | `INTEGER`, `BIGINT` | 整数属性 |
| `double` | `DOUBLE PRECISION` | 浮動小数点属性 |
| `datetime` | `TIMESTAMP WITH TIME ZONE` | 日時属性 |
| `metadata_json` | `JSONB` | JSONメタデータ |
| `query_vector` | `vector(1536)` | ベクトル属性（pgvector） |

## 主な違い

### 1. ベクトル型

**TypeDB ERA:**
```
owns query_vector;
query_vector sub attribute, value string;
```

**PostgreSQL:**
```sql
query_vector vector(1536) NOT NULL
```

pgvector拡張機能により、ネイティブなベクトル型を使用。

### 2. 関係の実装

**TypeDB ERA:**
```
document_chunk sub relation,
    relates document,
    relates chunk;
```

**PostgreSQL:**
```sql
CREATE TABLE chunks (
    chunk_id UUID PRIMARY KEY,
    document_id UUID REFERENCES documents(document_id),
    ...
);
```

外部キー制約で関係を実装。

### 3. メタデータ

**TypeDB ERA:**
```
owns metadata_json;
metadata_json sub attribute, value string;
```

**PostgreSQL:**
```sql
metadata JSONB DEFAULT '{}'::jsonb
```

JSONB型により、高速なJSON検索とインデックス化が可能。

## 移行手順

### 1. データベースセットアップ

```bash
# Docker Composeで起動
docker-compose up -d postgres

# データベースに接続
docker exec -it rag-postgres psql -U rag_user -d rag_db
```

### 2. スキーマ作成

```sql
-- スキーマファイルを実行
\i /docker-entrypoint-initdb.d/01-schema.sql
```

### 3. データ移行（既存データがある場合）

TypeDBからデータをエクスポートし、PostgreSQLにインポートするスクリプトを作成：

```python
# 例: Python移行スクリプト
import psycopg2
from typedb.client import TypeDB, SessionType, TransactionType

# TypeDBからデータ取得
with TypeDB.core_client("localhost:1729") as client:
    with client.session("rag_db", SessionType.DATA) as session:
        with session.transaction(TransactionType.READ) as tx:
            # ドキュメント取得
            documents = tx.query().match("match $d isa document; get $d;")
            # PostgreSQLに挿入
            # ...
```

### 4. 検証

```sql
-- テーブル確認
\dt

-- インデックス確認
\di

-- サンプルクエリ実行
SELECT * FROM collection_stats LIMIT 5;
```

## パフォーマンス最適化

### 1. インデックス調整

データ量に応じてHNSWパラメータを調整：

```sql
-- 小規模（< 100K vectors）
CREATE INDEX idx_embeddings_hnsw_small ON embeddings 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- 中規模（100K - 1M vectors）
CREATE INDEX idx_embeddings_hnsw_medium ON embeddings 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 32, ef_construction = 128);

-- 大規模（> 1M vectors）
CREATE INDEX idx_embeddings_hnsw_large ON embeddings 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 64, ef_construction = 256);
```

### 2. 接続プーリング

wasmCloud環境での推奨設定：

```rust
use sqlx::postgres::PgPoolOptions;

let pool = PgPoolOptions::new()
    .max_connections(20)
    .min_connections(5)
    .acquire_timeout(std::time::Duration::from_secs(30))
    .connect(&database_url)
    .await?;
```

### 3. バッチ処理

大量データの挿入時はバッチ処理を使用：

```sql
-- バッチ挿入関数を使用
INSERT INTO embeddings (chunk_id, embedding_model, embedding_dimension, embedding)
SELECT 
    chunk_id,
    'text-embedding-ada-002',
    1536,
    embedding::vector(1536)
FROM unnest($1::uuid[], $2::vector(1536)[]) AS t(chunk_id, embedding);
```

## トラブルシューティング

### 1. インデックス構築エラー

```
ERROR: cannot create index on table with less than 1000 rows
```

**解決策**: データが1000行未満の場合は、IVFFlatインデックスを使用するか、データを追加してからHNSWインデックスを作成。

### 2. メモリ不足

```
ERROR: out of memory
```

**解決策**: 
- HNSWの`ef_construction`パラメータを減らす
- バッチサイズを小さくする
- サーバーのメモリを増やす

### 3. ベクトル次元の不一致

```
ERROR: vector dimension mismatch
```

**解決策**: すべてのベクトルが同じ次元であることを確認。異なるモデルを使用する場合は、別のカラムまたはテーブルを使用。

## ベストプラクティス

1. **トランザクション管理**: 複数のテーブルへの挿入はトランザクションで囲む
2. **エラーハンドリング**: 適切なエラーハンドリングとロギングを実装
3. **バックアップ**: 定期的なバックアップを設定
4. **モニタリング**: クエリパフォーマンスを監視
5. **バージョン管理**: スキーマ変更はマイグレーションスクリプトで管理

## 参考リソース

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [TypeDB Documentation](https://docs.vaticle.com/)
- [wasmCloud Documentation](https://wasmcloud.com/docs/)
- [PostgreSQL JSONB Documentation](https://www.postgresql.org/docs/current/datatype-json.html)
