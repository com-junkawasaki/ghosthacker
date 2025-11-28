/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/import-jsonld-nodes-cli
 * 
 * CLI tool to import JSON-LD files from 250806 folder into PostgreSQL database
 */
use epub_editor_graphql::ports::postgres;
use epub_editor_graphql::scripts::import_jsonld;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Get base directory (250806 folder)
    let base_dir = env::args()
        .nth(1)
        .unwrap_or_else(|| "../../../250806".to_string());
    
    let base_path = PathBuf::from(&base_dir);
    if !base_path.exists() {
        eprintln!("Error: Directory not found: {}", base_dir);
        std::process::exit(1);
    }
    
    // Connect to database
    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/postgres".to_string());
    
    println!("Connecting to database...");
    let pool = postgres::create_pool_without_migrations().await?;
    println!("Connected successfully!");
    
    // Import from character folder
    let character_dir = base_path.join("character");
    if character_dir.exists() {
        println!("\n=== Importing characters ===");
        import_directory(&pool, &character_dir, "character").await?;
    }
    
    // Import from episodes folder
    let episodes_dir = base_path.join("episodes");
    if episodes_dir.exists() {
        println!("\n=== Importing episodes ===");
        import_directory(&pool, &episodes_dir, "episode").await?;
    }
    
    // Import from setting folder
    let setting_dir = base_path.join("setting");
    if setting_dir.exists() {
        println!("\n=== Importing settings ===");
        import_directory(&pool, &setting_dir, "setting").await?;
    }
    
    // Import from context folder (if contains JSON-LD files)
    let context_dir = base_path.join("context");
    if context_dir.exists() {
        println!("\n=== Importing context ===");
        import_directory(&pool, &context_dir, "setting").await?;
    }
    
    println!("\n=== Import completed! ===");
    Ok(())
}

async fn import_directory(
    pool: &postgres::PostgresPool,
    dir: &Path,
    default_type: &str,
) -> anyhow::Result<()> {
    let mut file_count = 0;
    let mut success_count = 0;
    let mut error_count = 0;
    
    for entry in WalkDir::new(dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_type().is_file() && 
            e.path().extension().and_then(|s| s.to_str()) == Some("jsonld")
        })
    {
        file_count += 1;
        let file_path = entry.path();
        
        println!("Processing: {}", file_path.display());
        
        match import_file(pool, file_path, default_type).await {
            Ok(count) => {
                success_count += 1;
                println!("  ✓ Imported {} node(s)", count);
            },
            Err(e) => {
                error_count += 1;
                eprintln!("  ✗ Error: {}", e);
            }
        }
    }
    
    println!("\nSummary: {} files processed, {} succeeded, {} failed", 
        file_count, success_count, error_count);
    
    Ok(())
}

async fn import_file(
    pool: &postgres::PostgresPool,
    file_path: &Path,
    default_type: &str,
) -> anyhow::Result<usize> {
    let content = fs::read_to_string(file_path)?;
    
    let mappings = import_jsonld::parse_jsonld_file(&content)
        .map_err(|e| anyhow::anyhow!("Failed to parse JSON-LD file {}: {}", file_path.display(), e))?;
    
    let mut imported_count = 0;
    
    for mapping in mappings {
        match import_node(pool, &mapping).await {
            Ok(_) => imported_count += 1,
            Err(e) => {
                eprintln!("  Warning: Failed to import node {}: {}", mapping.node_id, e);
            }
        }
    }
    
    Ok(imported_count)
}

