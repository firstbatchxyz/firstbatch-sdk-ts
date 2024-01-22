import {describe, beforeEach, test} from 'bun:test';
import {Signals} from '../src/algorithm/blueprint/';
import {Pinecone as PineconeClient} from '@pinecone-database/pinecone';
import {Pinecone} from '../src/vector/integrations/pinecone';
import {FirstBatchConfig, FirstBatch} from '../src';
import {generateVectors} from '../src/vector';
import constants from './constants';

describe('algorithms', () => {
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

  beforeEach(async () => {
    const indexName = constants.PINECONE.INDEX.RSS;

    const pinecone = new PineconeClient({apiKey: constants.PINECONE.API_KEY, environment: constants.PINECONE.ENV});
    await pinecone.describeIndex(indexName);
    const index = pinecone.index(indexName);

    const vectorStore = new Pinecone(index, {embeddingSize});

    personalized = await FirstBatch.new(constants.FIRSTBATCH.API_KEY, config);
    await personalized.addVdb(vdbid, vectorStore);
  });

  test('simple', async () => {
    const signals = [
      {label: 'batch', weight: 0},
      {label: 'signal', weight: 2},
      {label: 'batch', weight: 0},
    ];

    const session = await personalized.session('SIMPLE', vdbid);

    let ids: string[] = [];
    for (const s of signals) {
      if (s.label === 'batch') {
        [ids] = await personalized.batch(session);
      } else if (s.label === 'signal') {
        await personalized.addSignal(session, Signals.LIKE, ids[s.weight]);
      }
    }
  });

  test('simple with bias vectors', async () => {
    const signals = [
      {label: 'batch', weight: 0},
      {label: 'signal', weight: 2},
      {label: 'batch', weight: 0},
      {label: 'signal', weight: 4},
      {label: 'batch', weight: 0},
      {label: 'batch', weight: 0},
      {label: 'signal', weight: 1},
      {label: 'signal', weight: 2},
      {label: 'signal', weight: 3},
      {label: 'batch', weight: 0},
    ];
    const session = await personalized.session('SIMPLE', vdbid);

    const bias = {
      vectors: generateVectors(embeddingSize, 5).map(v => v.vector),
      weights: new Array(5).fill(1),
    };

    let ids: string[] = [];
    for (const s of signals) {
      if (s.label === 'batch') {
        [ids] = await personalized.batch(session, {bias});
      } else if (s.label === 'signal') {
        await personalized.addSignal(session, Signals.LIKE, ids[s.weight]);
      }
    }
  });

  test('factory', async () => {
    const signals = [
      {label: 'batch', weight: 0},
      {label: 'signal', weight: 2},
      {label: 'batch', weight: 0},
      {label: 'signal', weight: 4},
      {label: 'signal', weight: 1},
      {label: 'batch', weight: 0},
      {label: 'batch', weight: 0},
      {label: 'signal', weight: 12},
      {label: 'signal', weight: 9},
    ];
    const session = await personalized.session('RECOMMENDATIONS', vdbid);

    let ids: string[] = [];
    for (const s of signals) {
      if (s.label === 'batch') {
        [ids] = await personalized.batch(session);
      } else if (s.label === 'signal') {
        await personalized.addSignal(session, Signals.ADD_TO_CART, ids[s.weight]);
      }
    }
  });

  test('custom', async () => {
    const signals = [
      {label: 'batch', weight: 0},
      {label: 'signal', weight: 2},
      {label: 'batch', weight: 0},
    ];
    const session = await personalized.session('CUSTOM', vdbid, {
      customId: constants.PINECONE.CUSTOM_ID,
    });

    let ids: string[] = [];
    for (const s of signals) {
      if (s.label === 'batch') {
        [ids] = await personalized.batch(session);
      } else if (s.label === 'signal') {
        await personalized.addSignal(session, Signals.ADD_TO_CART, ids[s.weight]);
      }
    }
  });
});
