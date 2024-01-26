import {maximalMarginalRelevance} from './utils';
import {BatchQueryResult, applyThreshold} from './query';
import type {BatchType, DistanceMetric, Query, QueryMetadata} from './types';

export function applyAlgorithm(
  batch: BatchQueryResult,
  queries: Query[],
  batchType: BatchType,
  options: {
    removeDuplicates: boolean;
    applyThreshold: number;
    applyMMR: boolean;
    // shuffle?: boolean; // enabled by default until further changes
    distanceMetric: DistanceMetric;
  }
): [string[], QueryMetadata[]] {
  // TODO: can we do this in a better way
  if (batchType === 'personalized') {
    batchType = 'random';
  }
  if (batch.results.length !== queries.length) {
    throw new Error('Number of results is not equal to number of queries');
  }

  // apply threshold to query results
  // not done for random batch
  if (batchType !== 'random' && options.applyThreshold) {
    batch.results = batch.results.map(r => {
      return applyThreshold(r, options.applyThreshold ?? 0, options.distanceMetric);
    });
  }

  // apply maximal marginal relevance
  // not done for biased batch
  if (batchType !== 'biased' && options.applyMMR) {
    batch.results = batch.results.map((r, i) =>
      // TODO: move 0.5 to constants
      maximalMarginalRelevance(queries[i].embedding, r, 0.5, queries[i].top_k_mmr)
    );
  }

  // filter duplicates
  if (options.removeDuplicates) {
    batch.removeDuplicates();
  }

  // sort w.r.t scores
  batch.results.forEach(result => {
    result.sort((a, b) => (a.score && b.score ? b.score - a.score : 1));
  });

  // get ids and metadata from each result, topK many
  let ids: string[] = [];
  let metadatas: QueryMetadata[] = [];
  batch.results.forEach((result, i) => {
    const k = queries[i].top_k;

    // FIXME: why do we have `undefined` here sometimes? we shouldnt have
    // to do this filtering everytime
    ids = ids.concat(
      result
        .slice(0, k)
        .map(r => r.id)
        .filter(r => r !== undefined)
    );
    metadatas = metadatas.concat(
      result
        .slice(0, k)
        .map(r => r.metadata)
        .filter(r => r !== undefined)
    );
  });

  // NOTE: this used to be optional, but we now have it on by default
  // shuffled indices via Schwartzian transform; works better for smaller arrays than Fisher-Yates
  const idx = Array.from({length: ids.length}, (_, i) => ({i, sort: Math.random()}))
    .sort((a, b) => a.sort - b.sort)
    .map(({i}) => i);

  ids = ids.map((_, i, self) => self[idx[i]]);
  metadatas = metadatas.map((_, i, self) => self[idx[i]]);

  return [ids, metadatas];
}
