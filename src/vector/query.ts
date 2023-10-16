import {matrix, Matrix, mean} from 'mathjs';
import {MetadataFilter, QueryMetadata} from './metadata';
import type {DistanceMetric, SearchType, Vector} from './types';
import {generateVectors} from './utils';

export class Query {
  embedding: Vector;
  top_k: number;
  top_k_mmr: number;
  return_fields?: string[] = [];
  search_type: SearchType = 'default';
  filter: MetadataFilter;
  include_metadata: boolean = true;
  include_values: boolean = true;

  // TODO: currently only used by postgres hybrid search, can be removed?
  sparse_top_k?: number;

  constructor(vec: Vector, topK: number, includeValues: boolean, filter?: MetadataFilter) {
    this.embedding = vec;
    this.top_k = topK;
    this.top_k_mmr = topK; // defaults to topK
    this.include_values = includeValues;
    this.filter = filter || MetadataFilter.default();
  }
}

export class QueryResult {
  vectors: Vector[];
  metadata: QueryMetadata[];
  scores: number[];
  ids: string[];
  distanceMetric: DistanceMetric;

  constructor(args: {
    vectors?: Vector[];
    metadata?: QueryMetadata[];
    scores?: number[];
    ids?: string[];
    distanceMetric?: DistanceMetric;
  }) {
    this.vectors = args.vectors || [];
    this.metadata = args.metadata || [];
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
      metadata: indices.map(i => this.metadata.at(i)).filter((m): m is QueryMetadata => m !== undefined),
      scores: indices.map(i => this.scores.at(i)).filter((s): s is number => s !== undefined),
      ids: indices.map(i => this.ids.at(i)).filter((id): id is string => id !== undefined),
    });
  }

  /** Utility function to concatenate two query results. */
  concat(other: QueryResult): QueryResult {
    return new QueryResult({
      vectors: this.vectors.concat(other.vectors),
      metadata: this.metadata.concat(other.metadata),
      scores: this.scores.concat(other.scores),
      ids: this.ids.concat(other.ids),
    });
  }
}

// Generate an iterable of Query objects.
export function* generateQuery(numVecs: number, dim: number, topK: number, includeValues: boolean): Generator<Query> {
  for (const vec of generateVectors(dim, numVecs)) {
    const query = new Query(vec, topK, includeValues);
    query.top_k_mmr = Math.floor(topK / 2); // TODO: move this to constant
    yield query;
  }
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

  vectors(): Vector[] {
    return this.results.flatMap(result => result.vectors);
  }

  flatten(): QueryResult {
    let flattenedResult: QueryResult = this.results[0];
    for (let i = 1; i < this.results.length; i++) {
      flattenedResult = flattenedResult.concat(this.results[i]);
    }
    return flattenedResult;
  }

  sort() {
    this.results.forEach(result => {
      // sort by scores in reverse, and get the indices
      const idx = result.scores.sort((a, b) => b - a).map((_, i) => i);

      // sort everything else w.r.t these indices
      result.ids = result.ids.map((_, i, self) => self[idx[i]]);
      result.metadata = result.metadata.map((_, i, self) => self[idx[i]]);
      result.scores = result.scores.map((_, i, self) => self[idx[i]]);
      result.vectors = result.vectors.map((_, i, self) => self[idx[i]]);
    });
  }

  removeDuplicates() {
    const flat = this.flatten();
    const uniqueIds = new Set<string>(flat.ids).keys();
    const idx: number[] = [];
    for (const uniqueId of uniqueIds) {
      idx.push(flat.ids.indexOf(uniqueId));
    }

    this.results.forEach(result => {
      result.ids = idx.map(i => result.ids[i]);
      result.metadata = idx.map(i => result.metadata[i]);
      result.scores = idx.map(i => result.scores[i]);
      result.vectors = idx.map(i => result.vectors[i]);
    });
  }
}

/** Generate a BatchQuery object containing a batch of Query objects. */
// TODO: instead of random_batch_request with defaults, have the defaults apply here?
export function generateBatch(numVecs: number, dim: number, topK: number, includeValues: boolean): BatchQuery {
  const queries = [...generateQuery(numVecs, dim, topK, includeValues)];
  return new BatchQuery(queries, numVecs);
}
