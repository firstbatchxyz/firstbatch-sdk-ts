import library from '../algorithm/blueprint/library';

const presetAlgorithms: Record<keyof typeof library, string> = {
  UNIQUE_JOURNEYS: 'Unique_Journeys'.toUpperCase(),
  CONTENT_CURATION: 'User_Centric_Promoted_Content_Curations'.toUpperCase(),
  AI_AGENTS: 'User_Intent_AI_Agents'.toUpperCase(),
  RECOMMENDATIONS: 'Individually_Crafted_Recommendations'.toUpperCase(),
  NAVIGATION: 'Navigable_UX'.toUpperCase(),
};

export default {
  // BASE_URL: 'http://0.0.0.0:8080/',
  BASE_URL: 'https://aws-eu-central-1.hollowdb.xyz/',
  DEFAULT_QUANTIZER_TRAIN_SIZE: 100,
  DEFAULT_QUANTIZER_TYPE: 'scalar',
  DEFAULT_EMBEDDING_LAST_N: 50,
  DEFAULT_EMBEDDING_SIZE: 1536,
  DEFAULT_CONFIDENCE_INTERVAL_RATIO: 0.15,
  DEFAULT_TYPESENSE_COLLECTION: 'my_collection',
  DEFAULT_BATCH_SIZE: 10,
  DEFAULT_KEY: 'text',
  DEFAULT_TOPK_QUANT: 5,
  DEFAULT_ENABLE_HISTORY: false,
  DEFAULT_VERBOSE: false,
  MMR_TOPK_FACTOR: 2,
  MIN_TOPK: 5,
  PRESET_ALGORITHMS: presetAlgorithms,
} as const;
