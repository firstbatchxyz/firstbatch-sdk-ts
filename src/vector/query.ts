import {matrix, Matrix, mean} from 'mathjs';
import type {Query, DistanceMetric, Vector, QueryMetadata} from '../types';
import {generateVectors} from './utils';

export class QueryResult {
  vectors: Vector[];
  metadatas: QueryMetadata[];
  scores: number[];
  ids: string[];
  distanceMetric: DistanceMetric;

  constructor(args: {
    vectors?: Vector[];
    metadatas?: QueryMetadata[];
    scores?: number[];
    ids?: string[];
    distanceMetric?: DistanceMetric;
  }) {
    this.vectors = args.vectors || [];
    this.metadatas = args.metadatas || [];
    this.scores = args.scores || [];
    this.ids = args.ids || [];
    this.distanceMetric = args.distanceMetric || 'cosine_sim';
  }

  toNdArray(): Matrix {
    if (this.scores?.length === 0) {
      return new Matrix();
    }

    // Assuming each vector has a "vector" property containing an array of numbers
    if (!this.vectors) return new Matrix();
    return matrix(this.vectors.map(vec => vec.vector));
  }

  applyThreshold(threshold: number): QueryResult {
    if (!this.scores) return this;
    const flattenedScores: number[] = ([] as number[]).concat(...this.scores);
    const isSimilarity = this.distanceMetric !== 'euclidean_dist';
    const avg = mean(matrix(flattenedScores)) as number;

    // depending on the distance metric, we either have a distance (lower is better)
    // or a similarity (higher is better) so we must do the opposite if that is the case
    threshold = isSimilarity ? Math.min(threshold, avg) : Math.max(threshold, avg);
    const indicesToKeep = this.scores
      .map((s, i) => ({
        keep: isSimilarity
          ? s >= threshold // keep most similar ones
          : s <= threshold, // keep the shortest distance ones
        index: i,
      }))
      .filter(({keep}) => keep)
      .map(({index}) => index);

    return this.createFilteredResult(indicesToKeep);
  }

  /** Utility function to select values at the given indices. */
  private createFilteredResult(indices: number[]): QueryResult {
    return new QueryResult({
      vectors: indices.map(i => this.vectors.at(i)).filter((v): v is Vector => v !== undefined),
      metadatas: indices.map(i => this.metadatas.at(i)).filter((m): m is QueryMetadata => m !== undefined),
      scores: indices.map(i => this.scores.at(i)).filter((s): s is number => s !== undefined),
      ids: indices.map(i => this.ids.at(i)).filter((id): id is string => id !== undefined),
    });
  }

  /** Utility function to concatenate two query results. */
  concat(other: QueryResult): QueryResult {
    return new QueryResult({
      vectors: this.vectors.concat(other.vectors),
      metadatas: this.metadatas.concat(other.metadatas),
      scores: this.scores.concat(other.scores),
      ids: this.ids.concat(other.ids),
    });
  }
}

export function generateQuery(numVecs: number, dim: number, topK: number, includeValues: boolean): Query {
  return {
    embedding: generateVectors(dim, 1)[0],
    top_k: topK,
    top_k_mmr: Math.floor(topK / 2), // TODO: move this to constant,
    include_values: includeValues,
    filter: {},
    include_metadata: true,
  };
}

export class BatchQuery {
  batch_size: number = 1;
  queries: Query[] = [];
  constructor(queries: Query[], numVecs: number) {
    this.queries = queries;
    this.batch_size = numVecs;
  }
}

export class BatchQueryResult {
  batch_size: number = 1;
  results: QueryResult[] = [];

  constructor(batch_size: number, results: QueryResult[] = []) {
    this.batch_size = batch_size;
    this.results = results;
  }

  /**
   * Returns the `Vector` objects within the results.
   *
   * Does not modify the underlying results.
   */
  vectors(): Vector[] {
    return this.results.flatMap(result => result.vectors);
  }

  /**
   * Flattens an array of `QueryResult` objects into a single one.
   * Although this looks like the built-in `flat`, it calls the `concat` method
   * of the `QueryResult` object, not the built-in `concat`.
   *
   * Does not modify the underlying results.
   */
  flatten(): QueryResult {
    return this.results.reduce((acc, cur) => acc.concat(cur), new QueryResult({}));
  }

  /** Sorts the results with respect to the result scores. */
  sort(): void {
    this.results.forEach(result => {
      // sort by scores in reverse, and get the indices
      const idx = result.scores.sort((a, b) => b - a).map((_, i) => i);

      // sort everything else w.r.t these indices
      result.ids = result.ids.map((_, i, self) => self[idx[i]]);
      result.metadatas = result.metadatas.map((_, i, self) => self[idx[i]]);
      result.scores = result.scores.map((_, i, self) => self[idx[i]]);
      result.vectors = result.vectors.map((_, i, self) => self[idx[i]]);
    });
  }

  removeDuplicates() {
    // it is possible that there are no results
    if (this.results.length === 0) return;

    const flat = this.flatten();
    const uniqueIds = new Set<string>(flat.ids).keys();
    const idx: number[] = [];
    for (const uniqueId of uniqueIds) {
      idx.push(flat.ids.indexOf(uniqueId));
    }

    this.results.forEach(result => {
      result.ids = idx.map(i => result.ids[i]);
      result.metadatas = idx.map(i => result.metadatas[i]);
      result.scores = idx.map(i => result.scores[i]);
      result.vectors = idx.map(i => result.vectors[i]);
    });
  }
}

// TODO: instead of random_batch_request with defaults, have the defaults apply here?
export function generateBatch(numVecs: number, dim: number, topK: number, includeValues: boolean): BatchQuery {
  const queries = Array.from({length: numVecs}, () => generateQuery(numVecs, dim, topK, includeValues));
  return new BatchQuery(queries, numVecs);
}
