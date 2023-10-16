// Add ENV types to Bun.env
declare module 'bun' {
  interface Env {
    // Pinecone
    PINECONE_API_KEY: string;
    /** TODO: We should remove this, and just use a single API key for tests. */
    PINECONE_API_KEY_ALT: string;
    PINECONE_ENV: string;
    PINECONE_CUSTOM_ID: string;
    // Weaviate
    WEAVIATE_API_KEY: string;
    WEAVIATE_HOST: string;
    // Typesense
    TYPESENSE_API_KEY: string;
    TYPESENSE_API_HOST: string;
    TYPESENSE_API_PORT: string;
    // FirstBatch
    FIRSTBATCH_API_KEY: string;
    // Miscellaneous
    /** Include this environment variable to enable verbose testing. */
    VERBOSE_TEST?: string;
  }
}
