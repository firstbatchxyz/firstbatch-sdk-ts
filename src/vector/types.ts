export interface Vector {
  id: string;
  vector: number[];
  dim: number;
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
  applyThreshold?: number | [boolean, number];
  applyMMR?: boolean;
  // shuffle?: boolean; // enabled by default until further changes
};
