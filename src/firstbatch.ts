import log from 'loglevel';
import {applyAlgorithm} from './algorithm/apply';
import {Blueprint} from './algorithm/blueprint';
import {FirstBatchAPI} from './api';
import constants from './constants';
import {ScalarQuantizer} from './lossy/scalar';
import {VectorStore} from './integrations/base';
import {generateBatch, adjustWeights} from './utils';
import type {WeightedVectors, Signal, QueryMetadata, FirstBatchConfig, Query, AlgorithmType} from './types';
import {Signals} from './algorithm/signals';
import library from './algorithm/library';

export class FirstBatch extends FirstBatchAPI {
  readonly batchSize: number;
  readonly quantizerTrainSize: number;
  readonly quantizerType: 'scalar' | 'product';
  readonly enableHistory: boolean;
  readonly verbose: boolean;

  private readonly store: Record<string, VectorStore> = {};
  logger: log.Logger = log.getLogger('FirstBatchLogger');

  constructor(apiKey: string, config?: FirstBatchConfig) {
    super(apiKey);

    this.batchSize = config?.batchSize ?? constants.DEFAULTS.BATCH_SIZE;
    this.enableHistory = config?.enableHistory ?? constants.DEFAULTS.ENABLE_HISTORY;
    this.verbose = config?.verbose ?? constants.DEFAULTS.VERBOSE;

    this.logger.setLevel(this.verbose ? 'INFO' : 'WARN');

    this.quantizerTrainSize = config?.quantizerTrainSize ?? constants.DEFAULTS.QUANTIZER_TRAIN_SIZE;
    this.quantizerType = config?.quantizerType ?? constants.DEFAULTS.QUANTIZER_TYPE;
    if (this.quantizerType === 'product') {
      this.logger.warn("Product quantization not yet supported, defaulting to 'scalar'");
      this.quantizerType = 'scalar';
    }
  }

  static async new(apiKey: string, config?: FirstBatchConfig): Promise<FirstBatch> {
    const personalized = new FirstBatch(apiKey, config);
    await personalized.init();
    personalized.logger.info('Using: ' + personalized.url);
    return personalized;
  }

  /** Add a vector store to the container.
   *
   * If this vector store has not beed registered to the API before,
   * it will be "sketched" with respect to the `quantizerType`, which may take some time.
   *
   * @param vdbid vectorDB ID of your choice
   * @param vectorStore a `VectorStore` instance
   */
  async addVectorStore(name: string, vectorStore: VectorStore) {
    const exists = await this.vdbExists(name);
    if (!exists) {
      this.logger.info(`Vector store "${name}" not found, sketching a new one.`);

      if (this.quantizerType === 'scalar') {
        this.logger.info('Initializing with scalar quantizer, this might take some time...');

        const quantizer = new ScalarQuantizer(256);
        const batchSize = Math.min(Math.floor(this.quantizerTrainSize / constants.DEFAULTS.QUANTIZER_TOPK), 500);
        const vectors = await vectorStore
          .multiSearch(generateBatch(batchSize, vectorStore.embeddingSize, constants.DEFAULTS.QUANTIZER_TOPK, true))
          .then(results => results.flatMap(result => result.map(r => r.vector)));

        quantizer.train(vectors);

        await this.initVectordbScalar(
          name,
          vectors.map(v => quantizer.compress(v).vector),
          quantizer.quantiles
        );
      } else if (this.quantizerType === 'product') {
        throw new Error('Product quantization is not supported yet');
      } else {
        this.quantizerType satisfies never;
        throw new Error('Invalid quantizer type: ' + this.quantizerType);
      }
    }

    // add to local storage
    this.store[name] = vectorStore;
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

    // TODO: we had the following statement here originally:
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
      throw new Error('Vector Store is undefined, have you called `addVectorStore` function?');
    }

    const fetchResult = await vectorStore.fetch(contentId);

    const blueprint = await this.getBlueprint(sessionResponse.algorithm);
    const {source, destination} = blueprint.step(sessionResponse.state, signal);
    const signalResponse = await this.signal(sessionId, fetchResult.vector, destination.name, signal);
    if (signalResponse.success && this.enableHistory) {
      await this.addHistory(sessionId, [contentId]);
    }

