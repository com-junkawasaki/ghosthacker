/**
 * Game Core Library
 * コアゲームロジック（ゴースト内部モデル、因果パズル、セッション管理、数理モデル）
 * 
 * @context {
 *   "@id": "ex:GameCore",
 *   "@type": "ex:Library",
 *   "ex:provides": ["ex:GhostModel", "ex:PuzzleLogic", "ex:SessionManagement", "ex:MathModel"]
 * }
 */

pub mod ghost;
pub mod puzzle;
pub mod session;
pub mod math;

pub use ghost::{GhostState, GhostTrait, GhostValue};
pub use puzzle::{Timeline, Causality, Emotion};
pub use session::Session;
pub use math::update;

