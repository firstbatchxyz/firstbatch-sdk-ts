import {ParamsInterface, Vertex} from '../algorithm';
import {QueryMetadata} from '../vector';

export type Signal = {label: string; weight: number};

/** A Deterministic Finite Automata. */
export type DFA = {
  signals?: Signal[];
  nodes: {
    name: string;
    batch_type: Vertex['batchType'];
    params: Partial<ParamsInterface>;
  }[];
  edges: {
    name: string;
    edge_type: Signal['label'];
    start: string;
    end: string;
  }[];
};

export type APIResponse<T> = {
  success: boolean;
  code: number;
  data: T;
  message?: string;
};

// TODO: name this something else? this type can be used by others too
export type BatchResponse = {
  vectors: number[][];
  weights: number[];
};

export interface Vector {
  id: string;
  vector: number[];
}

export interface CompressedVector {
  id: string;
  vector: number[];
  residual?: number[];
}

export type DistanceMetric = 'cosine_sim' | 'euclidean_dist' | 'dot_product';

export type SearchType = 'default' | 'sparse' | 'fetch';

export type FetchResult = {
  vector: Vector;
  metadata: QueryMetadata;
  id: string;
};
