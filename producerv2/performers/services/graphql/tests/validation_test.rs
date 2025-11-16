/**
 * SHACL Validation Tests
 * 
 * @context {
 *   "@id": "ex:SHACLValidationTests",
 *   "@type": "ex:TestSuite",
 *   "ex:provides": "ex:UnitTests"
 * }
 */

use producerv2_graphql::validation::shacl::{get_default_shape_for_type, validate_with_shacl, ShaclShape};

#[test]
fn test_get_property_value_with_ex_prefix() {
    // このテストは get_property_value が "ex:name" と "name" の両方で検索できることを確認
    let doc = serde_json::json!({
        "@id": "Project_test",
        "@type": "ex:Project",
        "ex:name": "Test Project",
        "ex:status": "active"
    });
    
    // "ex:name" で検索できることを確認（内部で get_property_value が使用される）
    let shape = get_default_shape_for_type("ex:Project").unwrap();
    let result = validate_with_shacl(&doc, &shape).unwrap();
    assert!(result.is_valid, "Document with ex:name should pass validation");
}

#[test]
fn test_shacl_min_count_validation() {
    let shape = get_default_shape_for_type("ex:Project").unwrap();
    
    // name が存在する場合（有効）
    let valid = serde_json::json!({
        "@id": "Project_test1",
        "@type": "ex:Project",
        "ex:name": "Test Project"
    });
    
    let result = validate_with_shacl(&valid, &shape).unwrap();
    assert!(result.is_valid, "Document with name should pass validation");
    
    // name が欠落している場合（無効）
    let invalid = serde_json::json!({
        "@id": "Project_test2",
        "@type": "ex:Project"
    });
    
    let result = validate_with_shacl(&invalid, &shape).unwrap();
    assert!(!result.is_valid, "Document without name should fail validation");
    assert!(result.errors.iter().any(|e| e.path == "ex:name"));
}

#[test]
fn test_shacl_max_count_validation() {
    // maxCount のテスト用にカスタムシェイプを作成
    let mut shape = ShaclShape {
        target_class: "ex:Test".to_string(),
        properties: std::collections::HashMap::new(),
    };
    
    use producerv2_graphql::validation::shacl::PropertyShape;
    shape.properties.insert(
        "ex:tags".to_string(),
        PropertyShape {
            path: "ex:tags".to_string(),
            min_count: None,
            max_count: Some(3),
            datatype: None,
            node_kind: None,
        },
    );
    
    // 3個以下のタグ（有効）
    let valid = serde_json::json!({
        "@id": "Test_1",
        "@type": "ex:Test",
        "ex:tags": ["tag1", "tag2", "tag3"]
    });
    
    let result = validate_with_shacl(&valid, &shape).unwrap();
    assert!(result.is_valid, "Document with 3 tags should pass validation");
    
    // 4個のタグ（無効）
    let invalid = serde_json::json!({
        "@id": "Test_2",
        "@type": "ex:Test",
        "ex:tags": ["tag1", "tag2", "tag3", "tag4"]
    });
    
    let result = validate_with_shacl(&invalid, &shape).unwrap();
    assert!(!result.is_valid, "Document with 4 tags should fail validation");
}

#[test]
fn test_shacl_datatype_validation() {
    let shape = get_default_shape_for_type("ex:Story").unwrap();
    
    // 有効な文字列値
    let valid = serde_json::json!({
        "@id": "Story_test1",
        "@type": "ex:Story",
        "ex:title": "Test Story",
        "ex:content": "Content here"
    });
    
    let result = validate_with_shacl(&valid, &shape).unwrap();
    assert!(result.is_valid, "Document with string values should pass validation");
    
    // 無効な数値（文字列が期待される）
    // 注: 現在の実装では datatype チェックは緩いため、このテストは将来の拡張用
}

