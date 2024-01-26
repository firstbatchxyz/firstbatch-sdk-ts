import {matrix, mean} from 'mathjs';
import type {DistanceMetric, Vector, QueryMetadata} from './types';

export type SingleQueryResult = {
  vector: Vector;
  metadata?: QueryMetadata;
  score: number;
  id: string;
};

// TODO: move to utils
export function applyThreshold(
  queries: SingleQueryResult[],
  threshold: number,
  distanceMetric: DistanceMetric
): SingleQueryResult[] {
  console.log(queries.map(({id, score}) => ({id, score})));
  const avg = mean(matrix(queries.map(q => q.score))) as number;
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
  batch_size: number;
  results: SingleQueryResult[][];

  constructor(batch_size: number, results: SingleQueryResult[][]) {
    this.batch_size = batch_size;
    this.results = results;
  }

  removeDuplicates() {
    // it is possible that there are no results
    if (this.results.length === 0) return;

    const ids = this.results.flat().map(r => r.id);
    const uniqueIds = new Set<string>(ids).keys();
    const idx: number[] = [];
    for (const uniqueId of uniqueIds) {
      idx.push(ids.indexOf(uniqueId));
    }

    this.results.forEach(result => {
      result = idx.map(i => result[i]);
    });
  }
}
