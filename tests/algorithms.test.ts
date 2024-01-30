import {describe, beforeEach, test} from 'bun:test';
import {Pinecone as PineconeClient} from '@pinecone-database/pinecone';
import {Pinecone} from '../src/integrations/pinecone';
import {FirstBatchConfig, FirstBatch, Signals} from '../src';
import constants from './constants';
import {generateVectors} from '../src/utils';
import {Signal, WeightedVectors} from '../src/types';

describe('algorithms', () => {
  /** Either a `batch` action or a `Signal` with the content id of `ids[idx]`. */
  type Actions = ('batch' | {signal: Signal; idx: number})[];

  let personalized: FirstBatch;
  const vdbid = 'my_db_384';
  const config: FirstBatchConfig = {
    batchSize: 20,
    quantizerTrainSize: 100,
    quantizerType: 'scalar',
    enableHistory: true,
    verbose: true,
  };
  const embeddingSize = constants.PINECONE.EMBEDDING_SIZE;

  // TODO: beforeAll?
  beforeEach(async () => {
    const indexName = constants.PINECONE.INDEX.RSS;

    const pinecone = new PineconeClient({apiKey: constants.PINECONE.API_KEY, environment: constants.PINECONE.ENV});
    await pinecone.describeIndex(indexName);
    const index = pinecone.index(indexName);

    const vectorStore = new Pinecone(index, {embeddingSize});

    personalized = await FirstBatch.new(constants.FIRSTBATCH.API_KEY, config);
    await personalized.addVectorStore(vdbid, vectorStore);
  });

  test('simple', async () => {
    const actions: Actions = ['batch', {signal: Signals.LIKE, idx: 0}, 'batch'];

    const session = await personalized.session('SIMPLE', vdbid);
    let ids: string[] = [];
    for (const action of actions) {
      if (action === 'batch') {
        [ids] = await personalized.batch(session);
      } else {
        await personalized.addSignal(session, action.signal, ids[action.idx]);
      }
    }
  });

  test('simple with bias vectors', async () => {
    const signal = Signals.LIKE;
    const actions: Actions = [
      'batch',
      {signal, idx: 2},
      'batch',
      {signal, idx: 4},
      'batch',
      'batch',
      {signal, idx: 1},
      {signal, idx: 2},
      {signal, idx: 3},
      'batch',
    ];
    const bias: WeightedVectors = {
      vectors: generateVectors(embeddingSize, 5),
      weights: new Array(5).fill(1),
    };

    const session = await personalized.session('SIMPLE', vdbid);
    let ids: string[] = [];
    for (const action of actions) {
      if (action === 'batch') {
        [ids] = await personalized.batch(session, {bias});
      } else {
        await personalized.addSignal(session, action.signal, ids[action.idx]);
      }
    }
  });

  test('factory', async () => {
    const signal = Signals.ADD_TO_CART;
    const actions: Actions = [
      'batch',
      {signal, idx: 2},
      'batch',
      {signal, idx: 4},
      {signal, idx: 1},
      'batch',
      'batch',
      {signal, idx: 12},
      {signal, idx: 9},
    ];
    const session = await personalized.session('RECOMMENDATIONS', vdbid);

    let ids: string[] = [];
    for (const action of actions) {
      if (action === 'batch') {
        [ids] = await personalized.batch(session);
      } else {
        await personalized.addSignal(session, action.signal, ids[action.idx]);
      }
    }
  });

  test('custom', async () => {
    const actions: Actions = ['batch', {signal: Signals.ADD_TO_CART, idx: 2}, 'batch'];

    const session = await personalized.session('CUSTOM', vdbid, {customId: constants.PINECONE.CUSTOM_ID});
    let ids: string[] = [];
    for (const action of actions) {
      if (action === 'batch') {
        [ids] = await personalized.batch(session);
      } else {
        await personalized.addSignal(session, action.signal, ids[action.idx]);
      }
    }
  });
});
