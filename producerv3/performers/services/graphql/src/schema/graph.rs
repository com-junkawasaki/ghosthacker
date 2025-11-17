/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/graph-nodes-links-incidences
 * 
 * Graph schema for incidence graph model
 * Uses existing JSON-LD node tables as nodes, adds link and incidence tables
 */
use async_graphql::{SimpleObject, InputObject, ID};
use serde_json::Value;

/// Graph Node (polymorphic reference to any JSON-LD node table)
#[derive(SimpleObject, Clone)]
pub struct GraphNode {
    pub node_type: String, // 'character', 'ghost', 'location', etc.
    pub node_id: ID, // UUID from the node table
    pub name: String, // Display name
    pub data: Option<Value>, // Full node data as JSON
}

/// Graph Link (Edge between nodes)
#[derive(SimpleObject, Clone)]
pub struct GraphLink {
    pub id: ID,
    pub source_node_type: String,
    pub source_node_id: ID,
    pub target_node_type: String,
    pub target_node_id: ID,
    pub link_type: String, // 'worksFor', 'knows', 'parent', etc.
    pub properties: Option<Value>, // Additional properties
    pub created_at: String,
    pub updated_at: String,
}

/// Graph Incidence (Connection between node and link)
#[derive(SimpleObject, Clone)]
pub struct GraphIncidence {
    pub id: ID,
    pub node_type: String,
    pub node_id: ID,
    pub link_id: ID,
    pub role: String, // 'source', 'target', 'participant', etc.
    pub properties: Option<Value>, // Additional properties
    pub created_at: String,
    pub updated_at: String,
}

/// Input for creating a graph link
#[derive(InputObject)]
pub struct CreateGraphLinkInput {
    pub source_node_type: String,
    pub source_node_id: ID,
    pub target_node_type: String,
    pub target_node_id: ID,
    pub link_type: String,
    pub properties: Option<Value>,
}

/// Input for updating a graph link
#[derive(InputObject)]
pub struct UpdateGraphLinkInput {
    pub id: ID,
    pub link_type: Option<String>,
    pub properties: Option<Value>,
}

/// Input for creating a graph incidence
#[derive(InputObject)]
pub struct CreateGraphIncidenceInput {
    pub node_type: String,
    pub node_id: ID,
    pub link_id: ID,
    pub role: String,
    pub properties: Option<Value>,
}

/// Input for updating a graph incidence
#[derive(InputObject)]
pub struct UpdateGraphIncidenceInput {
    pub id: ID,
    pub role: Option<String>,
    pub properties: Option<Value>,
}

