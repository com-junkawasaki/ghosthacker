/**
 * WASM Binding
 * WebAssemblyバインディング
 * 
 * @context {
 *   "@id": "ex:GameWASM",
 *   "@type": "ex:Binding",
 *   "ex:target": "ex:WASM"
 * }
 */

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

// TODO: WASMバインディングを実装

