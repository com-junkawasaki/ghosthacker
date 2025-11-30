/**
 * JSON-LD Processor
 * JSON-LDのパース・検証・変換
 * 
 * @context {
 *   "@id": "ex:JsonLdProcessor",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:JsonLdProcessing"
 * }
 */

use serde_json::Value;

/// JSON-LD処理エラー
#[derive(Debug, thiserror::Error)]
pub enum JsonLdError {
    #[error("Invalid JSON-LD: {0}")]
    InvalidJsonLd(String),
    #[error("Missing @context")]
    MissingContext,
    #[error("Parse error: {0}")]
    ParseError(String),
    #[error("JSON error: {0}")]
    JsonError(#[from] serde_json::Error),
}

/// JSON-LDプロセッサ
pub struct JsonLdProcessor;

impl JsonLdProcessor {
    /// JSON-LDを検証
    pub fn validate(jsonld: &Value) -> Result<(), JsonLdError> {
        if !jsonld.is_object() {
            return Err(JsonLdError::InvalidJsonLd("Root must be an object".to_string()));
        }

        // @contextの存在確認（embedded形式でもOK）
        if !jsonld.get("@context").is_some() && !jsonld.get("@graph").is_some() {
            // @graph内の要素に@contextがあるか確認
            if let Some(graph) = jsonld.get("@graph").and_then(|g| g.as_array()) {
                let has_context = graph.iter().any(|item| {
                    item.as_object()
                        .and_then(|obj| obj.get("@context"))
                        .is_some()
                });
                if !has_context {
                    return Err(JsonLdError::MissingContext);
                }
            } else {
                return Err(JsonLdError::MissingContext);
            }
        }

        Ok(())
    }

    /// JSON-LDを正規化（展開形式）
    pub fn expand(jsonld: &Value) -> Result<Value, JsonLdError> {
        // 簡易的な展開実装
        // 実際の実装ではjson-ldクレートを使用することを推奨
        let mut expanded = jsonld.clone();
        
        // @contextを展開
        if let Some(context) = jsonld.get("@context") {
            let context_clone = context.clone();
            Self::expand_context(&mut expanded, &context_clone)?;
        }

        Ok(expanded)
    }

    /// JSON-LDをコンパクト化（context=embedded形式）
    pub fn compact(jsonld: &Value, context: &Value) -> Result<Value, JsonLdError> {
        let mut compacted = jsonld.clone();
        
        // @contextを埋め込む
        if let Some(obj) = compacted.as_object_mut() {
            obj.insert("@context".to_string(), context.clone());
        }

        Ok(compacted)
    }

    /// @contextを展開
    fn expand_context(_value: &mut Value, _context: &Value) -> Result<(), JsonLdError> {
        // 簡易的な展開（実際の実装ではより完全な処理が必要）
        // 現在は簡略化された実装
        Ok(())
    }

    /// 用語を展開
    fn expand_term(_term: &str, definition: &Value) -> Option<String> {
        if let Some(iri) = definition.as_str() {
            Some(iri.to_string())
        } else if let Some(obj) = definition.as_object() {
            if let Some(id) = obj.get("@id") {
                id.as_str().map(|s| s.to_string())
            } else {
                None
            }
        } else {
            None
        }
    }

    /// JSON-LDからRDFトリプルを抽出
    pub fn to_triples(jsonld: &Value) -> Result<Vec<RdfTriple>, JsonLdError> {
        let mut triples = Vec::new();
        
        // @graphがある場合は各要素を処理
        if let Some(graph) = jsonld.get("@graph").and_then(|g| g.as_array()) {
            for item in graph {
                Self::extract_triples_from_node(item, &mut triples)?;
            }
        } else {
            Self::extract_triples_from_node(jsonld, &mut triples)?;
        }

        Ok(triples)
    }

    /// ノードからトリプルを抽出
    fn extract_triples_from_node(
        node: &Value,
        triples: &mut Vec<RdfTriple>,
    ) -> Result<(), JsonLdError> {
        let obj = node.as_object().ok_or_else(|| {
            JsonLdError::InvalidJsonLd("Node must be an object".to_string())
        })?;

        let subject = obj
            .get("@id")
            .and_then(|v| v.as_str())
            .ok_or_else(|| JsonLdError::InvalidJsonLd("Missing @id".to_string()))?
            .to_string();

        // @typeからトリプルを生成
        if let Some(types) = obj.get("@type") {
            if let Some(type_array) = types.as_array() {
                for t in type_array {
                    if let Some(type_str) = t.as_str() {
                        triples.push(RdfTriple {
                            subject: subject.clone(),
                            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                            object: type_str.to_string(),
                            object_type: "uri".to_string(),
                        });
                    }
                }
            } else if let Some(type_str) = types.as_str() {
                triples.push(RdfTriple {
                    subject: subject.clone(),
                    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type".to_string(),
                    object: type_str.to_string(),
                    object_type: "uri".to_string(),
                });
            }
        }

        // その他のプロパティからトリプルを生成
        for (key, value) in obj.iter() {
            if key.starts_with('@') {
                continue; // @id, @type, @contextはスキップ
            }

            let predicate = Self::expand_predicate(key, node)?;
            
            if let Some(array) = value.as_array() {
                for item in array {
                    Self::extract_object_triple(&subject, &predicate, item, triples)?;
                }
            } else {
                Self::extract_object_triple(&subject, &predicate, value, triples)?;
            }
        }

        Ok(())
    }

