export default {
  PINECONE: {
    API_KEY: process.env.PINECONE_API_KEY as string,
    API_KEY_ALT: process.env.PINECONE_API_KEY_ALT as string,
    ENV: process.env.PINECONE_ENV as string,
    INDEX: {
      RSS: 'rss',
      FARCASTER: 'farcaster',
    },
    CUSTOM_ID: process.env.PINECONE_CUSTOM_ID as string,
  },
  WEAVIATE: {
    API_KEY: process.env.WEAVIATE_API_KEY as string,
    HOST: process.env.WEAVIATE_HOST as string,
    SCHEME: 'https',
    CLASS_NAME: {
      FARCASTER: 'Farcaster',
    },
  },
  FIRSTBATCH: {
    API_KEY: process.env.FIRSTBATCH_API_KEY as string,
  },
  TYPESENSE: {
    API_KEY: process.env.TYPESENSE_API_KEY as string,
    API_HOST: process.env.TYPESENSE_API_HOST as string,
    API_PORT: parseInt(process.env.TYPESENSE_API_PORT as string),
    PROTOCOL: 'http',
  },
  SUPABASE: {
    URL: process.env.SUPABASE_URL as string,
    KEY: process.env.SUPABASE_KEY as string,
  },
} as const;
