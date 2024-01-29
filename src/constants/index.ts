import type {DistanceMetric, VertexParameters} from '../types';
import type library from '../algorithm/library';

export default {
  /** Default values. */
  DEFAULTS: {
    QUANTIZER_TRAIN_SIZE: 100,
    QUANTIZER_TYPE: 'scalar' satisfies 'scalar' | 'product',
    QUANTIZER_TOPK: 5,
    EMBEDDING_LAST_N: 50,
    EMBEDDING_SIZE: 1536,
    DISTANCE_METRIC: 'cosine_sim' satisfies DistanceMetric,
    CONFIDENCE_INTERVAL_RATIO: 0.15,
    HISTORY_FIELD: 'id',
    BATCH_SIZE: 10,
    KEY: 'text',
    ENABLE_HISTORY: false,
    VERBOSE: false,
    PARAMS: {
      mu: 0,
      alpha: 0,
      r: 0,
      last_n: 0,
      n_topics: 0,
      remove_duplicates: true,
      apply_threshold: 0,
      apply_mmr: false,
    } satisfies VertexParameters,
  },
  /** Factor applied to TOPK when MMR is to be applied. */
  MMR_TOPK_FACTOR: 2,
  MIN_TOPK: 5,
  MIN_TRAIN_SIZE: 500,
  /** Preset algorithm names. */
  PRESET_ALGORITHMS: {
    UNIQUE_JOURNEYS: 'Unique_Journeys'.toUpperCase(),
    CONTENT_CURATION: 'User_Centric_Promoted_Content_Curations'.toUpperCase(),
    AI_AGENTS: 'User_Intent_AI_Agents'.toUpperCase(),
    RECOMMENDATIONS: 'Individually_Crafted_Recommendations'.toUpperCase(),
    NAVIGATION: 'Navigable_UX'.toUpperCase(),
  } satisfies Record<keyof typeof library, string>,
} as const;
