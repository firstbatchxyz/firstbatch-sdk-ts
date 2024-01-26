import {matrix, mean} from 'mathjs';
import type {DistanceMetric, Vector, QueryMetadata} from './types';

export class QueryResult {
  vectors: Vector[];
  metadatas: QueryMetadata[];
  scores: number[];
  ids: string[];

  constructor(args: {vectors?: Vector[]; metadatas?: QueryMetadata[]; scores?: number[]; ids?: string[]}) {
    this.vectors = args.vectors || [];
    this.metadatas = args.metadatas || [];
    this.scores = args.scores || [];
    this.ids = args.ids || [];
  }

  applyThreshold(threshold: number, distanceMetric: DistanceMetric): QueryResult {
    if (!this.scores) return this;
    const flattenedScores: number[] = ([] as number[]).concat(...this.scores);
    const isSimilarity = distanceMetric !== 'euclidean_dist';
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

    return new QueryResult({
      vectors: indicesToKeep.map(i => this.vectors.at(i)).filter((v): v is Vector => v !== undefined),
      metadatas: indicesToKeep.map(i => this.metadatas.at(i)).filter((m): m is QueryMetadata => m !== undefined),
      scores: indicesToKeep.map(i => this.scores.at(i)).filter((s): s is number => s !== undefined),
      ids: indicesToKeep.map(i => this.ids.at(i)).filter((id): id is string => id !== undefined),
    });
  }
}

export type SingleQueryResult = {
  vector: Vector;
  metadata?: QueryMetadata;
  score?: number;
  id: string;
};

function _applyThreshold(
  queries: SingleQueryResult[],
  threshold: number,
  distanceMetric: DistanceMetric
): SingleQueryResult[] {
  if (queries.some(q => q.score === undefined)) {
    return queries;
  }
  const scores: number[] = queries.map(q => q.score as number);
  const avg = mean(matrix(scores)) as number;

  if (distanceMetric !== 'euclidean_dist') {
    // this is a similarity metric, threshold should be lower than the score
    // i.e. we keep the scores higher than the threshold
    threshold = Math.min(threshold, avg);
    return queries.filter(q => q.score! >= threshold);
  } else {
    // this is a distance metric, threshold should be higher than the score
    // i.e. we keep the scores lower than the threshold
    threshold = Math.max(threshold, avg);
    return queries.filter(q => q.score! <= threshold);
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
    return this.results.reduce(
      (acc, cur) =>
        new QueryResult({
          vectors: acc.vectors.concat(cur.vectors),
          metadatas: acc.metadatas.concat(cur.metadatas),
          scores: acc.scores.concat(cur.scores),
          ids: acc.ids.concat(cur.ids),
        })
    );
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
