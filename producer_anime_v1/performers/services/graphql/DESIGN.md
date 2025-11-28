# GraphQL Backend Design

## 概要

producer のバックエンドを Rust + GraphQL で実装し、DoDAF v2 DM2 に基づいて capability と activity で設計をまとめました。

## アーキテクチャ

### Capability & Activity 設計

- **Story Management Capability**: プロジェクト、ナラティブ、キャラクター、バックストーリー、エピソード、スタイル、プラットフォームの管理
- **Canvas Management Capability**: キャンバス設定とストーリーグラフの管理
- **Pipeline Execution Capability**: パイプライン実行とトポロジー管理

詳細は `../../capabilities.jsonld` と `../../activities.jsonld` を参照してください。

### ディレクトリ構造

```
performers/services/graphql/
├── Cargo.toml
├── diesel.toml
├── src/
│   ├── main.rs              # エントリーポイント
│   ├── lib.rs
│   ├── schema/
│   │   ├── mod.rs
│   │   ├── query.rs         # GraphQL Query
│   │   ├── mutation.rs      # GraphQL Mutation
│   │   └── types/           # GraphQL Types
│   ├── activities/
│   │   ├── mod.rs
│   │   ├── story.rs         # Story Management Activities
│   │   ├── canvas.rs        # Canvas Management Activities
│   │   └── pipeline.rs      # Pipeline Execution Activities
│   ├── ports/
│   │   ├── mod.rs
│   │   ├── query/
│   │   └── mutation/
│   └── infra/
│       ├── mod.rs
│       ├── database.rs      # データベース接続
│       └── schema.rs        # Diesel スキーマ
└── resources/
    └── database/
        └── migrations/       # マイグレーション
```

## GraphQL Schema

### Query

- `project(id: ID!) -> Project`
- `projects -> [Project!]!`
- `narrative(projectId: ID!) -> Narrative`
- `characters(projectId: ID!) -> [Character!]!`
- `backstories(projectId: ID!) -> [Backstory!]!`
- `episodes(projectId: ID!) -> [Episode!]!`
- `styles(projectId: ID!) -> Style`
- `platforms(projectId: ID!) -> Platform`
- `canvas(projectId: ID!) -> Canvas`
- `storyGraph(projectId: ID!) -> StoryGraph`
- `pipelineTopology -> PipelineTopology`

### Mutation

- `createProject(input: ProjectInput!) -> Project`
- `updateProject(id: ID!, input: ProjectInput!) -> Project`
- `saveNarrative(projectId: ID!, input: NarrativeInput!) -> Narrative`
- `saveCharacters(projectId: ID!, input: [CharacterInput!]!) -> [Character!]!`
- `saveBackstories(projectId: ID!, input: [BackstoryInput!]!) -> [Backstory!]!`
- `saveEpisodes(projectId: ID!, input: [EpisodeInput!]!) -> [Episode!]!`
- `saveStyles(projectId: ID!, input: StyleInput!) -> Style`
- `savePlatforms(projectId: ID!, input: PlatformInput!) -> Platform`
- `saveCanvas(projectId: ID!, input: CanvasInput!) -> Canvas`
- `runPipeline(input: PipelineInput!) -> PipelineExecution`

## データベース統合

Diesel ORM を使用して Supabase PostgreSQL に接続します。

- スキーマ定義: `src/infra/schema.rs`
- 接続プール: `src/infra/database.rs`
- Drizzle スキーマから手動で変換（`producer/src/infra/supabase/schema.ts` を参照）

## 実行方法

```bash
cd performers/services/graphql
export DATABASE_URL="postgresql://user:password@localhost/dbname"
cargo run
```

GraphQL Playground: http://localhost:8080/graphql

## 次のステップ

1. Story Activities の完全な実装（現在は stub）
2. Canvas Activities の完全な実装（現在は stub）
3. Pipeline Activities の完全な実装（story.jsonnet の読み込み）
4. フロントエンドの GraphQL 移行
5. tRPC コードの削除

