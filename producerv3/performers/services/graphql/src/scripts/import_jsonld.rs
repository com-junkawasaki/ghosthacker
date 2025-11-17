/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/import-jsonld-nodes
 * 
 * JSON-LD parser and mapper for importing nodes into PostgreSQL
 */
use serde_json::Value;
use std::collections::HashMap;

/// Extract node ID from @id field
/// Examples:
/// - "character:akito" -> ("character", "akito")
/// - "ghost:kageboushi" -> ("ghost", "kageboushi")
/// - "gh:Visual/TokyoWaterCity" -> ("setting", "Visual/TokyoWaterCity")
pub fn extract_node_id(id: &str) -> Option<(String, String)> {
    if let Some(colon_pos) = id.find(':') {
        let prefix = &id[..colon_pos];
        let identifier = &id[colon_pos + 1..];
        
        // Map prefixes to node types
        let node_type = match prefix {
            "character" => "character",
            "ghost" => "ghost",
            "location" => "location",
            "organization" => "organization",
            "company" => "company",
            "technology" => "technology",
            "episode" => "episode",
            "scene" => "scene",
            "arc" => "arc",
            "motif" => "motif",
            "season" => "season",
            "timeline" => "timeline",
            "event" => "event",
            "sourceRef" | "source_ref" => "source_ref",
            "occupation" => "occupation",
            "setting" => "setting",
            "gh" => {
                // Check if it's a visual setting or other gh: prefixed type
                if identifier.starts_with("Visual/") || identifier.starts_with("Setting/") {
                    "setting"
                } else {
                    return None;
                }
            },
            _ => return None,
        };
        
        Some((node_type.to_string(), identifier.to_string()))
    } else {
        None
    }
}

/// Extract node type from @type field
pub fn extract_node_type(type_value: &Value) -> Option<String> {
    match type_value {
        Value::String(s) => {
            // Extract simple type name
            if let Some(colon_pos) = s.rfind(':') {
                Some(s[colon_pos + 1..].to_string())
            } else if let Some(slash_pos) = s.rfind('/') {
                Some(s[slash_pos + 1..].to_string())
            } else {
                Some(s.clone())
            }
        },
        Value::Array(arr) => {
            // Take first type if array
            arr.first().and_then(|v| extract_node_type(v))
        },
        _ => None,
    }
}

/// Parse age from various formats
pub fn parse_age(age_value: &Value) -> Option<i32> {
    match age_value {
        Value::Number(n) => n.as_i64().map(|v| v as i32),
        Value::String(s) => {
            // Try to parse string like "不明 (見た目は20代、口調は老婆)"
            // Extract number if present
            s.chars()
                .filter(|c| c.is_ascii_digit())
                .collect::<String>()
                .parse::<i32>()
                .ok()
        },
        _ => None,
    }
}

/// Extract string value from JSON value
pub fn extract_string(value: &Value) -> Option<String> {
    match value {
        Value::String(s) => Some(s.clone()),
        Value::Array(arr) => {
            // If array, join with comma or take first
            arr.first().and_then(|v| extract_string(v))
        },
        _ => None,
    }
}

/// Extract array of strings from JSON value
pub fn extract_string_array(value: &Value) -> Option<Vec<String>> {
    match value {
        Value::Array(arr) => {
            let strings: Vec<String> = arr
                .iter()
                .filter_map(|v| extract_string(v))
                .collect();
            if strings.is_empty() {
                None
            } else {
                Some(strings)
            }
        },
        Value::String(s) => Some(vec![s.clone()]),
        _ => None,
    }
}

/// Extract role from various formats (gh:role can be string or array)
pub fn extract_role(value: &Value) -> Option<String> {
    match value {
        Value::String(s) => Some(s.clone()),
        Value::Array(arr) => {
            // Join roles with comma
            let roles: Vec<String> = arr
                .iter()
                .filter_map(|v| extract_string(v))
                .collect();
            if roles.is_empty() {
                None
            } else {
                Some(roles.join(", "))
            }
        },
        _ => None,
    }
}

/// Extract master/created_by from @id reference
pub fn extract_reference_id(value: &Value) -> Option<String> {
    match value {
        Value::String(s) => {
            if let Some((_, id)) = extract_node_id(s) {
                Some(id)
            } else {
                Some(s.clone())
            }
        },
        Value::Object(obj) => {
            obj.get("@id")
                .and_then(|v| extract_string(v))
                .and_then(|s| extract_node_id(&s).map(|(_, id)| id))
        },
        _ => None,
    }
}

