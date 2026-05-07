/**
 * Per-checkpoint generation defaults so each anime SDXL variant runs with the
 * sampler / scheduler / CFG / steps it was tuned for, plus prompt scaffolding
 * (Pony score tags) and architecture handling (NoobAI v-prediction).
 *
 * Override any of these via API request body fields.
 */
export interface CheckpointConfig {
	steps: number;
	cfg: number;
	sampler: string;
	scheduler: string;
	/** Tags prepended to the positive prompt (Pony / score-tag families). */
	positivePrefix?: string;
	/** Tags appended to the negative prompt. */
	negativeAppend?: string;
	/** True for v-prediction models (NoobAI Vpred). Adds ModelSamplingDiscrete. */
	isVpred?: boolean;
	/** For documentation / UI grouping. */
	family: 'animagine' | 'illustrious' | 'pony' | 'sdxl';
}

export const CHECKPOINT_CONFIG: Record<string, CheckpointConfig> = {
	'animagine-xl-4.0.safetensors': {
		steps: 28, cfg: 5, sampler: 'euler_ancestral', scheduler: 'karras', family: 'animagine'
	},
	'animagine-xl-3.1.safetensors': {
		steps: 28, cfg: 5, sampler: 'euler_ancestral', scheduler: 'karras', family: 'animagine'
	},
	'aamXL_AnyMix_v10.safetensors': {
		steps: 25, cfg: 6, sampler: 'dpmpp_2m', scheduler: 'karras', family: 'sdxl'
	},
	'BAXL_v3.safetensors': {
		steps: 28, cfg: 6, sampler: 'euler_ancestral', scheduler: 'karras', family: 'animagine'
	},
	'hassakuXL_Illustrious_v34.safetensors': {
		steps: 28, cfg: 5, sampler: 'euler_ancestral', scheduler: 'normal', family: 'illustrious'
	},
	'manmaruMixNoob.safetensors': {
		steps: 28, cfg: 5, sampler: 'euler_ancestral', scheduler: 'normal', family: 'illustrious'
	},
	'eponaMix_v3.safetensors': {
		steps: 25, cfg: 7, sampler: 'dpmpp_2m_sde', scheduler: 'karras', family: 'pony',
		positivePrefix: 'score_9, score_8_up, score_7_up, source_anime, ',
		negativeAppend: ', score_4, score_3, score_2, score_1, source_furry, source_pony, source_cartoon'
	},
	'anythingXL.safetensors': {
		steps: 25, cfg: 6, sampler: 'euler_ancestral', scheduler: 'karras', family: 'sdxl'
	},
	'noobaiXL_Vpred10.safetensors': {
		steps: 28, cfg: 5, sampler: 'euler_ancestral', scheduler: 'normal', family: 'illustrious',
		isVpred: true
	}
};

const DEFAULT: CheckpointConfig = {
	steps: 25, cfg: 6, sampler: 'euler_ancestral', scheduler: 'karras', family: 'sdxl'
};

export function getCheckpointConfig(name?: string): CheckpointConfig {
	if (!name) return DEFAULT;
	return CHECKPOINT_CONFIG[name] ?? DEFAULT;
}
