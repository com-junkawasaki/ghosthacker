/**
 * GraphQL API Tests
 * GraphQL Query と Mutation の統合テスト
 * 
 * @context {
 *   "@id": "ex:GraphQLAPITests",
 *   "@type": "ex:TestSuite",
 *   "ex:provides": "ex:IntegrationTests"
 * }
 */

use producerv2_graphql::database::client::initialize;
use producerv2_graphql::database::schema::{insert_document_typed, get_document_typed, Project, Story};
use producerv2_graphql::validation::shacl::{get_default_shape_for_type, validate_with_shacl};

#[tokio::test]
async fn test_create_project_mutation() {
    std::env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:5434/postgres");
    initialize().await.unwrap();
    
    let project = Project {
        id: "Project_graphql_test".to_string(),
        r#type: "ex:Project".to_string(),
        name: "GraphQL Test Project".to_string(),
        author: Some("test-author".to_string()),
        description: Some("Test description".to_string()),
        status: Some("active".to_string()),
        created_at: Some("2025-01-01T00:00:00Z".to_string()),
        updated_at: Some("2025-01-01T00:00:00Z".to_string()),
    };
    
    // SHACL バリデーション
    let doc = project.to_jsonld();
    let shape = get_default_shape_for_type("ex:Project").unwrap();
    let validation_result = validate_with_shacl(&doc, &shape).unwrap();
    assert!(validation_result.is_valid, "Project should pass SHACL validation");
    
    // データベースに挿入
    let insert_result = insert_document_typed(&project).await;
    assert!(insert_result.is_ok(), "Project insertion should succeed");
    
    // 取得して確認
    let retrieved = get_document_typed::<Project>("Project_graphql_test").await;
    assert!(retrieved.is_ok(), "Project retrieval should succeed");
    let retrieved_project = retrieved.unwrap();
    assert_eq!(retrieved_project.name, "GraphQL Test Project");
    
    // クリーンアップ
    producerv2_graphql::database::client::delete_document("Project_graphql_test").await.unwrap();
}

#[tokio::test]
async fn test_create_story_mutation() {
    std::env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:5434/postgres");
    initialize().await.unwrap();
    
    let story = Story {
        id: "Story_graphql_test".to_string(),
        r#type: "ex:Story".to_string(),
        title: "GraphQL Test Story".to_string(),
        content: "Test story content".to_string(),
        created_at: Some("2025-01-01T00:00:00Z".to_string()),
        updated_at: Some("2025-01-01T00:00:00Z".to_string()),
    };
    
    // SHACL バリデーション
    let doc = story.to_jsonld();
    let shape = get_default_shape_for_type("ex:Story").unwrap();
    let validation_result = validate_with_shacl(&doc, &shape).unwrap();
    assert!(validation_result.is_valid, "Story should pass SHACL validation");
    
    // データベースに挿入
    let insert_result = insert_document_typed(&story).await;
    assert!(insert_result.is_ok(), "Story insertion should succeed");
    
    // 取得して確認
    let retrieved = get_document_typed::<Story>("Story_graphql_test").await;
    assert!(retrieved.is_ok(), "Story retrieval should succeed");
    let retrieved_story = retrieved.unwrap();
    assert_eq!(retrieved_story.title, "GraphQL Test Story");
    assert_eq!(retrieved_story.content, "Test story content");
    
    // クリーンアップ
    producerv2_graphql::database::client::delete_document("Story_graphql_test").await.unwrap();
}

#[tokio::test]
async fn test_query_all_projects() {
    std::env::set_var("DATABASE_URL", "postgresql://postgres:postgres@localhost:5434/postgres");
    initialize().await.unwrap();
    
    // テスト用プロジェクトを作成
    let project1 = Project {
        id: "Project_query_test_1".to_string(),
        r#type: "ex:Project".to_string(),
        name: "Query Test 1".to_string(),
        author: None,
        description: None,
        status: Some("active".to_string()),
        created_at: Some("2025-01-01T00:00:00Z".to_string()),
        updated_at: Some("2025-01-01T00:00:00Z".to_string()),
    };
    
    let project2 = Project {
        id: "Project_query_test_2".to_string(),
        r#type: "ex:Project".to_string(),
        name: "Query Test 2".to_string(),
        author: None,
        description: None,
        status: Some("active".to_string()),
        created_at: Some("2025-01-01T00:00:00Z".to_string()),
        updated_at: Some("2025-01-01T00:00:00Z".to_string()),
    };
    
    insert_document_typed(&project1).await.unwrap();
    insert_document_typed(&project2).await.unwrap();
    
    // すべてのプロジェクトを取得
    let all_projects = producerv2_graphql::database::client::get_all_resources(Some("ex:Project")).await.unwrap();
    assert!(all_projects.len() >= 2, "Should retrieve at least 2 projects");
    assert!(all_projects.contains(&"Project_query_test_1".to_string()));
    assert!(all_projects.contains(&"Project_query_test_2".to_string()));
    
    // クリーンアップ
    producerv2_graphql::database::client::delete_document("Project_query_test_1").await.unwrap();
    producerv2_graphql::database::client::delete_document("Project_query_test_2").await.unwrap();
}

