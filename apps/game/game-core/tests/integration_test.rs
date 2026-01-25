/**
 * Integration Tests
 * 統合テスト
 */

use game_core::ghost::GhostState;
use game_core::math::update::*;
use game_core::puzzle::timeline::{Timeline, EventFragment};
use game_core::puzzle::causality::{Causality, CausalLink};
use game_core::puzzle::emotion::{Emotion, EmotionLabel, EmotionType};
use uuid::Uuid;

#[test]
fn test_ghost_state_update_timeline() {
    let mut state = GhostState::new(0.5, 0.5, 0.3, 0.7, 0.6);
    let fragments = vec![
        EventFragment {
            id: Uuid::new_v4(),
            content: "Event 1".to_string(),
            timestamp: Some(1),
        },
        EventFragment {
            id: Uuid::new_v4(),
            content: "Event 2".to_string(),
            timestamp: Some(2),
        },
    ];
    let timeline = Timeline::new(fragments);
    let params = UpdateParams::default();
    
    update_timeline_correction(&mut state, &timeline, &params);
    
    assert!(state.memory_integrity > 0.3);
    assert!(state.noise < 0.7);
}

#[test]
fn test_ghost_state_update_causality() {
    let mut state = GhostState::new(0.4, 0.3, 0.5, 0.6, 0.5);
    let event1 = Uuid::new_v4();
    let event2 = Uuid::new_v4();
    let links = vec![
        CausalLink {
            id: Uuid::new_v4(),
            from: event1,
            to: event2,
            is_correct: true,
        },
    ];
    let causality = Causality::new(links);
    let params = UpdateParams::default();
    
    update_causality_correction(&mut state, &causality, &params);
    
    assert!(state.coherence > 0.3);
    assert!(state.truth > 0.4);
}

#[test]
fn test_ghost_state_update_emotion() {
    let mut state = GhostState::new(0.5, 0.4, 0.5, 0.5, 0.7);
    let event_id = Uuid::new_v4();
    let labels = vec![
        EmotionLabel {
            event_id,
            emotion: EmotionType::Joy,
            intensity: 0.8,
            is_correct: true,
        },
    ];
    let emotion = Emotion::new(labels);
    let params = UpdateParams::default();
    
    update_emotion_correction(&mut state, &emotion, &params);
    
    assert!(state.emotion_distortion < 0.7);
    assert!(state.coherence > 0.4);
}

#[test]
fn test_ghost_state_stability() {
    let state = GhostState::new(0.8, 0.85, 0.9, 0.2, 0.15);
    assert!(state.is_stable(0.8));
}

