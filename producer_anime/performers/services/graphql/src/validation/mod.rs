/**
 * Validation Module
 * SHACL バリデーション実装
 * 
 * @context {
 *   "@id": "ex:ValidationModule",
 *   "@type": "ex:Module",
 *   "ex:provides": "ex:SHACLValidation"
 * }
 */

pub mod shacl;

pub use shacl::{PropertyShape, ShaclShape};

