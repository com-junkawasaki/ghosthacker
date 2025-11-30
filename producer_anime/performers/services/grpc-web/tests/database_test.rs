/**
 * Database Client Tests
 * 
 * @context {
 *   "@id": "ex:DatabaseClientTests",
 *   "@type": "ex:TestSuite",
 *   "ex:provides": "ex:UnitTests"
 * }
 */

use producerv2_grpc_web::database::client::{get_document, insert_document, delete_document};
use producerv2_grpc_web::database::schema::{get_document_typed, insert_document_typed, Project};

mod common;
use common::setup_test_database;

#[tokio::test]
async fn test_insert_and_get_document() {
    // テスト用データベース初期化
    setup_test_database().await;
    
    // テスト用の Project ドキュメントを作成
    let project_doc = serde_json::json!({
        "@id": "Project_test_insert",
        "@type": "ex:Project",
        "ex:name": "Test Insert Project",
        "ex:status": "active",
        "ex:createdAt": "2025-01-01T00:00:00Z",
        "ex:updatedAt": "2025-01-01T00:00:00Z"
    });
    
    // ドキュメントを挿入
    let insert_result = insert_document(&project_doc).await;
    assert!(insert_result.is_ok(), "Document insertion should succeed");
    
    // ドキュメントを取得
    let retrieved = get_document("Project_test_insert").await;
    assert!(retrieved.is_ok(), "Document retrieval should succeed");
    
    let doc = retrieved.unwrap();
    assert_eq!(doc.get("@id").and_then(|v| v.as_str()), Some("Project_test_insert"));
    assert_eq!(doc.get("ex:name").and_then(|v| v.as_str()), Some("Test Insert Project"));
    
    // クリーンアップ
    delete_document("Project_test_insert").await.unwrap();
}

#[tokio::test]
async fn test_insert_and_get_typed_document() {
    setup_test_database().await;
    
    let project = Project {
        id: "Project_test_typed".to_string(),
        r#type: "ex:Project".to_string(),
        name: "Test Typed Project".to_string(),
        author: Some("test-author".to_string()),
        description: Some("Test description".to_string()),
        status: Some("active".to_string()),
        created_at: Some("2025-01-01T00:00:00Z".to_string()),
        updated_at: Some("2025-01-01T00:00:00Z".to_string()),
    };
    
    // 型安全な挿入
    let insert_result = insert_document_typed(&project).await;
    assert!(insert_result.is_ok(), "Typed document insertion should succeed");
    
    // 型安全な取得
    let retrieved = get_document_typed::<Project>("Project_test_typed").await;
    assert!(retrieved.is_ok(), "Typed document retrieval should succeed");
    
    let retrieved_project = retrieved.unwrap();
    assert_eq!(retrieved_project.id, "Project_test_typed");
    assert_eq!(retrieved_project.name, "Test Typed Project");
    
    // クリーンアップ
    delete_document("Project_test_typed").await.unwrap();
}

#[tokio::test]
async fn test_delete_document() {
    setup_test_database().await;
    
    // まずドキュメントを作成
    let project_doc = serde_json::json!({
        "@id": "Project_test_delete",
        "@type": "ex:Project",
        "ex:name": "Test Delete Project"
    });
    
    insert_document(&project_doc).await.unwrap();
    
    // ドキュメントが存在することを確認
    let retrieved = get_document("Project_test_delete").await;
    assert!(retrieved.is_ok(), "Document should exist before deletion");
    
    // ドキュメントを削除
    let delete_result = delete_document("Project_test_delete").await;
    assert!(delete_result.is_ok(), "Document deletion should succeed");
    
    // ドキュメントが存在しないことを確認
    let retrieved_after = get_document("Project_test_delete").await;
    assert!(retrieved_after.is_err(), "Document should not exist after deletion");
}

