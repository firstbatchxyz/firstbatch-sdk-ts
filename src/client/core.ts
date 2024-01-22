import log from 'loglevel';
import {BaseAlgorithm, SimpleAlgorithm, CustomAlgorithm, FactoryAlgorithm, Signals} from '../algorithm';
import {FirstBatchClient} from './client';
import constants from '../constants';
// import {ProductQuantizer} from '../lossy/product';
import {ScalarQuantizer} from '../lossy/scalar';
import {VectorStore} from '../vector/integrations/base';
import {adjustWeights} from '../vector/utils';
import {generateBatch, MetadataFilter, Query, QueryMetadata, BatchQuery} from '../vector';
import type {BatchResponse, Signal} from '../types';

/** Configuration for the FirstBatch User Embeddings SDK. */
export interface FirstBatchConfig {
  batchSize: number;
  quantizerTrainSize: number;
  quantizerType: 'scalar' | 'product';
  enableHistory: boolean;
  verbose: boolean;
}

export class FirstBatch extends FirstBatchClient {
  readonly batchSize: number;
  readonly quantizerTrainSize: number;
  readonly quantizerType: 'scalar' | 'product';
  readonly enableHistory: boolean;
  readonly store: Record<string, VectorStore>;
  readonly verbose: boolean;
  logger: log.Logger = log.getLogger('FirstBatchLogger');

  private constructor(apiKey: string, config?: Partial<FirstBatchConfig>) {
    super(apiKey);
    this.store = {};
    this.batchSize = config?.batchSize ?? constants.DEFAULT_BATCH_SIZE;
    this.quantizerTrainSize = config?.quantizerTrainSize ?? constants.DEFAULT_QUANTIZER_TRAIN_SIZE;
    this.quantizerType = config?.quantizerType ?? constants.DEFAULT_QUANTIZER_TYPE;
    this.enableHistory = config?.enableHistory ?? constants.DEFAULT_ENABLE_HISTORY;
    this.verbose = config?.verbose ?? constants.DEFAULT_VERBOSE;
    this.logger.setLevel(this.verbose ? 'INFO' : 'WARN');

    if (this.quantizerType === 'product') {
      this.logger.warn("Product quantization not yet supported, defaulting to 'scalar'");
      this.quantizerType = 'scalar';
    }
  }

  static async new(apiKey: string, config?: Partial<FirstBatchConfig>): Promise<FirstBatch> {
    const personalized = new FirstBatch(apiKey, config);
    await personalized.init();

    personalized.logger.info('Using: ' + personalized.url);
    return personalized;
  }

