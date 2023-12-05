import {Logger, getLogger} from 'loglevel';
import {BaseAlgorithm, SimpleAlgorithm, CustomAlgorithm, FactoryAlgorithm} from '../algorithm';
import {FirstBatchClient} from './client';
import constants from '../constants';
import type {FirstBatchConfig} from '../config';
// import {ProductQuantizer} from '../lossy/product';
import {ScalarQuantizer} from '../lossy/scalar';
import {VectorStore} from '../vector/integrations/base';
import {adjustWeights} from '../vector/utils';
import {BatchResponse, SessionObject} from './types';
import {generateBatch, MetadataFilter, Query, QueryMetadata, FetchQuery, BatchQuery} from '../vector';
import {UserAction} from '../algorithm/blueprint/action';

export class FirstBatch extends FirstBatchClient {
  readonly batchSize: number;
  readonly quantizerTrainSize: number;
  readonly quantizerType: 'scalar' | 'product';
  readonly enableHistory: boolean;
  readonly store: Record<string, VectorStore>;
  readonly verbose: boolean;
  logger: Logger = getLogger('FirstBatchLogger');

  private constructor(apiKey: string, config?: Partial<FirstBatchConfig>) {
    super(apiKey);
    this.store = {};
    this.batchSize = config?.batchSize || constants.DEFAULT_BATCH_SIZE;
    this.quantizerTrainSize = config?.quantizerTrainSize || constants.DEFAULT_QUANTIZER_TRAIN_SIZE;
    this.quantizerType = config?.quantizerType || constants.DEFAULT_QUANTIZER_TYPE;
    this.enableHistory = config?.enableHistory || constants.DEFAULT_ENABLE_HISTORY;
    this.verbose = config?.verbose || constants.DEFAULT_VERBOSE;

    // setup logger
    if (this.verbose !== undefined) {
      this.logger.setLevel(this.verbose ? 'INFO' : 'WARN');
      this.logger.info('Verbose mode enabled.');
    } else {
      this.logger.setLevel('WARN');
    }

    // prepare quantizer
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
   * @param vdbid vectorDB ID of your choice
   * @param vectorStore a `VectorStore` instance
   */
  async addVdb(vdbid: string, vectorStore: VectorStore) {
    const exists = await this.vdbExists(vdbid);

    if (exists) {
      this.store[vdbid] = vectorStore;
    } else {
      this.logger.info(`VectorDB with id ${vdbid} not found, sketching a new VectorDB.`);
      if (this.quantizerType === 'scalar') {
        // TODO: THIS IS DANGEROUS, it is a side effect on vector store and may cause problems
        vectorStore.quantizer = new ScalarQuantizer(256);

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
  async userEmbeddings(session: SessionObject) {
    return super.getUserEmbeddings(session);
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
      id: options?.sessionId,
      customId: label == 'CUSTOM' ? options?.customId : undefined,
      factoryId: label == 'FACTORY' ? algorithm : undefined,
    });

    const session: SessionObject = {
      id: sessionResponse.data,
      isPersistent: options?.sessionId !== undefined,
    };
    return session;
  }

  /**
   * Add a signal to current session.
   *
   * @param session session object
   * @param userAction user action
   * @param contentId id of a returned item from batch
   * @returns `true` is signal was added succesfully
   */
  async addSignal(session: SessionObject, userAction: UserAction, contentId: string) {
    const response = await this.getSession(session);
    const vectorStore = this.store[response.vdbid];

    const query = new FetchQuery(contentId);
    const result = await this.store[response.vdbid].fetch(query);

    const algoInstance = await this.getAlgorithm(vectorStore.embeddingSize, this.batchSize, response.algorithm, {
      factoryId: response.factory_id,
      customId: response.custom_id,
    });

    const [nextState] = algoInstance.blueprintStep(response.state, userAction);

    const resp = await this.signal(
      session,
      result.vector.vector,
      nextState.name,
      userAction.actionType.weight,
      userAction.actionType.label
    );

    if (this.enableHistory) {
      await this.addHistory(session, [contentId]);
    }

    return resp.success;
  }

  /**
   * Get a new batch.
   *
   * @param session session object
   * @param options optional batch size, and bias parameters (vectors and weights)
   * @returns ids and metadata
   */
  async batch(
    session: SessionObject,
    options?: {
      batchSize?: number;
      bias?: {
        vectors: number[][];
        weights: number[];
      };
    }
  ): Promise<[string[], QueryMetadata[]]> {
    const response = await this.getSession(session);
    const vs = this.store[response.vdbid];
    const batchSize = options?.batchSize || this.batchSize;

    const algoInstance = await this.getAlgorithm(vs.embeddingSize, batchSize, response.algorithm, {
      factoryId: response.factory_id,
      customId: response.custom_id,
    });
    const userAction = UserAction.BATCH;

    const [nextState, batchType, params] = algoInstance.blueprintStep(response.state, userAction);

    const history = this.enableHistory ? await this.getHistory(session) : {ids: []};

    let ids: string[];
    let batch: QueryMetadata[];

    this.logger.info(
      `Session: ${response.algorithm} ${response.factory_id} ${response.custom_id}\t(${batchType} ${batchSize})`
    );
    if (batchType === 'random') {
      const batchQuery = generateBatch(
        batchSize,
        vs.embeddingSize,
        constants.MIN_TOPK * 2, // TODO: 2 is related to MMR factor here?
        params.apply_mmr || params.apply_threshold[0]
      );
      this.updateState(session, nextState.name, 'random'); // TODO: await?
      const batchQueryResult = await vs.multiSearch(batchQuery);

      [ids, batch] = algoInstance.randomBatch(batchQueryResult, batchQuery, {
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
          vs.embeddingSize,
          constants.MIN_TOPK * 2, // TODO: 2 is related to MMR factor here?
          true // apply_mmr: true
        );
        this.updateState(session, nextState.name, 'personalized'); // TODO: await?
        const batchQueryResult = await vs.multiSearch(batchQuery);
        [ids, batch] = algoInstance.randomBatch(batchQueryResult, batchQuery, {
          applyMMR: params.apply_mmr, // TODO: this is supposed to be always true above?
          applyThreshold: params.apply_threshold,
          removeDuplicates: params.remove_duplicates,
        });
      } else {
        // act like biased batch
        const batchResponse = await this.biasedBatch(session, response.vdbid, nextState.name, {
          params,
          biasVectors: options?.bias?.vectors,
          biasWeights: options?.bias?.weights,
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
      const batchResponse = await this.sampledBatch(session, response.vdbid, nextState.name, params.n_topics);
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

    // take only `batchSize` many results
    ids = ids.slice(0, algoInstance.batchSize);
    batch = batch.slice(0, algoInstance.batchSize);

    if (this.enableHistory) {
      await this.addHistory(session, ids);
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
        this.logger.info('History is empty, no filter will be applied');
      }

      if (options?.filter !== undefined) {
        metadataFilter = this.store[vdbid].historyFilter(history, options?.filter);
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
        return new SimpleAlgorithm(batchSize, {embeddingSize});
      }
      case 'CUSTOM': {
        if (!options?.customId) {
          throw new Error('Expected customId');
        }

        const blueprint = await this.getBlueprint(options.customId);
        return new CustomAlgorithm(blueprint, batchSize, {embeddingSize});
      }
      case 'FACTORY': {
        if (!options?.factoryId) {
          throw new Error('Expected factoryId');
        }

        return new FactoryAlgorithm(options.factoryId, batchSize, {embeddingSize});
      }
      default:
        algorithm satisfies never;
        throw new Error('Invalid algorithm: ' + algorithm);
    }
  }
}