    return {
      source,
      destination,
      success: signalResponse.success,
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
      bias?: WeightedVectors;
    }
    // FIXME: return [string, QueryMetadata][]
  ): Promise<[string[], QueryMetadata[]]> {
    const response = await this.getSession(sessionId);
    const vectorStore = this.store[response.vdbid];
    if (vectorStore === undefined) {
      throw new Error('Vector Store is undefined, you should add it.'); // FIXME: better msg
    }

    const batchSize = options?.batchSize ?? this.batchSize;
    const historyIds = this.enableHistory ? await this.getHistory(sessionId) : [];
    const blueprint = await this.getBlueprint(response.algorithm);

    const {source, destination} = blueprint.step(response.state, Signals.BATCH);
    const {params, batchType} = source;
    const algorithmOptions = {
      applyMMR: params.apply_mmr,
      applyThreshold: params.apply_threshold,
      removeDuplicates: params.remove_duplicates,
      distanceMetric: vectorStore.distanceMetric,
    };

    switch (response.algorithm.type) {
      case 'CUSTOM':
        this.logger.info(
          `Session | CUSTOM | ${response.algorithm.customId} | ${batchType} batch of ${batchSize} vectors`
        );
        break;
      case 'FACTORY':
        this.logger.info(
          `Session | FACTORY | ${response.algorithm.factoryId} | ${batchType} batch of ${batchSize} vectors`
        );
        break;
      case 'SIMPLE':
        this.logger.info(`Session | SIMPLE | ${batchType} batch of ${batchSize} vectors`);
        break;
    }

    let queries: Query[];
    if (batchType === 'random') {
      queries = generateBatch(
        batchSize,
        vectorStore.embeddingSize,
        constants.MIN_TOPK * constants.MMR_TOPK_FACTOR,
        params.apply_mmr || params.apply_threshold !== 0
      );
    } else if (batchType === 'biased' || batchType === 'personalized') {
      // check if bias exists
      if (batchType === 'biased' && options?.bias === undefined) {
        throw new Error('Bias vectors and weights must be provided for biased batch');
      }

      if (!response.has_embeddings && batchType === 'personalized') {
        // act like random batch
        this.logger.warn('No embeddings found for personalized batch, switching to random batch.');
        queries = generateBatch(
          batchSize,
          vectorStore.embeddingSize,
          constants.MIN_TOPK * constants.MMR_TOPK_FACTOR,
          true
        );
      } else {
        // act like biased batch
        const biasOptions = {params, bias: options?.bias};
        const batchResponse = await this.biasedBatch(sessionId, response.vdbid, destination.name, biasOptions);
        queries = this.queryWrapper(response.vdbid, batchSize, batchResponse, historyIds, algorithmOptions);
      }
    } else if (batchType === 'sampled') {
      const batchResponse = await this.sampledBatch(sessionId, response.vdbid, destination.name, params.n_topics);
      queries = this.queryWrapper(response.vdbid, batchSize, batchResponse, historyIds, algorithmOptions);
    } else {
      batchType satisfies never;
      throw new Error('Invalid batch type: ' + batchType);
    }

    await this.updateState(sessionId, destination.name, batchType);
    const searchResults = await vectorStore.multiSearch(queries);

    let [ids, metadatas] = applyAlgorithm(searchResults, queries, batchType, algorithmOptions);

    // take only `batchSize` many results
    ids = ids.slice(0, batchSize);
    metadatas = metadatas.slice(0, batchSize);

    if (this.enableHistory) {
      await this.addHistory(sessionId, ids);
    }

    return [ids, metadatas];
  }

  private queryWrapper(
    vdbid: string,
    batchSize: number,
    response: WeightedVectors,
    history: string[],
    options?: {
      applyMMR?: boolean;
      applyThreshold?: number;
      filter?: Record<string, string>;
    }
  ): Query[] {
    const applyMMR = options?.applyMMR ?? false;
    const includeValues = applyMMR || options?.applyThreshold !== undefined;

    const topKs = adjustWeights(
      response.weights,
      batchSize,
      Math.max(batchSize * constants.DEFAULTS.CONFIDENCE_INTERVAL_RATIO, 1)
    )
      // ensure that topK is at least some value, otherwise too small values cause problems
      .map(k => Math.max(k, constants.MIN_TOPK))
      // if applyMMR, increase k for better results
      .map(k => (applyMMR ? k * constants.MMR_TOPK_FACTOR : k));

    const hasHistory = this.enableHistory && history.length !== 0;
    const metadataFilter = hasHistory ? this.store[vdbid].historyFilter(history, options?.filter) : {}; // FIXME: default, but can it be undefined?

    return response.vectors.map((vector, i): Query => {
      const topK = Math.max(topKs[i], constants.MIN_TOPK);

      return {
        embedding: vector,
        top_k: applyMMR ? topK * constants.MMR_TOPK_FACTOR : topK,
        top_k_mmr: applyMMR ? topK : Math.floor(topK / constants.MMR_TOPK_FACTOR),
        include_metadata: true,
        include_values: includeValues,
        filter: metadataFilter,
      };
    });
  }

  private async getBlueprint(algorithm: AlgorithmType): Promise<Blueprint> {
    switch (algorithm.type) {
      case 'SIMPLE': {
        return new Blueprint(library.CONTENT_CURATION);
      }
      case 'CUSTOM': {
        const blueprint = await this.getCustomBlueprint(algorithm.customId);
        return new Blueprint(blueprint);
      }
      case 'FACTORY': {
        const blueprint = library[algorithm.factoryId as keyof typeof library];
        if (!blueprint) {
          throw new Error('Could not find a DFA with label: ' + algorithm.factoryId);
        }
        return new Blueprint(blueprint);
      }
    }
  }
}
