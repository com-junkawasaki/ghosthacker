/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/export-epub
 * 
 * EPUB export functionality - generates EPUB 3.0 format files
 */
use std::io::Write;
use zip::write::{FileOptions, ZipWriter};
use zip::CompressionMethod;
use crate::schema::epub::Epub;
use crate::ports::neo4j;

/// Export EPUB to ZIP file (EPUB 3.0 format)
pub async fn export_epub(pool: &neo4j::Neo4jPool, epub_id: String) -> anyhow::Result<Vec<u8>> {
    // Get EPUB data
    let epub = neo4j::get_epub(pool, epub_id.clone())
        .await
        .map_err(|e| async_graphql::Error::new(e.to_string()))?
        .ok_or_else(|| anyhow::anyhow!("EPUB not found"))?;
    
    // Create ZIP buffer
    let mut buffer = Vec::new();
    {
        let mut zip = ZipWriter::new(std::io::Cursor::new(&mut buffer));
        
        // mimetype file (must be first, uncompressed)
        zip.start_file("mimetype", FileOptions::default()
            .compression_method(CompressionMethod::Stored))?;
        zip.write_all(b"application/epub+zip")?;
        
        // META-INF/container.xml
        zip.start_file("META-INF/container.xml", FileOptions::default())?;
        let container_xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>"#;
        zip.write_all(container_xml.as_bytes())?;
        
        // OEBPS/package.opf
        zip.start_file("OEBPS/package.opf", FileOptions::default())?;
        let opf_content = generate_opf(&epub)?;
        zip.write_all(opf_content.as_bytes())?;
        
        // OEBPS/toc.ncx
        zip.start_file("OEBPS/toc.ncx", FileOptions::default())?;
        let ncx_content = generate_ncx(&epub)?;
        zip.write_all(ncx_content.as_bytes())?;
        
        // OEBPS/chapters/*.html
        for (index, chapter) in epub.chapters.iter().enumerate() {
            let filename = format!("OEBPS/chapter_{}.html", index + 1);
            zip.start_file(&filename, FileOptions::default())?;
            let html_content = generate_chapter_html(chapter)?;
            zip.write_all(html_content.as_bytes())?;
        }
        
        // OEBPS/Images/* (media files)
        for chapter in &epub.chapters {
            for media in &chapter.media {
                if media.r#type == "image" {
                    let filename = format!("OEBPS/Images/{}", 
                        media.url.split('/').last().unwrap_or("image"));
                    zip.start_file(&filename, FileOptions::default())?;
                    // Note: In production, fetch actual media file content
                    zip.write_all(b"")?;
                }
            }
        }
        
        zip.finish()?;
    }
    
    Ok(buffer)
}

