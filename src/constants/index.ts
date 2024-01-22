import library from '../algorithm/blueprint/library';

const presetAlgorithms: Record<Exclude<keyof typeof library, 'SIMPLE'>, string> = {
  UNIQUE_JOURNEYS: 'Unique_Journeys'.toUpperCase(),
  CONTENT_CURATION: 'User_Centric_Promoted_Content_Curations'.toUpperCase(),
  AI_AGENTS: 'User_Intent_AI_Agents'.toUpperCase(),
  RECOMMENDATIONS: 'Individually_Crafted_Recommendations'.toUpperCase(),
  NAVIGATION: 'Navigable_UX'.toUpperCase(),
};

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
  DEFAULT_QUANTIZER_TYPE: 'scalar',
  DEFAULT_EMBEDDING_LAST_N: 50,
  DEFAULT_EMBEDDING_SIZE: 1536,
  DEFAULT_DISTANCE_METRIC: 'cosine_sim',
  DEFAULT_CONFIDENCE_INTERVAL_RATIO: 0.15,
  DEFAULT_TYPESENSE_COLLECTION: 'my_collection',
  DEFAULT_TYPESENSE_HISTORY_FIELD: '_id',
  DEFAULT_WEAVIATE_CLASS_NAME: 'my_collection',
  DEFAULT_SUPABASE_COLLECTION: 'documents',
  DEFAULT_SUPABASE_QUERY_NAME: 'match_documents',
  DEFAULT_HISTORY_FIELD: 'id',
  DEFAULT_BATCH_SIZE: 10,
  DEFAULT_KEY: 'text',
  DEFAULT_TOPK_QUANT: 5,
  DEFAULT_ENABLE_HISTORY: false,
  DEFAULT_VERBOSE: false,
  MINIMUM_TRAIN_SIZE: 500,
  // topK parameters
  MMR_TOPK_FACTOR: 2,
  MIN_TOPK: 5,
  // presets
  PRESET_ALGORITHMS: presetAlgorithms,
} as const;