async fn import_node(
    pool: &postgres::PostgresPool,
    mapping: &import_jsonld::NodeMapping,
) -> anyhow::Result<()> {
    
    match mapping.node_type.as_str() {
        "character" => {
            postgres::upsert_character(
                pool,
                mapping.node_id.clone(),
                mapping.name.clone(),
                mapping.fields.get("callsign").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("description").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("age").and_then(|v| v.as_i64().map(|n| n as i32)),
                mapping.fields.get("occupation").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("role").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("virtue").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("alternate_name").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("image_base64").and_then(|v| v.as_str().map(|s| s.to_string())),
            ).await
            .map_err(|e| anyhow::anyhow!("Failed to upsert character {}: {:?}", mapping.node_id, e))?;
        },
        "ghost" => {
            postgres::upsert_ghost(
                pool,
                mapping.node_id.clone(),
                mapping.name.clone(),
                mapping.fields.get("ghost_type").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("description").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("master").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("created_by").and_then(|v| v.as_str().map(|s| s.to_string())),
            ).await
            .map_err(|e| anyhow::anyhow!("Failed to upsert ghost {}: {:?}", mapping.node_id, e))?;
        },
        "location" => {
            postgres::upsert_location(
                pool,
                mapping.node_id.clone(),
                mapping.name.clone(),
                mapping.fields.get("description").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("year").and_then(|v| v.as_i64().map(|n| n as i32)),
                mapping.fields.get("hazard_note").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("operational_note").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("security_note").and_then(|v| v.as_str().map(|s| s.to_string())),
            ).await
            .map_err(|e| anyhow::anyhow!("Failed to upsert location {}: {:?}", mapping.node_id, e))?;
        },
        "organization" => {
            postgres::upsert_organization(
                pool,
                mapping.node_id.clone(),
                mapping.name.clone(),
                mapping.fields.get("description").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("founder").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("company_type").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("infra_note").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("operational_note").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("security_note").and_then(|v| v.as_str().map(|s| s.to_string())),
            ).await
            .map_err(|e| anyhow::anyhow!("Failed to upsert organization {}: {:?}", mapping.node_id, e))?;
        },
        "company" => {
            postgres::upsert_company(
                pool,
                mapping.node_id.clone(),
                mapping.name.clone(),
                mapping.fields.get("description").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("founder").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("company_type").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("infra_note").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("operational_note").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("security_note").and_then(|v| v.as_str().map(|s| s.to_string())),
            ).await
            .map_err(|e| anyhow::anyhow!("Failed to upsert company {}: {:?}", mapping.node_id, e))?;
        },
        "technology" => {
            postgres::upsert_technology(
                pool,
                mapping.node_id.clone(),
                mapping.name.clone(),
                mapping.fields.get("description").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("certification").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("infra_note").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("operational_note").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("security_note").and_then(|v| v.as_str().map(|s| s.to_string())),
            ).await
            .map_err(|e| anyhow::anyhow!("Failed to upsert technology {}: {:?}", mapping.node_id, e))?;
        },
        "episode" => {
            let episode_number = mapping.fields.get("episode_number")
                .and_then(|v| v.as_i64().map(|n| n as i32))
                .unwrap_or(0);
            let season = mapping.fields.get("season")
                .and_then(|v| v.as_str().map(|s| s.to_string()))
                .unwrap_or_else(|| "Unknown".to_string());
            
            postgres::upsert_episode(
                pool,
                mapping.node_id.clone(),
                episode_number,
                season,
                mapping.name.clone(),
                mapping.fields.get("logline").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("has_arc").and_then(|v| v.as_bool()),
                mapping.fields.get("has_scene").and_then(|v| v.as_bool()),
                mapping.fields.get("has_character").and_then(|v| v.as_bool()),
                mapping.fields.get("motif_refs")
                    .and_then(|v| v.as_array())
                    .map(|arr| arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()),
                mapping.fields.get("antagonist").and_then(|v| v.as_str().map(|s| s.to_string())),
            ).await
            .map_err(|e| anyhow::anyhow!("Failed to upsert episode {}: {:?}", mapping.node_id, e))?;
        },
        "scene" => {
            postgres::upsert_scene(
                pool,
                mapping.node_id.clone(),
                mapping.name.clone(),
                mapping.fields.get("same_as").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("description").and_then(|v| v.as_str().map(|s| s.to_string())),
            ).await
            .map_err(|e| anyhow::anyhow!("Failed to upsert scene {}: {:?}", mapping.node_id, e))?;
        },
        "arc" => {
            postgres::upsert_arc(
                pool,
                mapping.node_id.clone(),
                mapping.name.clone(),
                mapping.fields.get("spans_seasons")
                    .and_then(|v| v.as_array())
                    .map(|arr| arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()),
                mapping.fields.get("phase").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("description").and_then(|v| v.as_str().map(|s| s.to_string())),
            ).await
            .map_err(|e| anyhow::anyhow!("Failed to upsert arc {}: {:?}", mapping.node_id, e))?;
        },
        "motif" => {
            postgres::upsert_motif(
                pool,
                mapping.node_id.clone(),
                mapping.name.clone(),
                mapping.fields.get("theme").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("source").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("description").and_then(|v| v.as_str().map(|s| s.to_string())),
            ).await
            .map_err(|e| anyhow::anyhow!("Failed to upsert motif {}: {:?}", mapping.node_id, e))?;
        },
        "season" => {
            postgres::upsert_season(
                pool,
                mapping.node_id.clone(),
                mapping.name.clone(),
                mapping.fields.get("theme").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("featured_themes")
                    .and_then(|v| v.as_array())
                    .map(|arr| arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()),
                mapping.fields.get("source").and_then(|v| v.as_str().map(|s| s.to_string())),
            ).await
            .map_err(|e| anyhow::anyhow!("Failed to upsert season {}: {:?}", mapping.node_id, e))?;
        },
        "timeline" => {
            postgres::upsert_timeline(
                pool,
                mapping.node_id.clone(),
                mapping.name.clone(),
                mapping.fields.get("description").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("influences")
                    .and_then(|v| v.as_array())
                    .map(|arr| arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()),
                mapping.fields.get("source").and_then(|v| v.as_str().map(|s| s.to_string())),
            ).await
            .map_err(|e| anyhow::anyhow!("Failed to upsert timeline {}: {:?}", mapping.node_id, e))?;
        },
        "event" => {
            postgres::upsert_event(
                pool,
                mapping.node_id.clone(),
                mapping.name.clone(),
                mapping.fields.get("description").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("start_date").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("end_date").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("temporal_coverage").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("same_as")
                    .and_then(|v| v.as_array())
                    .map(|arr| arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()),
            ).await
            .map_err(|e| anyhow::anyhow!("Failed to upsert event {}: {:?}", mapping.node_id, e))?;
        },
        "source_ref" => {
            let path = mapping.fields.get("path")
                .and_then(|v| v.as_str().map(|s| s.to_string()))
                .unwrap_or_default();
            let lang = mapping.fields.get("lang")
                .and_then(|v| v.as_str().map(|s| s.to_string()))
                .unwrap_or_else(|| "en".to_string());
            
            postgres::upsert_source_ref(
                pool,
                mapping.node_id.clone(),
                path,
                lang,
                mapping.fields.get("selection_hint").and_then(|v| v.as_str().map(|s| s.to_string())),
            ).await
            .map_err(|e| anyhow::anyhow!("Failed to upsert source_ref {}: {:?}", mapping.node_id, e))?;
        },
        "occupation" => {
            postgres::upsert_occupation(
                pool,
                mapping.node_id.clone(),
                mapping.name.clone(),
                mapping.fields.get("description").and_then(|v| v.as_str().map(|s| s.to_string())),
            ).await
            .map_err(|e| anyhow::anyhow!("Failed to upsert occupation {}: {:?}", mapping.node_id, e))?;
        },
        "setting" => {
            postgres::upsert_setting(
                pool,
                mapping.node_id.clone(),
                mapping.name.clone(),
                mapping.fields.get("description").and_then(|v| v.as_str().map(|s| s.to_string())),
                mapping.fields.get("ghost_type").and_then(|v| v.as_str().map(|s| s.to_string())),
            ).await
            .map_err(|e| anyhow::anyhow!("Failed to upsert setting {}: {:?}", mapping.node_id, e))?;
        },
        _ => {
            return Err(anyhow::anyhow!("Unknown node type: {}", mapping.node_type));
        }
    }
    
    Ok(())
}

