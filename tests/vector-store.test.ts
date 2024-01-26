import {beforeAll, describe, expect, test} from 'bun:test';
import constants from './constants';
import {Weaviate, Pinecone} from '../src/';
import type {VectorStore} from '../src/integrations';

import weaviate, {ApiKey} from 'weaviate-ts-client';
import {Pinecone as PineconeClient} from '@pinecone-database/pinecone';
import {generateBatch, generateQuery} from '../src/utils';

describe('vector store', () => {
  let vs: VectorStore;
  let dim: number;

  ['weavitate', 'pinecone'].map(vsname => {
    describe(vsname, () => {
      beforeAll(async () => {
        if (vsname === 'weavitate') {
          const client = weaviate.client({
            scheme: constants.WEAVIATE.SCHEME,
            host: constants.WEAVIATE.HOST,
            apiKey: new ApiKey(constants.WEAVIATE.API_KEY),
          });

          vs = new Weaviate(client, {
            className: constants.WEAVIATE.CLASS_NAME.FARCASTER,
          });
        } else if (vsname === 'pinecone') {
          const pinecone = new PineconeClient({
            apiKey: constants.PINECONE.API_KEY,
            environment: constants.PINECONE.ENV,
          });
          const index = pinecone.index(constants.PINECONE.INDEX.RSS);
          vs = new Pinecone(index, {
            embeddingSize: constants.PINECONE.EMBEDDING_SIZE,
          });
        }
        // else if (vsname === 'typesense') {
        //   const client = new TypesenseClient({
        //     apiKey: constants.TYPESENSE.API_KEY,
        //     nodes: [
        //       {
        //         host: constants.TYPESENSE.API_HOST,
        //         port: constants.TYPESENSE.API_PORT,
        //         protocol: constants.TYPESENSE.PROTOCOL,
        //       },
        //     ],
        //   });
        //   const health = await client.health.retrieve();
        //   expect(health.ok).toBeTrue();
        //   vs = new Typesense(client);
        // } else if (vsname === 'supabase') {
        //   const client = createSupabaseClient(constants.SUPABASE.URL, constants.SUPABASE.KEY);
        //   vs = new Supabase(client);
        // }
        else {
          throw new Error('unexpected vector store: ' + vsname);
        }

        // dimension is retrieved from vector store's default value
        dim = vs.embeddingSize;
      });

      test('search', async () => {
        const query = generateQuery(1, dim, 10, true);
        const res = await vs.search(query);
        // expect(res).toBeInstanceOf(QueryResult_);
      });

      test('fetch', async () => {
        const query = generateQuery(1, dim, 10, true);
        const res = await vs.search(query);
        // expect(res).toBeInstanceOf(QueryResult_);

        const fetchRes = await vs.fetch(res[0].id);
        // expect(fetchRes).toBeInstanceOf(FetchResult);
        // TODO: test
      });

      test('multi-search', async () => {
        const queries = generateBatch(10, dim, 10, true);
        const res = await vs.multiSearch(queries);
      });

      test('multi-fetch', async () => {
        const query = generateQuery(1, dim, 10, true);
        const res = await vs.search(query);
        // expect(res).toBeInstanceOf(QueryResult_);

        const ids = res.map(r => r.id);
        const multiFetchRes = await vs.multiFetch(ids);
      });

      test('history', async () => {
        const query = generateQuery(1, dim, 10, false);
        const res = await vs.search(query);
        const resIds = res.map(r => r.id);
        query.filter = vs.historyFilter(resIds);

        const newRes = await vs.search(query);
        const newResIds = newRes.map(r => r.id);
        expect(resIds.filter(id => newResIds.includes(id)).length).toBe(0);
      });
    });
  });
});