fn generate_opf(epub: &Epub) -> anyhow::Result<String> {
    let mut opf = String::new();
    opf.push_str("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
    opf.push_str("<package xmlns=\"http://www.idpf.org/2007/opf\" unique-identifier=\"book-id\" version=\"3.0\">\n");
    opf.push_str("  <metadata xmlns:dc=\"http://purl.org/dc/elements/1.1/\">\n");
    opf.push_str(&format!("    <dc:identifier id=\"book-id\">{}</dc:identifier>\n", epub.id));
    opf.push_str(&format!("    <dc:title>{}</dc:title>\n", escape_xml(&epub.title)));
    opf.push_str(&format!("    <dc:language>{}</dc:language>\n", epub.language));
    
    for meta in &epub.metadata {
        match meta.key.as_str() {
            "author" => opf.push_str(&format!("    <dc:creator>{}</dc:creator>\n", escape_xml(&meta.value))),
            "publisher" => opf.push_str(&format!("    <dc:publisher>{}</dc:publisher>\n", escape_xml(&meta.value))),
            "date" => opf.push_str(&format!("    <dc:date>{}</dc:date>\n", escape_xml(&meta.value))),
            "rights" => opf.push_str(&format!("    <dc:rights>{}</dc:rights>\n", escape_xml(&meta.value))),
            _ => {}
        }
    }
    
    opf.push_str("  </metadata>\n");
    opf.push_str("  <manifest>\n");
    
    // Add chapters
    for (index, _) in epub.chapters.iter().enumerate() {
        let id = format!("chapter_{}", index + 1);
        let href = format!("chapter_{}.html", index + 1);
        opf.push_str(&format!("    <item id=\"{}\" href=\"{}\" media-type=\"application/xhtml+xml\"/>\n", id, href));
    }
    
    // Add media
    for chapter in &epub.chapters {
        for media in &chapter.media {
            let id = format!("media_{}", media.id);
            let href = format!("Images/{}", media.url.split('/').last().unwrap_or("media"));
            opf.push_str(&format!("    <item id=\"{}\" href=\"{}\" media-type=\"{}\"/>\n", id, href, media.mime_type));
        }
    }
    
    opf.push_str("    <item id=\"toc\" href=\"toc.ncx\" media-type=\"application/x-dtbncx+xml\"/>\n");
    opf.push_str("  </manifest>\n");
    opf.push_str("  <spine toc=\"toc\">\n");
    
    for (index, _) in epub.chapters.iter().enumerate() {
        let idref = format!("chapter_{}", index + 1);
        opf.push_str(&format!("    <itemref idref=\"{}\"/>\n", idref));
    }
    
    opf.push_str("  </spine>\n");
    opf.push_str("</package>\n");
    
    Ok(opf)
}

fn generate_ncx(epub: &Epub) -> anyhow::Result<String> {
    let mut ncx = String::new();
    ncx.push_str("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
    ncx.push_str("<ncx xmlns=\"http://www.daisy.org/z3986/2005/ncx/\" version=\"2005-1\">\n");
    ncx.push_str("  <head>\n");
    ncx.push_str(&format!("    <meta name=\"dtb:uid\" content=\"{}\"/>\n", epub.id));
    ncx.push_str("    <meta name=\"dtb:depth\" content=\"1\"/>\n");
    ncx.push_str("    <meta name=\"dtb:totalPageCount\" content=\"0\"/>\n");
    ncx.push_str("    <meta name=\"dtb:maxPageNumber\" content=\"0\"/>\n");
    ncx.push_str("  </head>\n");
    ncx.push_str("  <docTitle>\n");
    ncx.push_str(&format!("    <text>{}</text>\n", escape_xml(&epub.title)));
    ncx.push_str("  </docTitle>\n");
    ncx.push_str("  <navMap>\n");
    
    for (index, chapter) in epub.chapters.iter().enumerate() {
        let play_order = index + 1;
        let id = format!("chapter_{}", play_order);
        let src = format!("chapter_{}.html", play_order);
        ncx.push_str(&format!("    <navPoint id=\"{}\" playOrder=\"{}\">\n", id, play_order));
        ncx.push_str(&format!("      <navLabel><text>{}</text></navLabel>\n", escape_xml(&chapter.title)));
        ncx.push_str(&format!("      <content src=\"{}\"/>\n", src));
        ncx.push_str("    </navPoint>\n");
    }
    
    ncx.push_str("  </navMap>\n");
    ncx.push_str("</ncx>\n");
    
    Ok(ncx)
}

fn generate_chapter_html(chapter: &crate::schema::epub::Chapter) -> anyhow::Result<String> {
    let mut html = String::new();
    html.push_str("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
    html.push_str("<!DOCTYPE html>\n");
    html.push_str("<html xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:epub=\"http://www.idpf.org/2007/ops\">\n");
    html.push_str("  <head>\n");
    html.push_str("    <meta charset=\"UTF-8\"/>\n");
    html.push_str(&format!("    <title>{}</title>\n", escape_xml(&chapter.title)));
    html.push_str("  </head>\n");
    html.push_str("  <body>\n");
    html.push_str(&format!("    <h1>{}</h1>\n", escape_xml(&chapter.title)));
    html.push_str(&chapter.content_html);
    html.push_str("  </body>\n");
    html.push_str("</html>\n");
    
    Ok(html)
}

fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}
