/**
 * Test Common Utilities
 * テスト共通ユーティリティ
 */

use producerv2_graphql::database::client::initialize;

/// テスト用データベースを初期化（一度だけ実行）
pub async fn setup_test_database() {
    if std::env::var("DATABASE_URL").is_err() {
        std::env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:5434/postgres");
    }
    
    // initialize() は OnceLock なので、エラーを無視（既に初期化済みの場合）
    let _ = initialize().await;
}

