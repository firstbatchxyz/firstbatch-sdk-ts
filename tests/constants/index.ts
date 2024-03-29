export default {
  FIRSTBATCH: {
    API_KEY: process.env.FIRSTBATCH_API_KEY as string,
  },
  PINECONE: {
    API_KEY: process.env.PINECONE_API_KEY as string,
    ENV: process.env.PINECONE_ENV as string,
    INDEX: {
      RSS: 'rss-2',
      FARCASTER: 'farcaster',
    },
    CUSTOM_ID: process.env.PINECONE_CUSTOM_ID as string,
    EMBEDDING_SIZE: 384,
  },
  WEAVIATE: {
    API_KEY: process.env.WEAVIATE_API_KEY as string,
    HOST: process.env.WEAVIATE_HOST as string,
    SCHEME: 'https',
    CLASS_NAME: {
      FARCASTER: 'Farcaster',
    },
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
