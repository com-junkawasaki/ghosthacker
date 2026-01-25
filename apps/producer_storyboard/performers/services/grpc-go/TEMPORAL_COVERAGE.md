# Temporal移行カバレッジレポート

## 概要
このドキュメントは、GoバックエンドのTemporalへの移行状況を記録します。

## ✅ Temporal化済み（5/14 = 35.7%）

### 1. 画像生成
- ✅ **GenerateImage** (StoryboardService)
  - ワークフロー: `ImageGenerationWorkflow`
  - プロバイダー: OpenAI, Higgsfield
  - 状態: 完全実装済み

- ✅ **GenerateCharacterImage** (StoryboardService)
  - ワークフロー: `CharacterImageGenerationWorkflow`
  - プロバイダー: Higgsfield Soul ID
  - 状態: 完全実装済み

### 2. ワークフロー管理
- ✅ **StartApprovalWorkflow** (StoryboardService)
  - ワークフロー: `ApprovalWorkflow`
  - 状態: 完全実装済み

- ✅ **StartProductionWorkflow** (StoryboardService)
  - ワークフロー: `ProductionWorkflow`
  - 状態: 完全実装済み

- ✅ **StartTaskWorkflow** (StoryboardService)
  - ワークフロー: `TaskWorkflow`
  - 状態: 完全実装済み

## ⚠️ Temporal化未対応（9/14 = 64.3%）

### 1. 動画生成
- ❌ **GenerateVideo** (StoryboardService)
  - 現在: 同期実行（Runway API直接呼び出し）
  - 問題点: 
    - 長時間実行の可能性（数分〜数十分）
    - ポーリングが必要
    - エラーハンドリングが不完全
  - 推奨: `VideoGenerationWorkflow`を使用（既に実装済み）

- ❌ **GetVideoTaskStatus** (StoryboardService)
  - 現在: 同期実行（Runway API直接ポーリング）
  - 問題点: ポーリングロジックがサービス層に散在
  - 推奨: ワークフロー内でポーリング

### 2. 音声生成
- ❌ **GenerateSunoMusic** (StoryboardService)
  - 現在: 同期実行（Suno API直接呼び出し）
  - 問題点: 
    - 長時間実行の可能性
    - タスクステータスのポーリングが必要
  - 推奨: `VideoGenerationWorkflow`（Suno対応）を使用

- ❌ **GenerateDialogueAudio** (StoryboardService)
  - 現在: 同期実行（Hume API直接呼び出し）
  - 問題点: 長時間実行の可能性
  - 推奨: 新しいワークフロー作成

### 3. 画像生成（他のサービス）
- ❌ **GenerateImage** (NovelService)
  - 現在: 同期実行（OpenAI API直接呼び出し）
  - 問題点: StoryboardServiceと重複実装
  - 推奨: `ImageGenerationWorkflow`を再利用

- ❌ **GeneratePanelImage** (MangaService)
  - 現在: 同期実行（OpenAI API直接呼び出し、ループ処理）
  - 問題点: 
    - 複数画像生成時のエラーハンドリングが不完全
    - 長時間実行の可能性
  - 推奨: `ImageGenerationWorkflow`をバッチ実行

### 4. AI生成
- ❌ **GenerateStory** (MangaService)
  - 現在: 未実装（TODO）
  - 推奨: 新しいワークフロー作成

- ❌ **AnalyzeEmotions** (NovelService)
  - 現在: 同期実行（Hume API直接呼び出し）
  - 問題点: 長時間実行の可能性
  - 推奨: 新しいワークフロー作成

### 5. ファイル処理
- ❌ **ExportEpub** (NovelService)
  - 現在: 未実装（TODO）
  - 推奨: 新しいワークフロー作成

- ❌ **ImportEpub** (NovelService)
  - 現在: 未実装（TODO）
  - 推奨: 新しいワークフロー作成

## 📊 カバレッジ統計

| カテゴリ | Temporal化済み | 未対応 | 合計 | カバレッジ |
|---------|--------------|--------|------|----------|
| 画像生成 | 2 | 2 | 4 | 50% |
| 動画生成 | 0 | 2 | 2 | 0% |
| 音声生成 | 0 | 2 | 2 | 0% |
| ワークフロー管理 | 3 | 0 | 3 | 100% |
| AI生成 | 0 | 2 | 2 | 0% |
| ファイル処理 | 0 | 2 | 2 | 0% |
| **合計** | **5** | **10** | **15** | **33.3%** |

## 🎯 優先度別推奨事項

### 高優先度（長時間実行・エラー処理が重要）
1. **GenerateVideo** → `VideoGenerationWorkflow`を使用（既に実装済み）
2. **GenerateSunoMusic** → `VideoGenerationWorkflow`（Suno対応）を使用
3. **GenerateDialogueAudio** → 新しいワークフロー作成

### 中優先度（重複実装の統合）
4. **GenerateImage** (NovelService) → `ImageGenerationWorkflow`を再利用
5. **GeneratePanelImage** (MangaService) → `ImageGenerationWorkflow`をバッチ実行

### 低優先度（未実装機能）
6. **GenerateStory** → 新しいワークフロー作成
7. **AnalyzeEmotions** → 新しいワークフロー作成
8. **ExportEpub/ImportEpub** → 新しいワークフロー作成

## 📝 実装済みワークフロー一覧

### 画像生成
- `ImageGenerationWorkflow` - OpenAI/Higgsfield画像生成
- `CharacterImageGenerationWorkflow` - Higgsfield Soul IDキャラクター画像生成

### 動画生成
- `VideoGenerationWorkflow` - Runway/Suno動画生成（実装済みだが未使用）

### ワークフロー管理
- `ApprovalWorkflow` - 承認プロセス管理
- `ProductionWorkflow` - エピソード制作プロセス管理
- `TaskWorkflow` - タスク管理

## 🔧 実装済みアクティビティ一覧

### 画像生成
- `GenerateImageActivity` - OpenAI/Higgsfield画像生成
- `SaveGeneratedImageActivity` - 画像DB保存
- `GetCharacterReferenceImagesActivity` - キャラクター参照画像取得
- `GenerateCharacterImageActivity` - Higgsfield Soul ID画像生成

### 動画生成
- `GenerateVideoRunwayActivity` - Runway動画生成
- `GenerateVideoSunoActivity` - Suno動画生成
- `SaveGeneratedVideoActivity` - 動画DB保存

### ワークフロー管理
- `NotifyUser` - ユーザー通知
- `NotifyRole` - ロール通知
- `UpdateApprovalStatus` - 承認ステータス更新
- `UpdateProductionStatus` - 制作ステータス更新
- `UpdateTaskStatus` - タスクステータス更新
- `CheckPermission` - 権限チェック
- `GetReviewersByType` - レビュアー取得

## 🚀 次のステップ

1. **GenerateVideo**を`VideoGenerationWorkflow`経由に変更
2. **GenerateSunoMusic**を`VideoGenerationWorkflow`経由に変更
3. **GenerateDialogueAudio**用のワークフローとアクティビティを作成
4. NovelService/MangaServiceの画像生成を`ImageGenerationWorkflow`に統合
5. 未実装機能用のワークフローを段階的に実装
