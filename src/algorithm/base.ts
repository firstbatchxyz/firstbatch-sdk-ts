import constants from '../constants';
import {maximalMarginalRelevance} from '../vector/utils';
import {DFAParser, UserAction, Blueprint} from './blueprint';
import {BatchQueryResult, BatchQuery, BatchOptions, QueryMetadata} from '../vector';

export class BaseAlgorithm {
  protected blueprint: Blueprint;
  protected includeValues: boolean;
  type: 'FACTORY' | 'CUSTOM' | 'SIMPLE';
  isCustom = false;
  batchSize: number;
  embeddingSize: number;

  constructor(
    label: string,
    batchSize: number,
    args: {
      blueprint: string | object;
      batchSize?: number;
      embeddingSize?: number;
      includeValues?: boolean;
    }
  ) {
    label = label.toUpperCase();
    this.batchSize = batchSize;

    this.blueprint = new DFAParser(args.blueprint).parse();
    this.embeddingSize = args.embeddingSize || constants.DEFAULT_EMBEDDING_SIZE;
    this.includeValues = args.includeValues || true;
    this.type = label === 'CUSTOM' || label === 'SIMPLE' ? label : 'FACTORY';
    this.isCustom = this.type === 'CUSTOM';
  }

  /** A random batch, will delete `applyThreshold` from `options` if given. */
  randomBatch(batch: BatchQueryResult, query: BatchQuery, batchSize: number, options: BatchOptions) {
    delete options.applyThreshold;
    return BaseAlgorithm.applyParams(batch, query, batchSize, options);
  }

  /** A biased batch, will delete `applyMMR` from `options` if given. */
  biasedBatch(batch: BatchQueryResult, query: BatchQuery, batchSize: number, options: BatchOptions) {
    delete options.applyMMR;
    return BaseAlgorithm.applyParams(batch, query, batchSize, options);
  }

  /** A sampled batch. */
  sampledBatch(batch: BatchQueryResult, query: BatchQuery, batchSize: number, options: BatchOptions) {
    return BaseAlgorithm.applyParams(batch, query, batchSize, options);
  }

  private static applyParams(
    batch: BatchQueryResult,
    query: BatchQuery,
    batchSize: number,
    options: BatchOptions
  ): [string[], QueryMetadata[]] {
    if (batch.results.length !== query.queries.length) {
      throw new Error('Number of results is not equal to number of queries');
    }

    // apply threshold to query results if needed
    if (options.applyThreshold) {
      batch.results = batch.results.map(r => r.applyThreshold(options.applyThreshold ?? 0));
    }

    // apply maximal marginal relevance
    if (options.applyMMR) {
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
    // shuffled indices via Schwartzian transform
    // works better for smaller arrays than Fisher-Yates
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

  blueprintStep(state: string, action: UserAction) {
    return this.blueprint.step(state, action);
  }
}
