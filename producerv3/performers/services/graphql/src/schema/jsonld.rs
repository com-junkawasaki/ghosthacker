/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/jsonld-nodes
 * 
 * JSON-LD Node GraphQL schema definitions
 */
use async_graphql::{SimpleObject, ID};

#[derive(SimpleObject, Clone)]
pub struct Character {
    pub id: ID,
    pub character_id: String,
    pub name: String,
    pub callsign: Option<String>,
    pub description: Option<String>,
    pub age: Option<i32>,
    pub occupation: Option<String>,
    pub role: Option<String>,
    pub virtue: Option<String>,
    pub alternate_name: Option<String>,
}

#[derive(SimpleObject, Clone)]
pub struct Ghost {
    pub id: ID,
    pub ghost_id: String,
    pub name: String,
    pub ghost_type: Option<String>,
    pub description: Option<String>,
    pub master: Option<String>,
    pub created_by: Option<String>,
}

#[derive(SimpleObject, Clone)]
pub struct Location {
    pub id: ID,
    pub location_id: String,
    pub name: String,
    pub description: Option<String>,
    pub year: Option<i32>,
    pub hazard_note: Option<String>,
    pub operational_note: Option<String>,
    pub security_note: Option<String>,
}

#[derive(SimpleObject, Clone)]
pub struct Organization {
    pub id: ID,
    pub organization_id: String,
    pub name: String,
    pub description: Option<String>,
    pub founder: Option<String>,
    pub company_type: Option<String>,
    pub infra_note: Option<String>,
    pub operational_note: Option<String>,
    pub security_note: Option<String>,
}

#[derive(SimpleObject, Clone)]
pub struct Company {
    pub id: ID,
    pub company_id: String,
    pub name: String,
    pub description: Option<String>,
    pub founder: Option<String>,
    pub company_type: Option<String>,
    pub infra_note: Option<String>,
    pub operational_note: Option<String>,
    pub security_note: Option<String>,
}

#[derive(SimpleObject, Clone)]
pub struct Technology {
    pub id: ID,
    pub technology_id: String,
    pub name: String,
    pub description: Option<String>,
    pub certification: Option<String>,
    pub infra_note: Option<String>,
    pub operational_note: Option<String>,
    pub security_note: Option<String>,
}

#[derive(SimpleObject, Clone)]
pub struct Episode {
    pub id: ID,
    pub episode_id: String,
    pub episode_number: i32,
    pub season: String,
    pub name: String,
    pub logline: Option<String>,
    pub has_arc: Option<bool>,
    pub has_scene: Option<bool>,
    pub has_character: Option<bool>,
    pub motif_refs: Option<Vec<String>>,
    pub antagonist: Option<String>,
}

#[derive(SimpleObject, Clone)]
pub struct Scene {
    pub id: ID,
    pub scene_id: String,
    pub name: String,
    pub same_as: Option<String>,
    pub description: Option<String>,
}

#[derive(SimpleObject, Clone)]
pub struct Arc {
    pub id: ID,
    pub arc_id: String,
    pub name: String,
    pub spans_seasons: Option<Vec<String>>,
    pub phase: Option<String>,
    pub description: Option<String>,
}

#[derive(SimpleObject, Clone)]
pub struct Motif {
    pub id: ID,
    pub motif_id: String,
    pub name: String,
    pub theme: Option<String>,
    pub source: Option<String>,
    pub description: Option<String>,
}

#[derive(SimpleObject, Clone)]
pub struct Season {
    pub id: ID,
    pub season_id: String,
    pub name: String,
    pub theme: Option<String>,
    pub featured_themes: Option<Vec<String>>,
    pub source: Option<String>,
}

#[derive(SimpleObject, Clone)]
pub struct Timeline {
    pub id: ID,
    pub timeline_id: String,
    pub name: String,
    pub description: Option<String>,
    pub influences: Option<Vec<String>>,
    pub source: Option<String>,
}

#[derive(SimpleObject, Clone)]
pub struct Event {
    pub id: ID,
    pub event_id: String,
    pub name: String,
    pub description: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub temporal_coverage: Option<String>,
    pub same_as: Option<Vec<String>>,
}

#[derive(SimpleObject, Clone)]
pub struct SourceRef {
    pub id: ID,
    pub source_ref_id: String,
    pub path: String,
    pub lang: String,
    pub selection_hint: Option<String>,
}

#[derive(SimpleObject, Clone)]
pub struct Occupation {
    pub id: ID,
    pub occupation_id: String,
    pub name: String,
    pub description: Option<String>,
}

#[derive(SimpleObject, Clone)]
pub struct Setting {
    pub id: ID,
    pub setting_id: String,
    pub name: String,
    pub description: Option<String>,
    pub ghost_type: Option<String>,
}

