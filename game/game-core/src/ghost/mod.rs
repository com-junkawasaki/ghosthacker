/**
 * Ghost Module
 * ゴースト内部モデル
 */

pub mod state;
pub mod traits;
pub mod values;

pub use state::GhostState;
pub use traits::{GhostTrait, TraitType};
pub use values::{GhostValue, ValuePreference};

