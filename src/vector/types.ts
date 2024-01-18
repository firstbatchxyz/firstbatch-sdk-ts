import {QueryMetadata} from './metadata';

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

export type BatchOptions = {
  removeDuplicates?: boolean;
  applyThreshold?: number;
  applyMMR?: boolean;
  // shuffle?: boolean; // enabled by default until further changes
};

export type FetchResult = {
  vector: Vector;
  metadata: QueryMetadata;
  id: string;
};