    /// オブジェクトのトリプルを抽出
    fn extract_object_triple(
        subject: &str,
        predicate: &str,
        value: &Value,
        triples: &mut Vec<RdfTriple>,
    ) -> Result<(), JsonLdError> {
        if let Some(obj) = value.as_object() {
            if let Some(id) = obj.get("@id") {
                if let Some(id_str) = id.as_str() {
                    triples.push(RdfTriple {
                        subject: subject.to_string(),
                        predicate: predicate.to_string(),
                        object: id_str.to_string(),
                        object_type: "uri".to_string(),
                    });
                }
            } else {
                // リテラル値として扱う
                let literal = serde_json::to_string(value)?;
                triples.push(RdfTriple {
                    subject: subject.to_string(),
                    predicate: predicate.to_string(),
                    object: literal,
                    object_type: "literal".to_string(),
                });
            }
        } else if let Some(str_val) = value.as_str() {
            triples.push(RdfTriple {
                subject: subject.to_string(),
                predicate: predicate.to_string(),
                object: str_val.to_string(),
                object_type: "literal".to_string(),
            });
        } else {
            let literal = serde_json::to_string(value)?;
            triples.push(RdfTriple {
                subject: subject.to_string(),
                predicate: predicate.to_string(),
                object: literal,
                object_type: "literal".to_string(),
            });
        }

        Ok(())
    }

    /// 述語を展開
    fn expand_predicate(key: &str, node: &Value) -> Result<String, JsonLdError> {
        // @contextから展開を試みる
        if let Some(context) = node.get("@context") {
            if let Some(context_obj) = context.as_object() {
                if let Some(definition) = context_obj.get(key) {
                    if let Some(iri) = definition.as_str() {
                        return Ok(iri.to_string());
                    } else if let Some(obj) = definition.as_object() {
                        if let Some(id) = obj.get("@id") {
                            if let Some(id_str) = id.as_str() {
                                return Ok(id_str.to_string());
                            }
                        }
                    }
                }
            }
        }

        // デフォルト: プレフィックスなしのIRIとして扱う
        Ok(format!("https://gftd.ai/producerv2#{}", key))
    }

    /// ベクトル埋め込み用テキストを抽出
    pub fn extract_text_for_embedding(jsonld: &Value) -> String {
        let mut texts = Vec::new();

        // @graphがある場合は各要素を処理
        if let Some(graph) = jsonld.get("@graph").and_then(|g| g.as_array()) {
            for item in graph {
                texts.push(Self::extract_text_from_node(item));
            }
        } else {
            texts.push(Self::extract_text_from_node(jsonld));
        }

        texts.join("\n")
    }

    /// ノードからテキストを抽出
    fn extract_text_from_node(node: &Value) -> String {
        let mut parts = Vec::new();

        if let Some(obj) = node.as_object() {
            // @idを追加
            if let Some(id) = obj.get("@id").and_then(|v| v.as_str()) {
                parts.push(format!("ID: {}", id));
            }

            // @typeを追加
            if let Some(types) = obj.get("@type") {
                if let Some(type_array) = types.as_array() {
                    for t in type_array {
                        if let Some(type_str) = t.as_str() {
                            parts.push(format!("Type: {}", type_str));
                        }
                    }
                } else if let Some(type_str) = types.as_str() {
                    parts.push(format!("Type: {}", type_str));
                }
            }

            // その他のプロパティからテキストを抽出
            for (key, value) in obj.iter() {
                if key.starts_with('@') {
                    continue;
                }

                if let Some(str_val) = value.as_str() {
                    parts.push(format!("{}: {}", key, str_val));
                } else if let Some(array) = value.as_array() {
                    for item in array {
                        if let Some(str_val) = item.as_str() {
                            parts.push(format!("{}: {}", key, str_val));
                        } else {
                            parts.push(Self::extract_text_from_node(item));
                        }
                    }
                } else {
                    parts.push(Self::extract_text_from_node(value));
                }
            }
        }

        parts.join("\n")
    }

    /// JSON-LDを正規化（context=embedded形式で保持）
    pub fn normalize_with_embedded_context(jsonld: &Value) -> Result<Value, JsonLdError> {
        let mut normalized = jsonld.clone();

        // @contextが存在する場合は保持
        if normalized.get("@context").is_none() {
            // デフォルトコンテキストを追加
            let default_context = serde_json::json!({
                "@version": 1.1,
                "id": "@id",
                "type": "@type",
                "ex": "https://gftd.ai/producerv2#",
                "dct": "http://purl.org/dc/terms/",
                "xsd": "http://www.w3.org/2001/XMLSchema#",
                "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
                "owl": "http://www.w3.org/2002/07/owl#"
            });

            if let Some(obj) = normalized.as_object_mut() {
                obj.insert("@context".to_string(), default_context);
            } else {
                // オブジェクトでない場合はオブジェクトにラップ
                normalized = serde_json::json!({
                    "@context": default_context,
                    "@graph": [normalized]
                });
            }
        }

        Ok(normalized)
    }
}

/// RDFトリプル
#[derive(Debug, Clone)]
pub struct RdfTriple {
    pub subject: String,
    pub predicate: String,
    pub object: String,
    pub object_type: String, // "uri", "literal", "bnode"
}

