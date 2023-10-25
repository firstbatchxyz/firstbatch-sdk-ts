import type {SupabaseClient} from '@supabase/supabase-js';
import type {DistanceMetric, Vector} from '../types';
import {Query, QueryResult} from '../query';
import {MetadataFilter, QueryMetadata} from '../metadata';
import constants from '../../constants';
import {FetchQuery, FetchResult} from '../fetch';
import {VectorStore} from './base';

// https://github.com/supabase/vecs/blob/main/src/vecs/collection.py#L46
type SupabaseMetadataValue = string | number | boolean | string[];

// https://github.com/supabase/vecs/blob/main/src/vecs/collection.py#L49
type SupabaseRecord = [string, number[], Record<string, SupabaseMetadataValue>];

export class Supabase extends VectorStore {
  private client: SupabaseClient;
  private collectionName: string; // TODO: why is this optional?
  private queryName: string; // FIXME: this is not used
  private collection: unknown; // TODO: implement

  constructor(client: SupabaseClient, collectionName?: string, queryName?: string, distanceMetric?: DistanceMetric) {
    super(distanceMetric);
    this.client = client;
    this.collectionName = collectionName || constants.DEFAULT_SUPABASE_COLLECTION;
    this.queryName = queryName || constants.DEFAULT_SUPABASE_QUERY_NAME;
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
        query.filter.filter as Record<string, any>, // TODO: better type pls
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
        query.filter.filter as Record<string, any>, // TODO: better type pls
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

  /** A function similar to `vecs` Python package `collection.fetch` but only takes a single id. */
  private async fetchWrapper(ids: string[]): Promise<SupabaseRecord[]> {
    throw new Error('UNIMPLEMENTED');
  }

  /** A function similar to `vecs` Python package `collection.query` but only takes a single id.
   *
   * Furthermore, it hides many underlying options, and only asks for `include_metadata` as we only use that one.
   */
  private async queryWrapper(
    data: number[],
    limit: number,
    filter: Record<string, any>,
    includeMetadata: boolean
  ): Promise<SupabaseRecord[]> {
    throw new Error('UNIMPLEMENTED');
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
