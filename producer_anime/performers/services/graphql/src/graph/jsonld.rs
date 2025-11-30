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

use serde_json::{Value, Map};
use nanoid::nanoid;

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

    /// JSON-LDからグラフノードとエッジを抽出
    pub fn extract_graph_nodes_and_edges(jsonld: &Value) -> Result<(Vec<GraphNodeData>, Vec<GraphEdgeData>), JsonLdError> {
        let mut nodes = Vec::new();
        let mut edges = Vec::new();
        let mut node_map: Map<String, Value> = Map::new();
        
        // ルート要素もノードとして扱う（@idがある場合）
        let mut items = Vec::new();
        if jsonld.is_object() {
            if let Some(obj) = jsonld.as_object() {
                if obj.get("@id").is_some() {
                    items.push(jsonld);
                }
            }
        }
        
        // 全てのノードを再帰的に収集
        Self::collect_all_nodes(jsonld, &mut items);

        // まず全てのノードを抽出
        for item in &items {
            if let Some(obj) = item.as_object() {
                // @idがない場合でも、ルート要素や配列要素をノードとして扱う
                let id_str = if let Some(id_val) = obj.get("@id") {
                    if let Some(id) = id_val.as_str() {
                        id.to_string()
                    } else {
                        continue;
                    }
                } else {
                    // @idがない場合は生成（通常は発生しない）
                    format!("node:{}", nanoid::nanoid!())
                };
                
                // ノードデータを作成
                let mut node_props = Map::new();
                let mut node_jsonld = Map::new();
                
                // @contextを保持
                if let Some(context) = jsonld.get("@context") {
                    node_jsonld.insert("@context".to_string(), context.clone());
                }

                // プロパティをコピー
                for (key, value) in obj.iter() {
                    if key == "@id" || key == "@context" {
                        continue;
                    }
                    
                    // @typeを処理
                    if key == "@type" {
                        node_jsonld.insert("@type".to_string(), value.clone());
                        // ノードタイプをマッピング
                        let node_type = Self::map_node_type(value);
                        if let Some(nt) = node_type {
                            node_props.insert("nodeType".to_string(), Value::String(nt));
                        }
                    } else {
                        // 配列の場合、参照を含む可能性がある
                        if let Some(array) = value.as_array() {
                            // 配列内に参照があるかチェック
                            let has_refs = array.iter().any(|v| Self::is_reference(v));
                            if !has_refs {
                                // 参照がない場合はプロパティとして保存
                                node_props.insert(key.clone(), value.clone());
                                node_jsonld.insert(key.clone(), value.clone());
                            }
                            // 参照がある場合は後でエッジとして処理
                        } else if !Self::is_reference(value) {
                            // リテラル値はpropertiesに
                            node_props.insert(key.clone(), value.clone());
                            node_jsonld.insert(key.clone(), value.clone());
                        }
                        // 参照は後でエッジとして処理
                    }
                }

                // ラベルを抽出
                let label = Self::extract_label(obj, &node_props);
                
                node_jsonld.insert("@id".to_string(), Value::String(id_str.clone()));
                
                nodes.push(GraphNodeData {
                    id: id_str.clone(),
                    label,
                    properties: Value::Object(node_props),
                    jsonld: Value::Object(node_jsonld),
                });

                node_map.insert(id_str, (*item).clone());
            }
        }

        // エッジを抽出
        for item in &items {
            if let Some(obj) = item.as_object() {
                if let Some(source_id_val) = obj.get("@id") {
                    if let Some(source_id) = source_id_val.as_str() {
                        // 各プロパティからエッジを抽出
                        for (predicate, value) in obj.iter() {
                            if predicate.starts_with('@') || predicate == "@context" {
                                continue;
                            }

                            let edge_type = Self::map_edge_type(predicate);
                            
                            // 配列の場合
                            if let Some(array) = value.as_array() {
                                for item in array {
                                    // オブジェクト参照を抽出
                                    if let Some(target_id) = Self::extract_reference_id(item) {
                                        // ターゲットノードが存在することを確認
                                        if items.iter().any(|i| {
                                            i.as_object()
                                                .and_then(|o| o.get("@id"))
                                                .and_then(|id| id.as_str())
                                                .map(|id| id == target_id)
                                                .unwrap_or(false)
                                        }) {
                                            edges.push(GraphEdgeData {
                                                source: source_id.to_string(),
                                                target: target_id,
                                                label: predicate.clone(),
                                                edge_type: edge_type.clone(),
                                                properties: serde_json::json!({}),
                                            });
                                        }
                                    }
                                }
                            } else if let Some(target_id) = Self::extract_reference_id(value) {
                                // ターゲットノードが存在することを確認
                                if items.iter().any(|i| {
                                    i.as_object()
                                        .and_then(|o| o.get("@id"))
                                        .and_then(|id| id.as_str())
                                        .map(|id| id == target_id)
                                        .unwrap_or(false)
                                }) {
                                    edges.push(GraphEdgeData {
                                        source: source_id.to_string(),
                                        target: target_id,
                                        label: predicate.clone(),
                                        edge_type: edge_type.clone(),
                                        properties: serde_json::json!({}),
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        Ok((nodes, edges))
    }

    /// ノードタイプをマッピング
    fn map_node_type(type_value: &Value) -> Option<String> {
        let type_str = type_value.as_str()?;
        
        // Ghost Hackerの名前空間をチェック
        if type_str.contains("Character") || type_str.contains("character") {
            Some("character".to_string())
        } else if type_str.contains("Company") || type_str.contains("company") {
            Some("worldview".to_string())
        } else if type_str.contains("Episode") || type_str.contains("Story") {
            Some("beat".to_string())
        } else if type_str.contains("Scene") || type_str.contains("Page") {
            Some("scene".to_string())
        } else if type_str.contains("Script") || type_str.contains("Panel") {
            Some("event".to_string())
        } else if type_str.contains("Prompt") || type_str.contains("Generation") {
            Some("process".to_string())
        } else if type_str.contains("Context") {
            Some("context".to_string())
        } else {
            None
        }
    }

    /// エッジタイプをマッピング
    fn map_edge_type(predicate: &str) -> String {
        if predicate.contains("character") || predicate == "gh:characters" {
            "appearsIn".to_string()
        } else if predicate.contains("scene") || predicate == "gh:scenes" {
            "contains".to_string()
        } else if predicate.contains("page") || predicate == "gh:pages" {
            "contains".to_string()
        } else if predicate.contains("panel") || predicate == "gh:panels" {
            "contains".to_string()
        } else if predicate.contains("belongsTo") || predicate == "gh:belongsTo" {
            "belongsTo".to_string()
        } else if predicate.contains("influences") || predicate == "gh:influences" {
            "influences".to_string()
        } else {
            "relatesTo".to_string()
        }
    }

    /// 参照かどうかを判定
    fn is_reference(value: &Value) -> bool {
        if let Some(obj) = value.as_object() {
            obj.get("@id").is_some()
        } else if let Some(array) = value.as_array() {
            array.iter().any(|item| Self::is_reference(item))
        } else {
            false
        }
    }

    /// 参照からIDを抽出
    fn extract_reference_id(value: &Value) -> Option<String> {
        if let Some(obj) = value.as_object() {
            obj.get("@id")?.as_str().map(|s| s.to_string())
        } else if let Some(str_val) = value.as_str() {
            // 文字列がID参照の可能性がある場合
            if str_val.starts_with("character:") || 
               str_val.starts_with("scene:") || 
               str_val.starts_with("page:") ||
               str_val.starts_with("gh:") {
                Some(str_val.to_string())
            } else {
                None
            }
        } else {
            None
        }
    }

    /// 全てのノードを再帰的に収集
    fn collect_all_nodes<'a>(value: &'a Value, items: &mut Vec<&'a Value>) {
        if let Some(obj) = value.as_object() {
            // @idがある場合はノードとして追加
            if obj.get("@id").is_some() {
                items.push(value);
            }
            
            // 配列プロパティを再帰的に処理
            for (_, val) in obj.iter() {
                if let Some(array) = val.as_array() {
                    for item in array {
                        Self::collect_all_nodes(item, items);
                    }
                } else if val.is_object() {
                    Self::collect_all_nodes(val, items);
                }
            }
        } else if let Some(array) = value.as_array() {
            for item in array {
                Self::collect_all_nodes(item, items);
            }
        }
    }

    /// ラベルを抽出
    fn extract_label(obj: &Map<String, Value>, _props: &Map<String, Value>) -> String {
        // schema:nameを優先
        if let Some(name) = obj.get("schema:name").or_else(|| obj.get("name")) {
            if let Some(name_str) = name.as_str() {
                return name_str.to_string();
            }
        }
        
        // dct:titleを次に試す
        if let Some(title) = obj.get("dct:title").or_else(|| obj.get("title")) {
            if let Some(title_str) = title.as_str() {
                return title_str.to_string();
            }
        }

        // @idから最後の部分を抽出
        if let Some(id_val) = obj.get("@id") {
            if let Some(id_str) = id_val.as_str() {
                if let Some(last_part) = id_str.split(':').last() {
                    return last_part.to_string();
                }
            }
        }

        "Untitled".to_string()
    }
}

/// グラフノードデータ
#[derive(Debug, Clone)]
pub struct GraphNodeData {
    pub id: String,
    pub label: String,
    pub properties: Value,
    pub jsonld: Value,
}

/// グラフエッジデータ
#[derive(Debug, Clone)]
pub struct GraphEdgeData {
    pub source: String,
    pub target: String,
    pub label: String,
    pub edge_type: String,
    pub properties: Value,
}

/// RDFトリプル
#[derive(Debug, Clone)]
pub struct RdfTriple {
    pub subject: String,
    pub predicate: String,
    pub object: String,
    pub object_type: String, // "uri", "literal", "bnode"
}

