# wasmCloud 最新ドキュメント調査結果

## wasmCloud v1.8.0 の主な変更点

### コンポーネントモデルへの移行

wasmCloud v1.8.0では、従来の「アクター（actor）」から「コンポーネント（component）」への移行が行われています。

### 主要なコマンド

#### プロジェクト作成
```bash
wash new component <PROJECT_NAME>
```

#### ビルド
```bash
wash build
```

#### デプロイ
```bash
wash start component <COMPONENT_WASM>
wash link <COMPONENT_ID> <PROVIDER_ID> <INTERFACE>
```

### コンポーネント開発の流れ

1. **プロジェクト作成**
   ```bash
   wash new component my-component
   ```

2. **WITインターフェース定義**
   - `wit/`ディレクトリにWITファイルを配置
   - インターフェースを定義

3. **Rust実装**
   - `src/lib.rs`にコンポーネントの実装を記述
   - `wit-bindgen`を使用してWITからコード生成

4. **ビルド**
   ```bash
   wash build
   ```
   - `wasm32-wasip1`ターゲットでビルド
   - 署名済みWASMファイルを生成

5. **デプロイ**
   ```bash
   wash start component build/my-component_s.wasm
   ```

### 重要なリソース

- **公式ドキュメント**: https://wasmcloud.com/docs/
- **GitHubリポジトリ**: https://github.com/wasmCloud/wasmCloud
- **ロードマップ**: https://wasmcloud.com/docs/roadmap/
- **Slackコミュニティ**: https://slack.wasmcloud.com/

### コンポーネント開発のベストプラクティス

1. **WITインターフェースの定義**
   - インターフェースを明確に定義
   - 既存のWITインターフェースを再利用

2. **HTTPサーバーコンポーネント**
   - `wasmcloud:http`インターフェースを使用
   - HTTPリクエスト/レスポンスを処理

3. **データベースアクセス**
   - `wasmcloud:keyvalue`や`wasmcloud:postgres`プロバイダーを使用
   - またはカスタムプロバイダーを実装

### 現在のプロジェクトへの適用

現在のプロジェクト（rag-openai, rag-pipeline等）をwasmCloudコンポーネントとして動作させるには：

1. **WITインターフェースの定義**
   - `schema/wasmcloud-interfaces.wit`を基にWITファイルを作成

2. **コンポーネント実装**
   - 既存のライブラリコードをラップ
   - wasmCloudコンポーネントとして実装

3. **HTTPサーバーコンポーネント**
   - HTTPエンドポイントを提供
   - 既存のライブラリコードを呼び出し

### 次のステップ

1. wasmCloudコンポーネントのテンプレートを確認
2. WITインターフェースを定義
3. コンポーネント実装を作成
4. ビルドとデプロイ

