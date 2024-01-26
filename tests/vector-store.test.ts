import {beforeAll, describe, expect, test} from 'bun:test';
import constants from './constants';
import {BatchQueryResult, QueryResult} from '../src/query';
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
        expect(res).toBeInstanceOf(QueryResult);
      });

      test('fetch', async () => {
        const query = generateQuery(1, dim, 10, true);
        const res = await vs.search(query);
        expect(res).toBeInstanceOf(QueryResult);

        const fetchRes = await vs.fetch(res.ids[0]);
        // expect(fetchRes).toBeInstanceOf(FetchResult);
        // TODO: test
      });

      test('multi-search', async () => {
        const queries = generateBatch(10, dim, 10, true);
        const res = await vs.multiSearch(queries, 10);
        expect(res).toBeInstanceOf(BatchQueryResult);
      });

      test('multi-fetch', async () => {
        const query = generateQuery(1, dim, 10, true);
        const res = await vs.search(query);
        expect(res).toBeInstanceOf(QueryResult);

        const ids = res.ids;
        const multiFetchRes = await vs.multiFetch(ids);
      });

      test('history', async () => {
        const query = generateQuery(1, dim, 10, false);
        const res = await vs.search(query);
        query.filter = vs.historyFilter(res.ids);
        const res_ = await vs.search(query);
        expect(res.ids.filter(id => res_.ids.includes(id)).length).toBe(0);
      });
    });
  });
});
