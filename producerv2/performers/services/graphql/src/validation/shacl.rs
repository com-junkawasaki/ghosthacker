/**
 * SHACL Validation
 * Rust アプリケーションレベルでの SHACL バリデーション
 * 
 * @context {
 *   "@id": "ex:SHACLValidation",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:SHACLValidation"
 * }
 */

use anyhow::Result;
use async_graphql::Error;
use serde_json::Value;
use std::collections::HashMap;

/// SHACL バリデーション結果
#[derive(Debug, Clone)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub errors: Vec<ValidationError>,
}

/// SHACL バリデーションエラー
#[derive(Debug, Clone)]
pub struct ValidationError {
    pub path: String,
    pub message: String,
    pub severity: String, // "Violation", "Warning", "Info"
}

/// SHACL シェイプ定義（簡易実装）
#[derive(Debug, Clone)]
pub struct ShaclShape {
    pub target_class: String,
    pub properties: HashMap<String, PropertyShape>,
}

/// プロパティシェイプ定義
#[derive(Debug, Clone)]
pub struct PropertyShape {
    pub path: String,
    pub min_count: Option<usize>,
    pub max_count: Option<usize>,
    pub datatype: Option<String>,
    pub node_kind: Option<String>, // "IRI", "Literal", "BlankNode"
}

/// JSON-LD ドキュメントを SHACL シェイプでバリデーション
/// 
/// @context {
///   "@id": "ex:validateWithSHACL",
///   "@type": "ex:Activity",
///   "ex:consumes": ["ex:JSONLD", "ex:SHACLShape"],
///   "ex:produces": "ex:ValidationResult"
/// }
pub fn validate_with_shacl(document: &Value, shape: &ShaclShape) -> Result<ValidationResult> {
    let mut errors = Vec::new();

    // ドキュメントの型を確認
    let doc_type = document
        .get("@type")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if doc_type != shape.target_class {
        errors.push(ValidationError {
            path: "@type".to_string(),
            message: format!(
                "Expected type '{}', but got '{}'",
                shape.target_class, doc_type
            ),
            severity: "Violation".to_string(),
        });
    }

    // 各プロパティをバリデーション
    for (prop_path, prop_shape) in &shape.properties {
        let value = get_property_value(document, prop_path);

        // minCount チェック
        if let Some(min) = prop_shape.min_count {
            let count = match value {
                Some(Value::Array(arr)) => arr.len(),
                Some(_) => 1,
                None => 0,
            };
            if count < min {
                errors.push(ValidationError {
                    path: prop_path.clone(),
                    message: format!(
                        "Property '{}' must have at least {} value(s), but has {}",
                        prop_path, min, count
                    ),
                    severity: "Violation".to_string(),
                });
            }
        }

        // maxCount チェック
        if let Some(max) = prop_shape.max_count {
            let count = match value {
                Some(Value::Array(arr)) => arr.len(),
                Some(_) => 1,
                None => 0,
            };
            if count > max {
                errors.push(ValidationError {
                    path: prop_path.clone(),
                    message: format!(
                        "Property '{}' must have at most {} value(s), but has {}",
                        prop_path, max, count
                    ),
                    severity: "Violation".to_string(),
                });
            }
        }

        // datatype チェック（簡易実装）
        if let Some(datatype) = &prop_shape.datatype {
            if let Some(val) = value {
                if !check_datatype(&val, datatype) {
                    errors.push(ValidationError {
                        path: prop_path.clone(),
                        message: format!(
                            "Property '{}' must be of type '{}'",
                            prop_path, datatype
                        ),
                        severity: "Violation".to_string(),
                    });
                }
            }
        }

        // nodeKind チェック
        if let Some(node_kind) = &prop_shape.node_kind {
            if let Some(val) = value {
                if !check_node_kind(&val, node_kind) {
                    errors.push(ValidationError {
                        path: prop_path.clone(),
                        message: format!(
                            "Property '{}' must be a '{}'",
                            prop_path, node_kind
                        ),
                        severity: "Violation".to_string(),
                    });
                }
            }
        }
    }

    Ok(ValidationResult {
        is_valid: errors.is_empty(),
        errors,
    })
}

/// プロパティ値を取得（簡易実装）
fn get_property_value<'a>(document: &'a Value, path: &str) -> Option<&'a Value> {
    // まず完全なパス（ex:name）で検索
    if let Some(value) = document.get(path) {
        return Some(value);
    }
    
    // 見つからなければ、プレフィックスを削除したキー（name）で検索
    let key = path
        .strip_prefix("ex:")
        .or_else(|| path.strip_prefix("dct:"))
        .unwrap_or(path);

    document.get(key)
}

/// データ型をチェック（簡易実装）
fn check_datatype(value: &Value, datatype: &str) -> bool {
    match datatype {
        "http://www.w3.org/2001/XMLSchema#string" | "xsd:string" => value.is_string(),
        "http://www.w3.org/2001/XMLSchema#integer" | "xsd:integer" => value.is_number(),
        "http://www.w3.org/2001/XMLSchema#boolean" | "xsd:boolean" => value.is_boolean(),
        "http://www.w3.org/2001/XMLSchema#dateTime" | "xsd:dateTime" => {
            value.is_string() // 簡易実装：文字列としてチェック
        }
        _ => true, // 未知の型は許可
    }
}

