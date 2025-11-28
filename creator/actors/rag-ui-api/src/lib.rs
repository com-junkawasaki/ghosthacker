//! wasmCloud Component for Unified IR Pipeline UI API
//! 
//! REST API for the unified IR (Symbolic + Graph + Vector) pipeline UI

use wasmcloud_component::http;
use serde::{Deserialize, Serialize};

mod handlers;
mod models;

use handlers::*;

struct Component;

http::export!(Component);

impl http::Server for Component {
    fn handle(
        request: http::IncomingRequest,
    ) -> http::Result<http::Response<impl http::OutgoingBody>> {
        // For now, return a simple response
        // TODO: Implement proper path extraction and routing
        // when wasmcloud-component API is clarified
        Ok(http::Response::new("RAG UI API\n"))
    }
}