  /** Add a vector store to the container.
   *
   * Behind the lines, this function makes an API call to the Embedding API
   * to see if the vector store exists; if is doesn't exist, it will be "sketched"
   * with respect to the `quantizerType`, which may take some time.
   *
   * If you would are CERTAIN that the vector store exists & would like to skip this
   * existence-check API call, you can simply do:
   *
   * ```ts
   * sdk.store[vdbid] = vectorStore
   * ```
   *
   * Most of the times you will not need to do so, but it may save a few milliseconds in
   * a serverless setting where the SDK is created on each function invocation.
   *
   * @param vdbid vectorDB ID of your choice
   * @param vectorStore a `VectorStore` instance
   */
  async addVdb(vdbid: string, vectorStore: VectorStore) {
    // if the given vector store is registered already, dont bother
    if (vectorStore.registered) return;

    const exists = await this.vdbExists(vdbid);

    if (exists) {
      this.store[vdbid] = vectorStore;
      vectorStore.registered = true;
    } else {
      this.logger.info(`VectorDB with id ${vdbid} not found, sketching a new VectorDB.`);
      if (this.quantizerType === 'scalar') {
        // FIXME: THIS IS DANGEROUS, it is a side effect on vector store and may cause problems
        // in particular, if the same vector store is used for different `vdbid`'s, it will cause
        // the quantizer to be overwritten in the same process.
        //
        // on the other hand, this quantizer is not used outside this function, so perhaps we
        // can have the quantizer as a separate object?
        vectorStore.quantizer = new ScalarQuantizer(256);
        vectorStore.registered = true;

        const trainSize = Math.min(
          Math.floor(this.quantizerTrainSize / constants.DEFAULT_TOPK_QUANT),
          constants.MINIMUM_TRAIN_SIZE
        );
        const batch = generateBatch(trainSize, vectorStore.embeddingSize, constants.DEFAULT_TOPK_QUANT, true);

        const results = await vectorStore.multiSearch(batch);
        vectorStore.trainQuantizer(results.vectors());

        const quantizedVectors = results.vectors().map(v => vectorStore.quantizeVector(v).vector);

        this.logger.info('Initializing with scalar quantizer, might take some time...');
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

  /**
   * Fetches the user embeddings for a specific session.
   *
   * @param session session object
   * @returns vectors and weights
   */
  async userEmbeddings(sessionId: string) {
    return super.getUserEmbeddings(sessionId);
  }

  /**
   * Creates a new session with the provided parameters & vector database ID.
   * This method returns the sessionID; however, you can provide the sessionID with this method to create a persistent session.
   *
   * @param algorithm algorithm label
   * @param vdbid vectorDB id
   * @param options optional `sessionId` or `customId`
   * - if `sessionId` is given, a persistent-session will be created and this same id will be returned
   * - `customId` is only expected when `algorithm = 'CUSTOM'`
   * @returns session object
   */
  async session(
    algorithm: keyof typeof constants.PRESET_ALGORITHMS | 'SIMPLE' | 'CUSTOM',
    vdbid: string,
    options?: {sessionId?: string; customId?: string}
  ) {
    // if algorithm label is non-standard, the label is factory and factoryId is the algorithm name
    const label = ['SIMPLE', 'CUSTOM'].includes(algorithm) ? algorithm : 'FACTORY';

    const sessionResponse = await this.createSession(label, vdbid, {
      sessionId: options?.sessionId,
      customId: label == 'CUSTOM' ? options?.customId : undefined,
      factoryId: label == 'FACTORY' ? algorithm : undefined,
    });

    // TODO: we have the following statement here originally:
    // `isPersistent: options?.sessionId !== undefined`
    // this is added to session object, but is not used.
    // if the time comes, keep this in mind.

    return sessionResponse.data;
  }

  /**
   * Add a signal to current session.
   *
   * @param session session object
   * @param signal a {@link Signal}
   * @param contentId id of a returned item from batch
   * @returns `true` is signal was added succesfully
   */
  async addSignal(sessionId: string, signal: Signal, contentId: string) {
    const sessionResponse = await this.getSession(sessionId);
    const vectorStore = this.store[sessionResponse.vdbid];
    if (vectorStore === undefined) {
      throw new Error('Vector Store is undefined, have you called `addVdb` function?');
    }

    const result = await vectorStore.fetch(contentId);

    const algoInstance = await this.getAlgorithm(sessionResponse.algorithm, {
      factoryId: sessionResponse.factory_id,
      customId: sessionResponse.custom_id,
    });

    const [nextState, batchType, params] = algoInstance.blueprint.step(sessionResponse.state, signal);

    const signalResponse = await this.signal(sessionId, result.vector.vector, nextState.name, signal);

    if (signalResponse.success && this.enableHistory) {
      await this.addHistory(sessionId, [contentId]);
    }

    return {
      success: signalResponse.success,
      source: sessionResponse.state,
      destination: nextState.name,
      batchType,
      params,
    };
  }

  /**
   * Get a new batch.
   *
   * @param session session object
   * @param options optional batch size, and bias parameters (vectors and weights)
   * @returns ids and metadata
   */
  async batch(
    sessionId: string,
    options?: {
      batchSize?: number;
      bias?: {
        vectors: number[][];
        weights: number[];
      };
    }
  ): Promise<[string[], QueryMetadata[]]> {
    const response = await this.getSession(sessionId);
    const vectorStore = this.store[response.vdbid];
    if (vectorStore === undefined) {
      throw new Error('Vector Store is undefined, have you called `addVdb` function?');
    }
    const batchSize = options?.batchSize ?? this.batchSize;

    const algoInstance = await this.getAlgorithm(response.algorithm, {
      factoryId: response.factory_id,
      customId: response.custom_id,
    });

    const [nextState, batchType, params] = algoInstance.blueprint.step(response.state, Signals.BATCH);

    const history = this.enableHistory ? await this.getHistory(sessionId) : {ids: []};

    let ids: string[];
    let batch: QueryMetadata[];

    this.logger.info(
      `Session: ${response.algorithm} ${response.factory_id} ${response.custom_id}\t(${batchType} ${batchSize})`
    );
    if (batchType === 'random') {
      const batchQuery = generateBatch(
        batchSize,
        vectorStore.embeddingSize,
        constants.MIN_TOPK * 2, // TODO: 2 is related to MMR factor here?
        params.apply_mmr || params.apply_threshold !== 0
      );
      this.updateState(sessionId, nextState.name, 'random'); // TODO: await?
      const batchQueryResult = await vectorStore.multiSearch(batchQuery);

      [ids, batch] = algoInstance.applyAlgorithm(batchQueryResult, batchQuery, batchSize, 'random', {
        applyMMR: params.apply_mmr,
        applyThreshold: params.apply_threshold,
        removeDuplicates: params.remove_duplicates,
      });
    } else if (batchType === 'biased' || batchType === 'personalized') {
      // check if bias exists
      if (batchType === 'biased' && options?.bias === undefined) {
        throw new Error('Bias vectors and weights must be provided for biased batch');
      }

      if (!response.has_embeddings && batchType === 'personalized') {
        // act like random batch
        this.logger.warn('No embeddings found for personalized batch, switching to random batch.');
        const batchQuery = generateBatch(
          batchSize,
          vectorStore.embeddingSize,
          constants.MIN_TOPK * 2, // TODO: 2 is related to MMR factor here?
          true // apply_mmr: true
        );
        this.updateState(sessionId, nextState.name, 'personalized'); // TODO: await?
        const batchQueryResult = await vectorStore.multiSearch(batchQuery);
        [ids, batch] = algoInstance.applyAlgorithm(batchQueryResult, batchQuery, batchSize, 'random', {
          applyMMR: params.apply_mmr, // TODO: this is supposed to be always true above?
          applyThreshold: params.apply_threshold,
          removeDuplicates: params.remove_duplicates,
        });
      } else {
        // act like biased batch
        const batchResponse = await this.biasedBatch(sessionId, response.vdbid, nextState.name, {
          params,
          biasVectors: options?.bias?.vectors,
          biasWeights: options?.bias?.weights,
        });
        const batchQuery = this.queryWrapper(response.vdbid, batchSize, batchResponse, history.ids, {
          applyMMR: params.apply_mmr,
          applyThreshold: params.apply_threshold,
        });
        const batchQueryResult = await vectorStore.multiSearch(batchQuery);

        [ids, batch] = algoInstance.applyAlgorithm(batchQueryResult, batchQuery, batchSize, 'biased', {
          applyMMR: params.apply_mmr,
          applyThreshold: params.apply_threshold,
          removeDuplicates: params.remove_duplicates,
        });
      }
    } else if (batchType === 'sampled') {
      const batchResponse = await this.sampledBatch(sessionId, response.vdbid, nextState.name, params.n_topics);
      const batchQuery = this.queryWrapper(response.vdbid, batchSize, batchResponse, history.ids, {
        applyMMR: params.apply_mmr,
        applyThreshold: params.apply_threshold,
      });
      const batchQueryResult = await vectorStore.multiSearch(batchQuery);

      [ids, batch] = algoInstance.applyAlgorithm(batchQueryResult, batchQuery, batchSize, 'sampled', {
        applyMMR: params.apply_mmr,
        applyThreshold: params.apply_threshold,
        removeDuplicates: params.remove_duplicates,
      });
    } else {
      batchType satisfies never;
      throw new Error('Invalid batch type: ' + batchType);
    }

    // take only `batchSize` many results
    // FIXME: this might be happening multiple times without being necessary
    ids = ids.slice(0, batchSize);
    batch = batch.slice(0, batchSize);

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

    const hasHistory = this.enableHistory && history.length !== 0;
    const metadataFilter = hasHistory
      ? this.store[vdbid].historyFilter(history, options?.filter)
      : MetadataFilter.default();

    const queries = response.vectors.map(
      (vector, i) => new Query({vector, id: ''}, Math.max(topKs[i], constants.MIN_TOPK), includeValues, metadataFilter)
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
    algorithm: 'SIMPLE' | 'FACTORY' | 'CUSTOM',
    options?: {
      factoryId?: string;
      customId?: string;
    }
  ): Promise<BaseAlgorithm> {
    switch (algorithm) {
      case 'SIMPLE': {
        return new SimpleAlgorithm();
      }
      case 'CUSTOM': {
        if (!options?.customId) {
          throw new Error('Expected customId');
        }

        const blueprint = await this.getBlueprint(options.customId);
        return new CustomAlgorithm(blueprint);
      }
      case 'FACTORY': {
        if (!options?.factoryId) {
          throw new Error('Expected factoryId');
        }

        return new FactoryAlgorithm(options.factoryId);
      }
      default:
        algorithm satisfies never;
        throw new Error('Invalid algorithm: ' + algorithm);
    }
  }
}
