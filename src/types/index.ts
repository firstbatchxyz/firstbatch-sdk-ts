export type MetadataFilter = Record<string, any>;

export type QueryMetadata = Record<string, any>; // TODO: type

export type Signal = {label: string; weight: number};

export type QueryResult = {
  vector: Vector;
  metadata?: QueryMetadata;
  score: number;
  id: string;
};

export type AlgorithmType =
  | {
      type: 'SIMPLE';
    }
  | {
      type: 'CUSTOM';
      customId: string;
    }
  | {
      type: 'FACTORY';
      factoryId: string;
    };

export type Query = {
  embedding: Vector;
  top_k: number;
  top_k_mmr: number;
  filter: MetadataFilter;
  include_metadata: boolean;
  include_values: boolean;
};

/** A Deterministic Finite Automata. */
export type DFA = {
  signals?: Signal[];
  nodes: {
    name: string;
    batch_type: BatchType;
    params: Partial<VertexParameters>;
  }[];
  edges: {
    name: string;
    edge_type: 'BATCH' | 'DEFAULT' | (string & NonNullable<unknown>); // little trick to get auto-completed strings
    start: string;
    end: string;
  }[];
};

// TODO: name this something else? this type can be used by others too
export type WeightedVectors = {
  vectors: number[][];
  weights: number[];
};

export type QuantizationType = 'scalar' | 'product';

export type Vector = {
  id: string;
  vector: number[];
};

export type CompressedVector = {
  id: string;
  vector: number[];
  residual?: number[];
};

export type DistanceMetric = 'cosine_sim' | 'euclidean_dist' | 'dot_product';

export type FetchResult = {
  vector: Vector;
  metadata: QueryMetadata;
  id: string;
};

export type Edge = {
  name: string;
  signal: Signal;
  start: Vertex;
  end: Vertex;
};

export type BatchType = 'biased' | 'sampled' | 'random' | 'personalized';

export type VertexParameters = {
  mu: number;
  alpha: number;
  r: number;
  last_n: number;
  n_topics: number;
  remove_duplicates: boolean;
  apply_threshold: number;
  apply_mmr: boolean;
};

export type Vertex = {
  name: string;
  batchType: BatchType;
  params: VertexParameters;
};

/** Base class for lossy compression algorithms. */
export interface Quantizer {
  train(data: Vector[]): void;
  compress(data: Vector): CompressedVector;
  decompress(data: CompressedVector): Vector;
}

/** Configuration for the FirstBatch User Embeddings SDK. */
export type FirstBatchConfig = Partial<{
  batchSize: number;
  quantizerTrainSize: number;
  quantizerType: 'scalar' | 'product';
  enableHistory: boolean;
  verbose: boolean;
}>;
