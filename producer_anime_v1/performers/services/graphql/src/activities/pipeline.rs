use crate::infra::database::DbPool;
use crate::schema::types::*;

pub struct PipelineActivities;

impl PipelineActivities {
    pub async fn run_pipeline(
        _pool: &DbPool,
        _input: PipelineInput,
    ) -> Result<PipelineExecution, String> {
        // TODO: Implement pipeline execution logic
        // This should load topology from story.jsonnet and execute
        Ok(PipelineExecution {
            ok: true,
            execution_id: None,
        })
    }

    pub async fn get_pipeline_topology(
        _pool: &DbPool,
    ) -> Result<PipelineTopology, String> {
        // TODO: Load from story.jsonnet
        todo!("Implement get_pipeline_topology")
    }
}

