import type {SupabaseClient} from '@supabase/supabase-js';
import type {PostgrestFilterBuilder} from '@supabase/postgrest-js';
import type {DistanceMetric, Vector} from '../types';
import {Query, QueryResult} from '../query';
import {MetadataFilter, QueryMetadata} from '../metadata';
import constants from '../../constants';
import {FetchQuery, FetchResult} from '../fetch';
import {VectorStore} from './base';

// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any
export type SupabaseMetadata = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any
export type SupabaseFilter = PostgrestFilterBuilder<any, any, any>;
export type SupabaseFilterRPCCall = (rpcCall: SupabaseFilter) => SupabaseFilter;

// compatible with Python FirstBatch SDK
export type SupabaseRecord = [string, number[], SupabaseMetadata];

/** Interface for the response returned when searching embeddings. */
interface SearchEmbeddingsResponse {
  id: number;
  content: string;
  metadata: object;
  embedding: number[];
  similarity: number;
}

// based on https://supabase.com/docs/guides/ai/vector-columns?database-method=sql
export class Supabase extends VectorStore {
  private client: SupabaseClient;
  private collectionName: string;
  private queryName: string;

  constructor(
    client: SupabaseClient,
    kwargs?: {
      collectionName?: string;
      queryName?: string;
      embeddingSize?: number;
      historyField?: string;
      distanceMetric?: DistanceMetric;
    }
  ) {
    super({
      embeddingSize: kwargs?.embeddingSize,
      distanceMetric: kwargs?.distanceMetric,
      historyField: kwargs?.historyField,
    });
    this.client = client;
    this.collectionName = kwargs?.collectionName || constants.DEFAULT_SUPABASE_COLLECTION;
    this.queryName = kwargs?.queryName || constants.DEFAULT_SUPABASE_QUERY_NAME;
  }

  async search(query: Query): Promise<QueryResult> {
    const ids: string[] = [];
    const scores: number[] = [];
    const vectors: Vector[] = [];
    const metadata: QueryMetadata[] = [];

    if (query.include_values) {
      const result = await this.queryWrapper(
        query.embedding.vector,
        query.top_k,
        query.filter.filter as SupabaseFilter,
        true,
        false
      );

      const idsScore: Record<string, number[]> = Object.fromEntries(result.map(r => [r[0], r[1]]));
      const fetches = await this.fetchWrapper(Object.keys(idsScore));
      for (const f of fetches) {
        ids.push(f[0]);
        // FIXME: bad type
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        scores.push(idsScore[f[0]]);
        if (query.include_metadata) {
          vectors.push({vector: f[1], dim: f[1].length, id: f[0]});
          metadata.push(new QueryMetadata(f[0], f[2]));
        }
      }
    } else {
      const results = await this.queryWrapper(
        query.embedding.vector,
        query.top_k,
        query.filter.filter as Record<string, any>,
        true,
        query.include_metadata
      );
      for (const r of results) {
        ids.push(r[0]);
        // FIXME: bad type
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        scores.push(r[0]);
        vectors.push({vector: [], dim: 0, id: r[0]});
        if (query.include_metadata) {
          vectors.push({vector: r[1], dim: r[1].length, id: r[0]});
        }
      }
    }

    return new QueryResult({
      vectors,
      ids,
      scores,
      distanceMetric: this.distanceMetric,
    });
  }

  async fetch(query: FetchQuery): Promise<FetchResult> {
    const result = await this.fetchWrapper([query.id]);
    const m: QueryMetadata = new QueryMetadata(query.id, result[0][2]);
    const v: Vector = {
      vector: result[0][1],
      id: query.id,
      dim: result[0][1].length,
    };
    return new FetchResult(v, m, query.id);
  }

  /** Simple SELECT query to vectors with matching ids. */
  private async fetchWrapper(ids: string[]): Promise<SupabaseRecord[]> {
    const result = await this.client
      .from(this.collectionName)
      .select<
        string,
        {
          id: SearchEmbeddingsResponse['id'];
          content: SearchEmbeddingsResponse['content'];
          embedding: SearchEmbeddingsResponse['embedding'];
          metadata: SearchEmbeddingsResponse['metadata'];
        }
      >('id,embedding,metadata')
      .in('id', ids);
    if (result.status !== 200) {
      throw result.error;
    }

    const data = result.data || [];
    return data.map(d => [d.id.toString(), d.embedding, d.metadata as SupabaseMetadata]);
  }

  /**
   *
   * Reference: https://github.com/langchain-ai/langchainjs/blob/main/langchain/src/vectorstores/supabase.ts#L148
   */
  private async queryWrapper(
    data: number[],
    limit: number,
    filter: Record<string, any>,
    includeValues: boolean,
    includeMetadata: boolean
  ): Promise<SupabaseRecord[]> {
    const result = await this.client.rpc(this.queryName, {
      query_embedding: data,
      match_count: limit,
      filter: filter,
      // TODO: add `include` args here within the rpc?
    });
    if (result.status !== 200) {
      throw result.error;
    }
    const results = result.data as SearchEmbeddingsResponse[];
    return results.map(r => [r.id.toString(), r.embedding, r.metadata]);
  }

  historyFilter(ids: string[], prevFilter?: Record<string, any>) {
    // TODO: is there a better query option instead of `and`ing `ne`s?
    // TODO: these two branches are the same, just assign exisrting filter at first if there is one
    if (prevFilter) {
      prevFilter['$and'] = prevFilter['$and'] || [];
      for (const id in ids) {
        prevFilter['$and'].push({id_field: {$ne: id}});
      }
      return new MetadataFilter('', prevFilter);
    } else {
      const filter: Record<string, any> = {
        $and: [],
      };
      for (const id in ids) {
        filter['$and'].push({id_field: {$ne: id}});
      }
      return new MetadataFilter('History', filter);
    }
  }
}