/// ノード種別をチェック
fn check_node_kind(value: &Value, node_kind: &str) -> bool {
    match node_kind {
        "IRI" => {
            // オブジェクトで @id を持つ
            value.as_object().and_then(|o| o.get("@id")).is_some()
        }
        "Literal" => {
            // リテラル値（文字列、数値、ブール値）
            value.is_string() || value.is_number() || value.is_boolean()
        }
        "BlankNode" => {
            // 空白ノード（簡易実装：オブジェクトで @id が空白ノード形式）
            value
                .as_object()
                .and_then(|o| o.get("@id"))
                .and_then(|v| v.as_str())
                .map(|s| s.starts_with("_:"))
                .unwrap_or(false)
        }
        _ => true, // 未知の種別は許可
    }
}

/// SHACL シェイプを JSON から読み込み
/// 
/// @context {
///   "@id": "ex:loadSHACLShape",
///   "@type": "ex:Activity",
///   "ex:consumes": "ex:JSON",
///   "ex:produces": "ex:SHACLShape"
/// }
pub fn load_shacl_shape(json: &Value) -> Result<ShaclShape> {
    let target_class = json
        .get("targetClass")
        .and_then(|v| v.as_str())
        .ok_or_else(|| anyhow::anyhow!("SHACL shape must have targetClass"))?
        .to_string();

    let mut properties = HashMap::new();

    if let Some(props) = json.get("properties").and_then(|v| v.as_object()) {
        for (prop_path, prop_def) in props {
            let mut prop_shape = PropertyShape {
                path: prop_path.clone(),
                min_count: None,
                max_count: None,
                datatype: None,
                node_kind: None,
            };

            if let Some(min) = prop_def.get("minCount").and_then(|v| v.as_u64()) {
                prop_shape.min_count = Some(min as usize);
            }

            if let Some(max) = prop_def.get("maxCount").and_then(|v| v.as_u64()) {
                prop_shape.max_count = Some(max as usize);
            }

            if let Some(dt) = prop_def.get("datatype").and_then(|v| v.as_str()) {
                prop_shape.datatype = Some(dt.to_string());
            }

            if let Some(nk) = prop_def.get("nodeKind").and_then(|v| v.as_str()) {
                prop_shape.node_kind = Some(nk.to_string());
            }

            properties.insert(prop_path.clone(), prop_shape);
        }
    }

    Ok(ShaclShape {
        target_class,
        properties,
    })
}

/// バリデーション結果を GraphQL エラーに変換
pub fn validation_result_to_graphql_error(result: &ValidationResult) -> Error {
    if result.is_valid {
        return Error::new("Validation passed");
    }

    let messages: Vec<String> = result
        .errors
        .iter()
        .map(|e| format!("{}: {}", e.path, e.message))
        .collect();

    Error::new(format!("SHACL validation failed: {}", messages.join("; ")))
}

/// デフォルトの SHACL シェイプを取得（型ごと）
pub fn get_default_shape_for_type(r#type: &str) -> Option<ShaclShape> {
    match r#type {
        "ex:Story" => Some(ShaclShape {
            target_class: "ex:Story".to_string(),
            properties: {
                let mut props = HashMap::new();
                props.insert(
                    "ex:title".to_string(),
                    PropertyShape {
                        path: "ex:title".to_string(),
                        min_count: Some(1),
                        max_count: Some(1),
                        datatype: Some("xsd:string".to_string()),
                        node_kind: None,
                    },
                );
                props.insert(
                    "ex:content".to_string(),
                    PropertyShape {
                        path: "ex:content".to_string(),
                        min_count: Some(1),
                        max_count: Some(1),
                        datatype: Some("xsd:string".to_string()),
                        node_kind: None,
                    },
                );
                props
            },
        }),
        "ex:Script" => Some(ShaclShape {
            target_class: "ex:Script".to_string(),
            properties: {
                let mut props = HashMap::new();
                props.insert(
                    "ex:scriptText".to_string(),
                    PropertyShape {
                        path: "ex:scriptText".to_string(),
                        min_count: Some(1),
                        max_count: Some(1),
                        datatype: Some("xsd:string".to_string()),
                        node_kind: None,
                    },
                );
                props.insert(
                    "ex:derivedFromStory".to_string(),
                    PropertyShape {
                        path: "ex:derivedFromStory".to_string(),
                        min_count: Some(1),
                        max_count: Some(1),
                        datatype: None,
                        node_kind: Some("IRI".to_string()),
                    },
                );
                props.insert(
                    "ex:status".to_string(),
                    PropertyShape {
                        path: "ex:status".to_string(),
                        min_count: Some(1),
                        max_count: Some(1),
                        datatype: Some("xsd:string".to_string()),
                        node_kind: None,
                    },
                );
                props
            },
        }),
        "ex:Project" => Some(ShaclShape {
            target_class: "ex:Project".to_string(),
            properties: {
                let mut props = HashMap::new();
                props.insert(
                    "ex:name".to_string(),
                    PropertyShape {
                        path: "ex:name".to_string(),
                        min_count: Some(1),
                        max_count: Some(1),
                        datatype: Some("xsd:string".to_string()),
                        node_kind: None,
                    },
                );
                props
            },
        }),
        _ => None,
    }
}

