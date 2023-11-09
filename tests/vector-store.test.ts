import {beforeAll, describe, expect, test} from 'bun:test';

// clients
import weaviate, {ApiKey} from 'weaviate-ts-client';
import {Pinecone as PineconeClient} from '@pinecone-database/pinecone';
import {Client as TypesenseClient} from 'typesense';

import constants from './constants';
import {BatchQueryResult, QueryResult, generateBatch, generateQuery} from '../src/vector/query';
import {BatchFetchQuery, BatchFetchResult, FetchQuery, FetchResult} from '../src/vector/fetch';
import {Weaviate, Pinecone, Typesense, Supabase} from '../src/';
import {createClient} from '@supabase/supabase-js';

describe('vector store', () => {
  let vs: Weaviate | Pinecone | Typesense | Supabase;
  let dim: number;

  ['weavitate', 'pinecone', 'typesense', 'supabase'].map(vsname => {
    (vsname == 'typesense' || vsname == 'supabase' ? describe.todo : describe)(vsname, () => {
      beforeAll(async () => {
        if (vsname === 'weavitate') {
          const client = weaviate.client({
            scheme: constants.WEAVIATE.SCHEME,
            host: constants.WEAVIATE.HOST,
            apiKey: new ApiKey(constants.WEAVIATE.API_KEY),
          });

          vs = new Weaviate(client, {
            index: constants.WEAVIATE.INDEX.FARCASTER,
          });
        } else if (vsname === 'pinecone') {
          const pinecone = new PineconeClient({
            apiKey: constants.PINECONE.API_KEY_ALT,
            environment: constants.PINECONE.ENV,
          });
          const index = pinecone.index(constants.PINECONE.INDEX.FARCASTER);
          vs = new Pinecone(index);
        } else if (vsname === 'typesense') {
          const client = new TypesenseClient({
            apiKey: constants.TYPESENSE.API_KEY,
            nodes: [
              {
                host: constants.TYPESENSE.API_HOST,
                port: constants.TYPESENSE.API_PORT,
                protocol: constants.TYPESENSE.PROTOCOL,
              },
            ],
          });
          const health = await client.health.retrieve();
          expect(health.ok).toBeTrue();

          vs = new Typesense(client);
        }
        if (vsname === 'supabase') {
          const client = createClient(constants.SUPABASE.URL, constants.SUPABASE.KEY);
          vs = new Supabase(client);
        } else {
          throw new Error('unexpected vector store: ' + vsname);
        }

        // dimension is retrieved from vector store's default value
        dim = vs.embeddingSize;
      });

      test('search', async () => {
        const query = generateQuery(1, dim, 10, true).next().value;
        const res = await vs.search(query);
        expect(res).toBeInstanceOf(QueryResult);
      });

      test('fetch', async () => {
        const query = generateQuery(1, dim, 10, true).next().value;
        const res = await vs.search(query);
        expect(res).toBeInstanceOf(QueryResult);
        const fetch = new FetchQuery(res.ids[0]);
        const fetchRes = await vs.fetch(fetch);
        expect(fetchRes).toBeInstanceOf(FetchResult);
      });

      test('multi-search', async () => {
        const batch = generateBatch(10, dim, 10, true);
        const res = await vs.multiSearch(batch);
        expect(res).toBeInstanceOf(BatchQueryResult);
      });

      test('multi-fetch', async () => {
        const query = generateQuery(1, dim, 10, true).next().value;
        const res = await vs.search(query);
        expect(res).toBeInstanceOf(QueryResult);

        const ids = res.ids;
        const bfq = new BatchFetchQuery(
          10,
          ids.map(id => new FetchQuery(id))
        );
        const multiFetchRes = await vs.multiFetch(bfq);
        expect(multiFetchRes).toBeInstanceOf(BatchFetchResult);
      });

      test('history', async () => {
        const query = generateQuery(1, dim, 10, false).next().value;
        const res = await vs.search(query);
        query.filter = vs.historyFilter(res.ids);
        const res_ = await vs.search(query);
        expect(res.ids.filter(id => res_.ids.includes(id)).length).toBe(0);
      });
    });
  });
});
