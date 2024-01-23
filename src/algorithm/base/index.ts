import {maximalMarginalRelevance} from '../../vector/utils';
import {Blueprint, parseDFA} from '../blueprint';
import {BatchQueryResult, BatchQuery} from '../../vector';
import type {DFA, QueryMetadata} from '../../types';

export class BaseAlgorithm {
  blueprint: Blueprint;
  algorithmType: 'FACTORY' | 'CUSTOM' | 'SIMPLE';

  constructor(algorithmType: 'FACTORY' | 'CUSTOM' | 'SIMPLE', blueprint: DFA) {
    this.blueprint = parseDFA(blueprint);
    this.algorithmType = algorithmType;
  }

  applyAlgorithm(
    batch: BatchQueryResult,
    query: BatchQuery,
    batchSize: number,
    batchType: 'random' | 'biased' | 'sampled',
    options: {
      removeDuplicates?: boolean;
      applyThreshold?: number;
      applyMMR?: boolean;
      // shuffle?: boolean; // enabled by default until further changes
    }
  ): [string[], QueryMetadata[]] {
    if (batch.results.length !== query.queries.length) {
      throw new Error('Number of results is not equal to number of queries');
    }

    // apply threshold to query results
    // not done for random batch
    if (batchType !== 'random' && options.applyThreshold) {
      batch.results = batch.results.map(r => r.applyThreshold(options.applyThreshold ?? 0));
    }

    // apply maximal marginal relevance
    // not done for biased batch
    if (batchType !== 'biased' && options.applyMMR) {
      batch.results = batch.results.map((r, i) =>
        // TODO: move 0.5 to constants
        maximalMarginalRelevance(query.queries[i].embedding, r, 0.5, query.queries[i].top_k_mmr)
      );
    }

    // filter duplicates
    if (options.removeDuplicates) {
      batch.removeDuplicates();
    }

    // sort w.r.t scores & topK parameter
    batch.sort();

    // get ids and metadata from each result, topK many
    let ids: string[] = [];
    let metadata: QueryMetadata[] = [];
    batch.results.forEach((result, i) => {
      const k = query.queries[i].top_k;

      // FIXME: why do we have `undefined` here sometimes? we shouldnt have
      // to do this filtering everytime
      ids = ids.concat(result.ids.slice(0, k).filter(r => r !== undefined));
      metadata = metadata.concat(result.metadata.slice(0, k).filter(r => r !== undefined));
    });

    // NOTE: this used to be optional, but we now have it on by default
    // shuffled indices via Schwartzian transform; works better for smaller arrays than Fisher-Yates
    const idx = Array.from({length: ids.length}, (_, i) => ({i, sort: Math.random()}))
      .sort((a, b) => a.sort - b.sort)
      .map(({i}) => i);

    ids = ids.map((_, i, self) => self[idx[i]]);
    metadata = metadata.map((_, i, self) => self[idx[i]]);

    // finally, get batchSize many items for each
    // TODO: this happens outside as well
    ids = ids.slice(0, batchSize);
    metadata = metadata.slice(0, batchSize);
    return [ids, metadata];
  }
}
