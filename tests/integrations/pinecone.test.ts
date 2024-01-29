import {beforeAll, describe, expect, test} from 'bun:test';
import constants from '../constants';
import {Pinecone} from '../../src/';
import {generateBatch, generateQuery} from '../../src/utils';
import {Pinecone as PineconeClient} from '@pinecone-database/pinecone';

describe('pinecone integration', () => {
  let vs: Pinecone;
  const topK = 10;

  beforeAll(async () => {
    const pinecone = new PineconeClient({
      apiKey: constants.PINECONE.API_KEY,
      environment: constants.PINECONE.ENV,
    });
    const index = pinecone.index(constants.PINECONE.INDEX.RSS);

    vs = new Pinecone(index, {embeddingSize: constants.PINECONE.EMBEDDING_SIZE});
  });

  // TODO: group these tests with other integrations as well
  test('single search', async () => {
    const query = generateQuery(vs.embeddingSize, topK, true);
    const res = await vs.search(query);
    expect(res.length).toBeGreaterThan(0);
  });
  test('multi-search', async () => {
    const queries = generateBatch(10, vs.embeddingSize, topK, true);
    const res = await vs.multiSearch(queries);
    expect(res.length).toBeGreaterThan(0);
  });
  test('fetch', async () => {
    const query = generateQuery(vs.embeddingSize, topK, true);
    const res = await vs.search(query);
    expect(res.length).toBeGreaterThan(0);
    const fetchRes = await vs.fetch(res[0].id);
    expect(fetchRes.id).toBe(res[0].id);
  });
  test('multi-fetch', async () => {
    const query = generateQuery(vs.embeddingSize, topK, true);
    const res = await vs.search(query);
    expect(res.length).toBeGreaterThan(0);

    const ids = res.map(r => r.id);
    const multiFetchRes = await vs.multiFetch(ids);
    expect(multiFetchRes.map(f => f.id)).toEqual(ids);
  });

  test('history', async () => {
    const query = generateQuery(vs.embeddingSize, topK, false);
    const res = await vs.search(query);
    const resIds = res.map(r => r.id);
    query.filter = vs.historyFilter(resIds);

    const newRes = await vs.search(query);
    const newResIds = newRes.map(r => r.id);
    expect(resIds.filter(id => newResIds.includes(id)).length).toBe(0);
  });
});
