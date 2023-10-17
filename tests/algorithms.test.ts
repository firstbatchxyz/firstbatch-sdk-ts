import {describe, beforeEach, test} from 'bun:test';
import {UserAction} from '../src/algorithm/blueprint/action';
import {Signal, Signals} from '../src/algorithm/blueprint/signal';
import {Pinecone as PineconeClient} from '@pinecone-database/pinecone';
import {Pinecone} from '../src/vector/integrations/pinecone';
import {FirstBatchConfig, FirstBatch} from '../src';
import {generateVectors} from '../src/vector';
import constants from './constants';

describe('algorithms', () => {
  let personalized: FirstBatch;
  const vdbid = 'my_db';
  const config: FirstBatchConfig = {
    embeddingSize: 1536,
    batchSize: 20,
    quantizerTrainSize: 100,
    quantizerType: 'scalar',
    enableHistory: true,
    verbose: true,
  };

  beforeEach(async () => {
    const indexName = constants.PINECONE.INDEX.RSS;

    const pinecone = new PineconeClient({apiKey: constants.PINECONE.API_KEY, environment: constants.PINECONE.ENV});
    await pinecone.describeIndex(indexName);
    const index = pinecone.index(indexName);

    const vectorStore = new Pinecone(index);

    personalized = await FirstBatch.new(constants.FIRSTBATCH.API_KEY, config);
    await personalized.addVdb(vdbid, vectorStore);
  });

  test('simple', async () => {
    const signals = [new Signal('batch', 0), new Signal('signal', 2), new Signal('batch', 0)];

    const session = await personalized.session('SIMPLE', vdbid);
    const sessionId = session.data;

    let ids: string[] = [];
    for (const s of signals) {
      if (s.label === 'batch') {
        [ids] = await personalized.batch(sessionId);
      } else if (s.label === 'signal') {
        await personalized.addSignal(sessionId, new UserAction(Signals.LIKE), ids[s.weight]);
      }
    }
  });

  test('simple with bias vectors', async () => {
    const signals = [
      new Signal('batch', 0),
      new Signal('signal', 2),
      new Signal('batch', 0),
      new Signal('signal', 4),
      new Signal('batch', 0),
      new Signal('batch', 0),
      new Signal('signal', 1),
      new Signal('signal', 2),
      new Signal('signal', 3),
      new Signal('batch', 0),
    ];
    const session = await personalized.session('SIMPLE', vdbid);
    const sessionId = session.data;
    const bias: Parameters<typeof personalized.batch>[2] = {
      biasVectors: generateVectors(1536, 5).map(v => v.vector),
      biasWeights: new Array(5).fill(1),
    };

    let ids: string[] = [];
    for (const s of signals) {
      if (s.label === 'batch') {
        [ids] = await personalized.batch(sessionId, undefined, bias);
      } else if (s.label === 'signal') {
        await personalized.addSignal(sessionId, new UserAction(Signals.LIKE), ids[s.weight]);
      }
    }
  });

  test('factory', async () => {
    const signals = [
      new Signal('batch', 0),
      new Signal('signal', 2),
      new Signal('batch', 0),
      new Signal('signal', 4),
      new Signal('signal', 1),
      new Signal('batch', 0),
      new Signal('batch', 0),
      new Signal('signal', 12),
      new Signal('signal', 9),
    ];
    const session = await personalized.session('RECOMMENDATIONS', vdbid);
    const sessionId = session.data;

    let ids: string[] = [];
    for (const s of signals) {
      if (s.label === 'batch') {
        [ids] = await personalized.batch(sessionId);
      } else if (s.label === 'signal') {
        await personalized.addSignal(sessionId, new UserAction(Signals.ADD_TO_CART), ids[s.weight]);
      }
    }
  });

  test('custom', async () => {
    const signals = [new Signal('batch', 0), new Signal('signal', 2), new Signal('batch', 0)];
    const session = await personalized.session('CUSTOM', vdbid, {
      customId: constants.PINECONE.CUSTOM_ID,
    });
    const sessionId = session.data;

    let ids: string[] = [];
    for (const s of signals) {
      if (s.label === 'batch') {
        [ids] = await personalized.batch(sessionId);
      } else if (s.label === 'signal') {
        await personalized.addSignal(sessionId, new UserAction(Signals.ADD_TO_CART), ids[s.weight]);
      }
    }
  });
});
