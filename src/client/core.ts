import {Logger, getLogger} from 'loglevel';
import {BaseAlgorithm, SimpleAlgorithm, CustomAlgorithm, FactoryAlgorithm} from '../algorithm';
import {FirstBatchClient} from './client';
import constants from '../constants';
import type {FirstBatchConfig} from '../config';
// import {ProductQuantizer} from '../lossy/product';
import {ScalarQuantizer} from '../lossy/scalar';
import {VectorStore} from '../vector/integrations/base';
import {adjustWeights} from '../vector/utils';
import {BatchResponse} from './types';
import {generateBatch, MetadataFilter, Query, QueryMetadata, FetchQuery, BatchQuery} from '../vector';
import {UserAction} from '../algorithm/blueprint/action';

export class FirstBatch extends FirstBatchClient {
  readonly embeddingSize: number;
  readonly batchSize: number;
  readonly quantizerTrainSize: number;
  readonly quantizerType: 'scalar' | 'product';
  readonly enableHistory: boolean;
  readonly store: Record<string, VectorStore>;
  readonly verbose: boolean;
  logger: Logger = getLogger('FirstBatchLogger');

  constructor(apiKey: string, config?: Partial<FirstBatchConfig>) {
    super(apiKey);
    this.store = {};
    this.embeddingSize = config?.embeddingSize || constants.DEFAULT_EMBEDDING_SIZE;
    this.batchSize = config?.batchSize || constants.DEFAULT_BATCH_SIZE;
    this.quantizerTrainSize = config?.quantizerTrainSize || constants.DEFAULT_QUANTIZER_TRAIN_SIZE;
    this.quantizerType = config?.quantizerType || constants.DEFAULT_QUANTIZER_TYPE;
    this.enableHistory = config?.enableHistory || constants.DEFAULT_ENABLE_HISTORY;
    this.verbose = config?.verbose || constants.DEFAULT_VERBOSE;

    // setup logger
    if (this.verbose !== undefined) {
      this.logger.setLevel(this.verbose ? 'DEBUG' : 'WARN');
      this.logger.debug('Verbose mode enabled.');
    } else {
      this.logger.setLevel('ERROR');
    }

    if (this.quantizerType === 'product') {
      this.logger.warn("Product quantization not yet supported, defaulting to 'scalar'");
      this.quantizerType = 'scalar';
    }
  }

  /** Add a vector store to the container. */
  async addVdb(vdbid: string, vectorStore: VectorStore, embeddingSize?: number) {
    const exists = await this.vdbExists(vdbid);
    embeddingSize = embeddingSize || this.embeddingSize;
    // TODO: THIS IS DANGEROUS, it is a side effect on VS and may cause problems
    vectorStore.embeddingSize = embeddingSize;

    if (exists) {
      this.store[vdbid] = vectorStore;
    } else {
      this.logger.debug(`VectorDB with id ${vdbid} not found, sketching a new VectorDB.`);
      if (this.quantizerType === 'scalar') {
        // TODO: THIS IS DANGEROUS, it is a side effect on vector store and may cause problems
        vectorStore.quantizer = new ScalarQuantizer(256);

        const trainSize = Math.min(Math.floor(this.quantizerTrainSize / constants.DEFAULT_TOPK_QUANT), 500);
        const batch = generateBatch(trainSize, embeddingSize, constants.DEFAULT_TOPK_QUANT, true);

        const results = await vectorStore.multiSearch(batch);
        vectorStore.trainQuantizer(results.vectors());

        const quantizedVectors = results.vectors().map(v => vectorStore.quantizeVector(v).vector);

        this.logger.debug('Initializing with scalar quantizer, might take some time...');
        await this.initVectordbScalar(vdbid, quantizedVectors, (vectorStore.quantizer as ScalarQuantizer).quantiles);

        this.store[vdbid] = vectorStore;
      } else if (this.quantizerType === 'product') {
        throw new Error('Product quantization is not supported yet');
      } else {
        this.quantizerType satisfies never;
        throw new Error('Invalid quantizer type: ' + this.quantizerType);
      }
    }
  }

  async userEmbeddings(sessionId: string) {
    return super.getUserEmbeddings(sessionId);
  }

  // TODO: this is not used
  protected async getState(sessionId: string) {
    return await this.getSession(sessionId);
  }