/// Parse a single JSON-LD node and return mapping information
pub fn parse_jsonld_node(node: &Value) -> Result<NodeMapping, String> {
    let obj = node.as_object().ok_or("Node is not an object")?;
    
    // Extract @id
    let id = obj.get("@id")
        .and_then(|v| extract_string(v))
        .ok_or("Missing @id field")?;
    
    let (node_type, node_id) = extract_node_id(&id)
        .ok_or_else(|| format!("Invalid @id format: {}", id))?;
    
    // Extract @type
    let type_name = obj.get("@type")
        .and_then(|v| extract_node_type(v))
        .unwrap_or_else(|| node_type.clone());
    
    // Extract name (required)
    let name = obj.get("name")
        .and_then(|v| extract_string(v))
        .ok_or("Missing name field")?;
    
    // Build mapping based on node type
    let mut mapping = NodeMapping {
        node_type: node_type.clone(),
        node_id: node_id.clone(),
        name: name.clone(),
        fields: HashMap::new(),
    };
    
    // Common fields
    if let Some(desc) = obj.get("description").and_then(|v| extract_string(v)) {
        mapping.fields.insert("description".to_string(), Value::String(desc));
    }
    
    if let Some(alt_name) = obj.get("alternateName").and_then(|v| extract_string(v)) {
        mapping.fields.insert("alternate_name".to_string(), Value::String(alt_name));
    }
    
    // Type-specific fields
    match node_type.as_str() {
        "character" => {
            if let Some(age_val) = obj.get("age") {
                if let Some(age) = parse_age(age_val) {
                    mapping.fields.insert("age".to_string(), Value::Number(age.into()));
                }
            }
            if let Some(occ) = obj.get("occupation").and_then(|v| extract_string(v)) {
                mapping.fields.insert("occupation".to_string(), Value::String(occ));
            }
            if let Some(role) = obj.get("gh:role").and_then(|v| extract_role(v)) {
                mapping.fields.insert("role".to_string(), Value::String(role));
            }
            if let Some(virtue) = obj.get("gh:virtue").and_then(|v| extract_string(v)) {
                mapping.fields.insert("virtue".to_string(), Value::String(virtue));
            }
            if let Some(callsign) = obj.get("gh:callsign").and_then(|v| extract_string(v)) {
                mapping.fields.insert("callsign".to_string(), Value::String(callsign));
            }
        },
        "ghost" => {
            if let Some(ghost_type) = obj.get("ghostType").and_then(|v| extract_string(v)) {
                mapping.fields.insert("ghost_type".to_string(), Value::String(ghost_type));
            }
            if let Some(master) = obj.get("master").and_then(|v| extract_reference_id(v)) {
                mapping.fields.insert("master".to_string(), Value::String(master));
            }
            if let Some(created_by) = obj.get("createdBy").or_else(|| obj.get("created_by"))
                .and_then(|v| extract_reference_id(v)) {
                mapping.fields.insert("created_by".to_string(), Value::String(created_by));
            }
        },
        "location" => {
            if let Some(year_val) = obj.get("year") {
                if let Some(year) = parse_age(year_val) {
                    mapping.fields.insert("year".to_string(), Value::Number(year.into()));
                }
            }
            if let Some(hazard) = obj.get("gh:hazardNote").or_else(|| obj.get("hazard_note"))
                .and_then(|v| extract_string(v)) {
                mapping.fields.insert("hazard_note".to_string(), Value::String(hazard));
            }
            if let Some(op) = obj.get("gh:operationalNote").or_else(|| obj.get("operational_note"))
                .and_then(|v| extract_string(v)) {
                mapping.fields.insert("operational_note".to_string(), Value::String(op));
            }
            if let Some(sec) = obj.get("gh:securityNote").or_else(|| obj.get("security_note"))
                .and_then(|v| extract_string(v)) {
                mapping.fields.insert("security_note".to_string(), Value::String(sec));
            }
        },
        "organization" | "company" => {
            if let Some(founder) = obj.get("founder").and_then(|v| extract_reference_id(v)) {
                mapping.fields.insert("founder".to_string(), Value::String(founder));
            }
            if let Some(ct) = obj.get("companyType").or_else(|| obj.get("company_type"))
                .and_then(|v| extract_string(v)) {
                mapping.fields.insert("company_type".to_string(), Value::String(ct));
            }
            if let Some(infra) = obj.get("gh:infraNote").or_else(|| obj.get("infra_note"))
                .and_then(|v| extract_string(v)) {
                mapping.fields.insert("infra_note".to_string(), Value::String(infra));
            }
            if let Some(op) = obj.get("gh:operationalNote").or_else(|| obj.get("operational_note"))
                .and_then(|v| extract_string(v)) {
                mapping.fields.insert("operational_note".to_string(), Value::String(op));
            }
            if let Some(sec) = obj.get("gh:securityNote").or_else(|| obj.get("security_note"))
                .and_then(|v| extract_string(v)) {
                mapping.fields.insert("security_note".to_string(), Value::String(sec));
            }
        },
        "technology" => {
            if let Some(cert) = obj.get("certification").and_then(|v| extract_string(v)) {
                mapping.fields.insert("certification".to_string(), Value::String(cert));
            }
            if let Some(infra) = obj.get("gh:infraNote").or_else(|| obj.get("infra_note"))
                .and_then(|v| extract_string(v)) {
                mapping.fields.insert("infra_note".to_string(), Value::String(infra));
            }
            if let Some(op) = obj.get("gh:operationalNote").or_else(|| obj.get("operational_note"))
                .and_then(|v| extract_string(v)) {
                mapping.fields.insert("operational_note".to_string(), Value::String(op));
            }
            if let Some(sec) = obj.get("gh:securityNote").or_else(|| obj.get("security_note"))
                .and_then(|v| extract_string(v)) {
                mapping.fields.insert("security_note".to_string(), Value::String(sec));
            }
        },
        "episode" => {
            if let Some(ep_num) = obj.get("episodeNumber").or_else(|| obj.get("episode_number"))
                .and_then(|v| v.as_i64().map(|n| n as i32)) {
                mapping.fields.insert("episode_number".to_string(), Value::Number(ep_num.into()));
            }
            if let Some(season) = obj.get("season").and_then(|v| extract_string(v)) {
                mapping.fields.insert("season".to_string(), Value::String(season));
            }
            if let Some(logline) = obj.get("logline").and_then(|v| extract_string(v)) {
                mapping.fields.insert("logline".to_string(), Value::String(logline));
            }
            if let Some(has_arc) = obj.get("hasArc").or_else(|| obj.get("has_arc"))
                .and_then(|v| v.as_bool()) {
                mapping.fields.insert("has_arc".to_string(), Value::Bool(has_arc));
            }
            if let Some(has_scene) = obj.get("hasScene").or_else(|| obj.get("has_scene"))
                .and_then(|v| v.as_bool()) {
                mapping.fields.insert("has_scene".to_string(), Value::Bool(has_scene));
            }
            if let Some(has_char) = obj.get("hasCharacter").or_else(|| obj.get("has_character"))
                .and_then(|v| v.as_bool()) {
                mapping.fields.insert("has_character".to_string(), Value::Bool(has_char));
            }
            if let Some(motifs) = obj.get("motifRefs").or_else(|| obj.get("motif_refs"))
                .and_then(|v| extract_string_array(v)) {
                mapping.fields.insert("motif_refs".to_string(), Value::Array(
                    motifs.into_iter().map(|s| Value::String(s)).collect()
                ));
            }
            if let Some(ant) = obj.get("antagonist").and_then(|v| extract_reference_id(v)) {
                mapping.fields.insert("antagonist".to_string(), Value::String(ant));
            }
        },
        "scene" => {
            if let Some(same_as) = obj.get("sameAs").or_else(|| obj.get("same_as"))
                .and_then(|v| extract_string(v)) {
                mapping.fields.insert("same_as".to_string(), Value::String(same_as));
            }
        },
        "arc" => {
            if let Some(spans) = obj.get("spansSeasons").or_else(|| obj.get("spans_seasons"))
                .and_then(|v| extract_string_array(v)) {
                mapping.fields.insert("spans_seasons".to_string(), Value::Array(
                    spans.into_iter().map(|s| Value::String(s)).collect()
                ));
            }
            if let Some(phase) = obj.get("phase").and_then(|v| extract_string(v)) {
                mapping.fields.insert("phase".to_string(), Value::String(phase));
            }
        },
        "motif" => {
            if let Some(theme) = obj.get("theme").and_then(|v| extract_string(v)) {
                mapping.fields.insert("theme".to_string(), Value::String(theme));
            }
            if let Some(source) = obj.get("source").and_then(|v| extract_string(v)) {
                mapping.fields.insert("source".to_string(), Value::String(source));
            }
        },
        "season" => {
            if let Some(theme) = obj.get("theme").and_then(|v| extract_string(v)) {
                mapping.fields.insert("theme".to_string(), Value::String(theme));
            }
            if let Some(featured) = obj.get("featuredThemes").or_else(|| obj.get("featured_themes"))
                .and_then(|v| extract_string_array(v)) {
                mapping.fields.insert("featured_themes".to_string(), Value::Array(
                    featured.into_iter().map(|s| Value::String(s)).collect()
                ));
            }
            if let Some(source) = obj.get("source").and_then(|v| extract_string(v)) {
                mapping.fields.insert("source".to_string(), Value::String(source));
            }
        },
        "timeline" => {
            if let Some(influences) = obj.get("influences")
                .and_then(|v| extract_string_array(v)) {
                mapping.fields.insert("influences".to_string(), Value::Array(
                    influences.into_iter().map(|s| Value::String(s)).collect()
                ));
            }
            if let Some(source) = obj.get("source").and_then(|v| extract_string(v)) {
                mapping.fields.insert("source".to_string(), Value::String(source));
            }
        },
        "event" => {
            if let Some(start) = obj.get("startDate").or_else(|| obj.get("start_date"))
                .and_then(|v| extract_string(v)) {
                mapping.fields.insert("start_date".to_string(), Value::String(start));
            }
            if let Some(end) = obj.get("endDate").or_else(|| obj.get("end_date"))
                .and_then(|v| extract_string(v)) {
                mapping.fields.insert("end_date".to_string(), Value::String(end));
            }
            if let Some(tc) = obj.get("temporalCoverage").or_else(|| obj.get("temporal_coverage"))
                .and_then(|v| extract_string(v)) {
                mapping.fields.insert("temporal_coverage".to_string(), Value::String(tc));
            }
            if let Some(same_as) = obj.get("sameAs").or_else(|| obj.get("same_as"))
                .and_then(|v| extract_string_array(v)) {
                mapping.fields.insert("same_as".to_string(), Value::Array(
                    same_as.into_iter().map(|s| Value::String(s)).collect()
                ));
            }
        },
        "source_ref" => {
            if let Some(path) = obj.get("path").and_then(|v| extract_string(v)) {
                mapping.fields.insert("path".to_string(), Value::String(path));
            }
            if let Some(lang) = obj.get("lang").or_else(|| obj.get("language"))
                .and_then(|v| extract_string(v)) {
                mapping.fields.insert("lang".to_string(), Value::String(lang));
            }
            if let Some(hint) = obj.get("selectionHint").or_else(|| obj.get("selection_hint"))
                .and_then(|v| extract_string(v)) {
                mapping.fields.insert("selection_hint".to_string(), Value::String(hint));
            }
        },
        "occupation" => {
            // Only name and description, already handled
        },
        "setting" => {
            if let Some(ghost_type) = obj.get("ghostType").or_else(|| obj.get("ghost_type"))
                .and_then(|v| extract_string(v)) {
                mapping.fields.insert("ghost_type".to_string(), Value::String(ghost_type));
            }
        },
        _ => {
            // Unknown type, but continue with basic fields
        },
    }
    
    Ok(mapping)
}

/// Node mapping structure
#[derive(Debug, Clone)]
pub struct NodeMapping {
    pub node_type: String,
    pub node_id: String,
    pub name: String,
    pub fields: HashMap<String, Value>,
}

/// Parse JSON-LD file (handles both single object and @graph array)
pub fn parse_jsonld_file(content: &str) -> Result<Vec<NodeMapping>, String> {
    let json: Value = serde_json::from_str(content)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;
    
    let nodes = if let Some(graph) = json.get("@graph") {
        // Handle @graph array
        graph.as_array()
            .ok_or("@graph is not an array")?
            .iter()
            .collect()
    } else if json.is_object() {
        // Handle single object
        vec![&json]
    } else {
        return Err("JSON-LD file must be an object or contain @graph array".to_string());
    };
    
    let mut mappings = Vec::new();
    for node in nodes {
        match parse_jsonld_node(node) {
            Ok(mapping) => mappings.push(mapping),
            Err(e) => {
                eprintln!("Warning: Failed to parse node: {}", e);
                // Continue with other nodes
            }
        }
    }
    
    Ok(mappings)
}

