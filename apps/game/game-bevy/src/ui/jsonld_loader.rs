/**
 * JSON-LD UI Loader
 * JSON-LDファイルからBevy UIを生成するローダー
 * 
 * @context {
 *   "@id": "ex:JsonLdUILoader",
 *   "@type": "ex:UILoader",
 *   "ex:loads": ["ex:JsonLdScreen", "ex:BevyUI"]
 * }
 */

use serde_json::Value;
use std::fs;
use std::path::PathBuf;

/// JSON-LD UI定義を読み込む
pub fn load_jsonld_ui(path: &str) -> Result<Value, String> {
    let file_path = PathBuf::from(path);
    
    eprintln!("Attempting to load JSON-LD from: {}", path);
    eprintln!("File exists: {}", file_path.exists());
    
    if !file_path.exists() {
        return Err(format!("JSON-LD file not found: {} (absolute: {})", path, file_path.canonicalize().unwrap_or_default().display()));
    }

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read JSON-LD file: {}", e))?;

    eprintln!("JSON-LD file read successfully, size: {} bytes", content.len());

    let json_ld: Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse JSON-LD: {}", e))?;

    eprintln!("JSON-LD parsed successfully");
    Ok(json_ld)
}

/// @graphから指定IDの要素を取得
pub fn find_element_by_id<'a>(json_ld: &'a Value, id: &str) -> Option<&'a Value> {
    if let Some(graph) = json_ld.get("@graph").and_then(|g| g.as_array()) {
        graph.iter().find(|item| {
            item.get("id")
                .and_then(|i| i.as_str())
                .map(|i| i == id)
                .unwrap_or(false)
        })
    } else {
        None
    }
}

/// テーマ情報を取得
pub fn get_theme<'a>(json_ld: &'a Value, theme_id: &str) -> Option<&'a Value> {
    find_element_by_id(json_ld, theme_id)
}