  async session(
    algorithm: keyof typeof constants.PRESET_ALGORITHMS | 'SIMPLE' | 'CUSTOM',
    vdbid: string,
    options?: {sessionId?: string; customId?: string}
  ) {
    // if algorithm label is non-standard, the label is factory and factoryId is the algorithm name
    const label = ['SIMPLE', 'CUSTOM'].includes(algorithm) ? algorithm : 'FACTORY';

    return await this.createSession(label, vdbid, {
      id: options?.sessionId,
      customId: label == 'CUSTOM' ? options?.customId : undefined,
      factoryId: label == 'FACTORY' ? algorithm : undefined,
    });
  }

  async addSignal(sessionId: string, userAction: UserAction, cid: string) {
    const response = await this.getSession(sessionId);
    const vectorStore = this.store[response.vdbid];

    const query = new FetchQuery(cid);
    const result = await this.store[response.vdbid].fetch(query);

    const algoInstance = await this.getAlgorithm(vectorStore.embeddingSize, this.batchSize, response.algorithm, {
      factoryId: response.factory_id,
      customId: response.custom_id,
    });

    const [nextState] = algoInstance.blueprintStep(response.state, userAction);

    const resp = await this.signal({
      sessionId,
      stateName: nextState.name,
      signal: userAction.actionType.weight,
      vector: result.vector.vector,
    });

    if (this.enableHistory) {
      await this.addHistory(sessionId, [cid]);
    }

    return resp.success;
  }

  async batch(
    sessionId: string,
    batchSize?: number,
    options?: {
      biasVectors?: number[][];
      biasWeights?: number[];
    }
  ): Promise<[string[], QueryMetadata[]]> {
    const response = await this.getSession(sessionId);
    const vs = this.store[response.vdbid];
    batchSize = batchSize || this.batchSize;

    const algoInstance = await this.getAlgorithm(vs.embeddingSize, batchSize, response.algorithm, {
      factoryId: response.factory_id,
      customId: response.custom_id,
    });
    const userAction = UserAction.BATCH;

    const [nextState, batchType, params] = algoInstance.blueprintStep(response.state, userAction);

    const history = this.enableHistory ? await this.getHistory(sessionId) : {ids: []};

    let ids: string[];
    let batch: QueryMetadata[];

    this.logger.debug(
      `Session: ${response.algorithm} ${response.factory_id} ${response.custom_id}\t(${batchType} ${batchSize})`
    );
    if (batchType === 'random') {
      const batchQuery = generateBatch(
        batchSize,
        this.embeddingSize,
        constants.MIN_TOPK * 2, // TODO: 2 is related to MMR factor here?
        params.apply_mmr || params.apply_threshold[0]
      );
      const batchQueryResult = await vs.multiSearch(batchQuery);

      [ids, batch] = algoInstance.randomBatch(batchQueryResult, batchQuery, {
        applyMMR: params.apply_mmr,
        applyThreshold: params.apply_threshold,
        removeDuplicates: params.remove_duplicates,
      });
    } else if (batchType === 'biased' || batchType === 'personalized') {
      if (batchType === 'biased' && !(options && options.biasVectors && options.biasWeights)) {
        throw new Error('Bias vectors and weights must be provided for biased batch');
      }

      if (!response.has_embeddings && batchType === 'personalized') {
        // act like random batch
        this.logger.warn('No embeddings found for personalized batch, switching to random batch.');
        const batchQuery = generateBatch(
          batchSize,
          this.embeddingSize,
          constants.MIN_TOPK * 2, // TODO: 2 is related to MMR factor here?
          true // apply_mmr: true
        );
        this.updateState(sessionId, nextState.name);
        const batchQueryResult = await vs.multiSearch(batchQuery);
        [ids, batch] = algoInstance.randomBatch(batchQueryResult, batchQuery, {
          applyMMR: params.apply_mmr, // TODO: this is supposed to be always true above?
          applyThreshold: params.apply_threshold,
          removeDuplicates: params.remove_duplicates,
        });
      } else {
        // act like biased batch
        const batchResponse = await this.biasedBatch(sessionId, response.vdbid, nextState.name, {
          params,
          biasVectors: options?.biasVectors, // defined if 'biased'
          biasWeights: options?.biasWeights, // defined if 'biased'
        });
        const batchQuery = this.queryWrapper(response.vdbid, algoInstance.batchSize, batchResponse, history.ids, {
          applyMMR: params.apply_mmr,
          applyThreshold: params.apply_threshold[1],
        });
        const batchQueryResult = await vs.multiSearch(batchQuery);

        [ids, batch] = algoInstance.biasedBatch(batchQueryResult, batchQuery, {
          applyMMR: params.apply_mmr,
          applyThreshold: params.apply_threshold,
          removeDuplicates: params.remove_duplicates,
        });
      }
    } else if (batchType === 'sampled') {
      const batchResponse = await this.sampledBatch(sessionId, response.vdbid, nextState.name, params.n_topics);
      const batchQuery = this.queryWrapper(response.vdbid, algoInstance.batchSize, batchResponse, history.ids, {
        applyMMR: params.apply_mmr,
        applyThreshold: params.apply_threshold[1],
      });
      const batchQueryResult = await vs.multiSearch(batchQuery);

      [ids, batch] = algoInstance.sampledBatch(batchQueryResult, batchQuery, {
        applyMMR: params.apply_mmr,
        applyThreshold: params.apply_threshold,
        removeDuplicates: params.remove_duplicates,
      });
    } else {
      batchType satisfies never;
      throw new Error('Invalid batch type: ' + batchType);
    }

    ids = ids.slice(0, algoInstance.batchSize);
    batch = batch.slice(0, algoInstance.batchSize);

    if (this.enableHistory) {
      await this.addHistory(sessionId, ids);
    }

    return [ids, batch];
  }

