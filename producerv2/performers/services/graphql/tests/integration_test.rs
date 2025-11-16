/**
 * GraphQL Integration Tests
 * 
 * @context {
 *   "@id": "ex:GraphQLIntegrationTests",
 *   "@type": "ex:TestSuite",
 *   "ex:provides": "ex:IntegrationTests"
 * }
 */

use producerv2_graphql::database::client::initialize;
use producerv2_graphql::database::schema::{Project, ToJsonLd};
use producerv2_graphql::validation::shacl::{get_default_shape_for_type, validate_with_shacl};

#[tokio::test]
async fn test_database_initialization() {
    // テスト用データベース URL（環境変数から取得、デフォルトはテスト用）
    std::env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:5434/postgres");
    
    let result = initialize().await;
    assert!(result.is_ok(), "Database initialization should succeed");
}

#[tokio::test]
async fn test_project_shacl_validation() {
    // Project の SHACL シェイプを取得
    let shape = get_default_shape_for_type("ex:Project").expect("Project shape should exist");
    
    // 有効な Project ドキュメント
    let valid_project = serde_json::json!({
        "@id": "Project_test123",
        "@type": "ex:Project",
        "ex:name": "Test Project",
        "ex:status": "active",
        "ex:createdAt": "2025-01-01T00:00:00Z",
        "ex:updatedAt": "2025-01-01T00:00:00Z"
    });
    
    let result = validate_with_shacl(&valid_project, &shape).unwrap();
    assert!(result.is_valid, "Valid project should pass SHACL validation");
    assert!(result.errors.is_empty());
    
    // 無効な Project ドキュメント（name が欠落）
    let invalid_project = serde_json::json!({
        "@id": "Project_test456",
        "@type": "ex:Project",
        "ex:status": "active"
    });
    
    let result = validate_with_shacl(&invalid_project, &shape).unwrap();
    assert!(!result.is_valid, "Invalid project should fail SHACL validation");
    assert!(!result.errors.is_empty());
}

#[tokio::test]
async fn test_story_shacl_validation() {
    let shape = get_default_shape_for_type("ex:Story").expect("Story shape should exist");
    
    // 有効な Story ドキュメント
    let valid_story = serde_json::json!({
        "@id": "Story_test123",
        "@type": "ex:Story",
        "ex:title": "Test Story",
        "ex:content": "Story content here",
        "ex:createdAt": "2025-01-01T00:00:00Z",
        "ex:updatedAt": "2025-01-01T00:00:00Z"
    });
    
    let result = validate_with_shacl(&valid_story, &shape).unwrap();
    assert!(result.is_valid, "Valid story should pass SHACL validation");
    
    // 無効な Story ドキュメント（title が欠落）
    let invalid_story = serde_json::json!({
        "@id": "Story_test456",
        "@type": "ex:Story",
        "ex:content": "Story content here"
    });
    
    let result = validate_with_shacl(&invalid_story, &shape).unwrap();
    assert!(!result.is_valid, "Invalid story should fail SHACL validation");
}

#[tokio::test]
async fn test_project_to_jsonld() {
    let project = Project {
        id: "Project_test789".to_string(),
        r#type: "ex:Project".to_string(),
        name: "Test Project".to_string(),
        author: Some("test-author".to_string()),
        description: Some("Test description".to_string()),
        status: Some("active".to_string()),
        created_at: Some("2025-01-01T00:00:00Z".to_string()),
        updated_at: Some("2025-01-01T00:00:00Z".to_string()),
    };
    
    let jsonld = project.to_jsonld();
    
    // JSON-LD の構造を確認
    assert_eq!(jsonld.get("@id").and_then(|v| v.as_str()), Some("Project_test789"));
    assert_eq!(jsonld.get("@type").and_then(|v| v.as_str()), Some("ex:Project"));
    assert_eq!(jsonld.get("ex:name").and_then(|v| v.as_str()), Some("Test Project"));
}

