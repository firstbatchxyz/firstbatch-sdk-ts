import type {DistanceMetric, QuantizerType, VertexParameters} from '../types';
import type library from './library';

export default {
  /** Endpoint to get region. */
  REGION_URL: 'https://idp.firstbatch.xyz/v1/teams/team/get-team-information',
  /** HollowDB regions, the field names are important. */
  REGIONS: {
    'us-east-1': 'https://aws-us-east-1.hollowdb.xyz/',
    'us-west-1': 'https://aws-us-west-1.hollowdb.xyz/',
    'eu-central-1': 'https://aws-eu-central-1.hollowdb.xyz/',
    'ap-southeast-1': 'https://aws-ap-southeast-1.hollowdb.xyz/',
  },
  // defaults
  DEFAULT_QUANTIZER_TRAIN_SIZE: 100,
  DEFAULT_QUANTIZER_TYPE: 'scalar' satisfies QuantizerType,
  DEFAULT_QUANTIZER_TOPK: 5,
  DEFAULT_EMBEDDING_LAST_N: 50,
  DEFAULT_EMBEDDING_SIZE: 1536,
  DEFAULT_DISTANCE_METRIC: 'cosine_sim' satisfies DistanceMetric,
  DEFAULT_CONFIDENCE_INTERVAL_RATIO: 0.15,
  DEFAULT_HISTORY_FIELD: 'id',
  DEFAULT_BATCH_SIZE: 10,
  DEFAULT_KEY: 'text',
  DEFAULT_ENABLE_HISTORY: false,
  DEFAULT_VERBOSE: false,
  DEFAULT_PARAMS: {
    mu: 0,
    alpha: 0,
    r: 0,
    last_n: 0,
    n_topics: 0,
    remove_duplicates: true,
    apply_threshold: 0,
    apply_mmr: false,
  } satisfies VertexParameters,
  // topK parameters
  MMR_TOPK_FACTOR: 2,
  MIN_TOPK: 5,
  MIN_TRAIN_SIZE: 500,
  // presets
  PRESET_ALGORITHMS: {
    UNIQUE_JOURNEYS: 'Unique_Journeys'.toUpperCase(),
    CONTENT_CURATION: 'User_Centric_Promoted_Content_Curations'.toUpperCase(),
    AI_AGENTS: 'User_Intent_AI_Agents'.toUpperCase(),
    RECOMMENDATIONS: 'Individually_Crafted_Recommendations'.toUpperCase(),
    NAVIGATION: 'Navigable_UX'.toUpperCase(),
  } satisfies Record<keyof typeof library, string>,
} as const;