  private queryWrapper(
    vdbid: string,
    batchSize: number,
    response: BatchResponse,
    history: string[],
    options?: {
      applyMMR?: boolean | number;
      applyThreshold?: number;
      filter?: Record<string, string>;
    }
  ): BatchQuery {
    const applyMMR = options?.applyMMR ? options.applyMMR == true || options.applyMMR == 1 : false;
    const includeValues = applyMMR || options?.applyThreshold !== undefined;

    const topKs = adjustWeights(
      response.weights,
      batchSize,
      Math.max(batchSize * constants.DEFAULT_CONFIDENCE_INTERVAL_RATIO, 1)
    )
      // ensure that topK is at least some value, otherwise too small values cause problems
      .map(k => Math.max(k, constants.MIN_TOPK))
      // if applyMMR, increase k for better results
      .map(k => (applyMMR ? k * constants.MMR_TOPK_FACTOR : k));

    let metadataFilter = MetadataFilter.default();
    if (this.enableHistory) {
      if (history.length === 0) {
        this.logger.debug('history is empty, no filter will be applied');
      }

      if (options?.filter !== undefined) {
        metadataFilter = this.store[vdbid].historyFilter(history, options?.filter, '_id');
      } else {
        metadataFilter = this.store[vdbid].historyFilter(history);
      }
    }

    const queries = response.vectors.map(
      (v, i) =>
        new Query(
          {vector: v, dim: v.length, id: ''},
          Math.max(topKs[i], constants.MIN_TOPK),
          includeValues,
          metadataFilter
        )
    );

    // if apply MMR, increase top_k for MMR to work better
    if (applyMMR) {
      queries.forEach(q => {
        q.top_k_mmr = q.top_k;
        q.top_k *= 2;
      });
    }

    return new BatchQuery(queries, batchSize);
  }

  private async getAlgorithm(
    embeddingSize: number,
    batchSize: number,
    algorithm: 'SIMPLE' | 'FACTORY' | 'CUSTOM',
    options?: {
      factoryId?: string;
      customId?: string;
    }
  ): Promise<BaseAlgorithm> {
    switch (algorithm) {
      case 'SIMPLE': {
        return new SimpleAlgorithm(batchSize, {
          embeddingSize: embeddingSize,
        });
      }
      case 'CUSTOM': {
        if (!options?.customId) {
          throw new Error('Expected customId');
        }

        const blueprint = await this.getBlueprint(options.customId);
        return new CustomAlgorithm(blueprint, batchSize, {
          embeddingSize: embeddingSize,
        });
      }
      case 'FACTORY': {
        if (!options?.factoryId) {
          throw new Error('Expected factoryId');
        }

        return new FactoryAlgorithm(options.factoryId, batchSize, {
          embeddingSize: embeddingSize,
        });
      }
      default:
        algorithm satisfies never;
        throw new Error('Invalid algorithm: ' + algorithm);
    }
  }
}
