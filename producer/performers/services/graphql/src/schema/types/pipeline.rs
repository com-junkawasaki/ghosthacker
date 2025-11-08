use async_graphql::*;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(SimpleObject, Clone)]
pub struct PipelineTopology {
    pub pipeline: Vec<Value>,
    pub execution_order: Vec<Value>,
    pub resources: Value,
    pub validation: Value,
    pub observability: Value,
    pub storage: Value,
    pub outputs: Value,
}

#[derive(InputObject)]
pub struct PipelineInput {
    pub topology: Option<Value>,
}

#[derive(SimpleObject, Clone)]
pub struct PipelineExecution {
    pub ok: bool,
    pub execution_id: Option<String>,
}

