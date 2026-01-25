/**
 * Update Rules
 * ゴースト状態の更新ルール
 * 
 * @context {
 *   "@id": "ex:UpdateRules",
 *   "@type": "ex:Function",
 *   "ex:implements": "ex:GhostStateUpdate"
 * }
 */

use crate::ghost::GhostState;
use crate::puzzle::{Causality, Emotion, Timeline};

/// 更新パラメータ（α, β, γ, δ, λ）
#[derive(Debug, Clone)]
pub struct UpdateParams {
    pub alpha_t: f32,  // 時系列修正の係数
    pub beta_t: f32,   // 時系列修正のノイズ減衰係数
    pub alpha_c: f32,  // 因果修正の係数
    pub beta_c: f32,   // 因果修正のノイズ減衰係数
    pub gamma_c: f32,  // 因果修正の真実性係数
    pub alpha_e: f32,  // 感情修正の係数
    pub gamma_e: f32,  // 感情修正の一貫性係数
    pub delta_c: f32,  // 矛盾検出の一貫性減衰係数
    pub delta_n: f32,  // 矛盾検出のノイズ増加係数
    pub lambda_m: f32, // 記憶整合性の緩和係数
    pub lambda_n: f32, // ノイズの緩和係数
}

impl Default for UpdateParams {
    fn default() -> Self {
        Self {
            alpha_t: 0.1,
            beta_t: 0.05,
            alpha_c: 0.15,
            beta_c: 0.08,
            gamma_c: 0.12,
            alpha_e: 0.1,
            gamma_e: 0.1,
            delta_c: 0.2,
            delta_n: 0.15,
            lambda_m: 0.05,
            lambda_n: 0.03,
        }
    }
}

/// 時系列修正時の更新
pub fn update_timeline_correction(
    state: &mut GhostState,
    timeline: &Timeline,
    params: &UpdateParams,
) {
    let total_fragments = timeline.fragments.len();
    if total_fragments == 0 {
        return;
    }

    let k_time = timeline.corrected_count();
    let ratio = k_time as f32 / total_fragments as f32;

    // Δmemory_integrity = α_t * (k_time / N) * (1 - memory_integrity)
    state.memory_integrity += params.alpha_t * ratio * (1.0 - state.memory_integrity);

    // Δnoise = -β_t * (k_time / N) * noise
    state.noise -= params.beta_t * ratio * state.noise;

    // 値をクランプ
    state.memory_integrity = state.memory_integrity.clamp(0.0, 1.0);
    state.noise = state.noise.clamp(0.0, 1.0);
}

/// 因果関係修正時の更新
pub fn update_causality_correction(
    state: &mut GhostState,
    causality: &Causality,
    params: &UpdateParams,
) {
    let total_links = causality.links.len();
    if total_links == 0 {
        return;
    }

    let k_cause = causality.correct_link_count();
    let ratio = k_cause as f32 / total_links as f32;

    // Δcoherence = α_c * (k_cause / M) * (1 - coherence)
    state.coherence += params.alpha_c * ratio * (1.0 - state.coherence);

    // Δtruth = γ_c * (k_cause / M) * (1 - truth)
    state.truth += params.gamma_c * ratio * (1.0 - state.truth);

    // Δnoise = -β_c * (k_cause / M) * noise
    state.noise -= params.beta_c * ratio * state.noise;

    // 値をクランプ
    state.coherence = state.coherence.clamp(0.0, 1.0);
    state.truth = state.truth.clamp(0.0, 1.0);
    state.noise = state.noise.clamp(0.0, 1.0);
}

/// 感情ラベル修正時の更新
pub fn update_emotion_correction(
    state: &mut GhostState,
    emotion: &Emotion,
    params: &UpdateParams,
) {
    let total_labels = emotion.labels.len();
    if total_labels == 0 {
        return;
    }

    let k_em = emotion.corrected_count();
    let ratio = k_em as f32 / total_labels as f32;

    // Δemotion_distortion = -α_e * (k_em / L) * emotion_distortion
    state.emotion_distortion -= params.alpha_e * ratio * state.emotion_distortion;

    // Δcoherence = γ_e * (k_em / L) * (1 - coherence)
    state.coherence += params.gamma_e * ratio * (1.0 - state.coherence);

    // 値をクランプ
    state.emotion_distortion = state.emotion_distortion.clamp(0.0, 1.0);
    state.coherence = state.coherence.clamp(0.0, 1.0);
}

/// 矛盾検出時の更新
pub fn update_contradiction(
    state: &mut GhostState,
    contradiction_level: f32, // m_incoh ∈ [0, 1]
    params: &UpdateParams,
) {
    let m_incoh = contradiction_level.clamp(0.0, 1.0);

    // Δcoherence = -δ_c * m_incoh * coherence
    state.coherence -= params.delta_c * m_incoh * state.coherence;

    // Δnoise = +δ_n * m_incoh * (1 - noise)
    state.noise += params.delta_n * m_incoh * (1.0 - state.noise);

    // 値をクランプ
    state.coherence = state.coherence.clamp(0.0, 1.0);
    state.noise = state.noise.clamp(0.0, 1.0);
}

/// セッション終了時の緩和項（自然安定化）
pub fn apply_relaxation(
    state: &mut GhostState,
    target_memory_integrity: f32,
    target_noise: f32,
    params: &UpdateParams,
) {
    // memory_integrity ← memory_integrity + λ_m * (target_m - memory_integrity)
    state.memory_integrity +=
        params.lambda_m * (target_memory_integrity - state.memory_integrity);

    // noise ← noise + λ_n * (target_n - noise)
    state.noise += params.lambda_n * (target_noise - state.noise);

    // 値をクランプ
    state.memory_integrity = state.memory_integrity.clamp(0.0, 1.0);
    state.noise = state.noise.clamp(0.0, 1.0);
}

