//! Health check handler

use wasmcloud_component::http;

pub fn handle() -> http::Result<http::Response<String>> {
    Ok(http::Response::new("OK\n".to_string()))
}

