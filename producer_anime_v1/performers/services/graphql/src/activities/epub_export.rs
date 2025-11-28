use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;

/// ePub3エクスポートリクエスト
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EpubExportRequest {
    pub document_id: String,
    pub settings_id: Option<String>,
    pub metadata: EpubMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EpubMetadata {
    pub title: String,
    pub author: String,
    pub language: Option<String>,
    pub publisher: Option<String>,
}

/// Kindleエクスポートリクエスト
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KindleExportRequest {
    pub document_id: String,
    pub format: String, // "mobi" or "azw3"
    pub metadata: EpubMetadata,
}

pub struct EpubExportActivities;

impl EpubExportActivities {
    /// Get resources directory path
    fn get_resources_dir() -> PathBuf {
        PathBuf::from("resources")
    }

    /// ePub3ドキュメントをエクスポート
    pub async fn export_epub3(
        request: EpubExportRequest,
    ) -> Result<String, String> {
        // Load document from JSON-LD
        let resources_dir = Self::get_resources_dir();
        let document_path = resources_dir
            .join("episodes")
            .join(format!("{}.jsonld", request.document_id));

        if !document_path.exists() {
            return Err(format!("Document not found: {}", document_path.display()));
        }

        let content = fs::read_to_string(&document_path)
            .map_err(|e| format!("Failed to read document: {}", e))?;

        // TODO: JSON-LDからePub3を生成
        // 1. JSON-LDをパース
        // 2. OPF、NCX、XHTMLファイルを生成
        // 3. ZIP形式でパッケージング

        // Placeholder: Return success message
        Ok(format!("ePub3 exported: {}", request.document_id))
    }

    /// Kindle形式にエクスポート
    pub async fn export_kindle(
        request: KindleExportRequest,
    ) -> Result<String, String> {
        // First, generate ePub3
        let epub_request = EpubExportRequest {
            document_id: request.document_id.clone(),
            settings_id: None,
            metadata: request.metadata.clone(),
        };

        let epub_result = Self::export_epub3(epub_request).await?;

        // TODO: Use KindleGen or Calibre to convert ePub3 to Kindle format
        // This requires KindleGen/Calibre to be installed on the server
        // 
        // Example with KindleGen:
        // let output = Command::new("kindlegen")
        //     .arg(&epub_path)
        //     .output()
        //     .map_err(|e| format!("KindleGen failed: {}", e))?;

        // Placeholder: Return success message
        Ok(format!("Kindle ({}) exported: {}", request.format, request.document_id))
    }
}

