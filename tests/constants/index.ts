export default {
  PINECONE: {
    API_KEY: Bun.env.PINECONE_API_KEY,
    API_KEY_ALT: Bun.env.PINECONE_API_KEY_ALT,
    ENV: Bun.env.PINECONE_ENV,
    INDEX: {
      RSS: 'rss',
      FARCASTER: 'farcaster',
    },
    CUSTOM_ID: Bun.env.PINECONE_CUSTOM_ID,
  },
  WEAVIATE: {
    API_KEY: Bun.env.WEAVIATE_API_KEY,
    HOST: Bun.env.WEAVIATE_HOST,
    SCHEME: 'https',
    INDEX: {
      FARCASTER: 'Farcaster',
    },
  },
  FIRSTBATCH: {
    API_KEY: Bun.env.FIRSTBATCH_API_KEY,
  },
  TYPESENSE: {
    API_KEY: Bun.env.TYPESENSE_API_KEY,
    API_HOST: Bun.env.TYPESENSE_API_HOST,
    API_PORT: parseInt(Bun.env.TYPESENSE_API_PORT),
    PROTOCOL: 'http',
  },
} as const;
