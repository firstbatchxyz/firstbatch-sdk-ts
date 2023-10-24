import {DistanceMetric, Vector} from '../types';
import {Query, QueryResult, BatchQuery, BatchQueryResult} from '../query';
import {MetadataFilter, QueryMetadata} from '../metadata';
import constants from '../../constants';
import {FetchQuery, FetchResult, BatchFetchResult, BatchFetchQuery} from '../fetch';
import {VectorStore} from './base';

// TODO:

export class Supabase extends VectorStore {
  private client: unknown; // TODO: implement
  private collectionName: string; // TODO: why is this optional?
  private queryName: string; // FIXME: this is not used
  private collection: unknown; // TODO: implement

  constructor(client: unknown, collectionName?: string, queryName?: string, distanceMetric?: DistanceMetric) {
    // FIXME: queryname is not used
    super(distanceMetric);
    this.client = client; // TODO: implement
    this.collectionName = collectionName || constants.DEFAULT_SUPABASE_COLLECTION;
    this.queryName = queryName || constants.DEFAULT_SUPABASE_QUERY_NAME;
  }

  async search(query: Query): Promise<QueryResult> {
    throw new Error('TODO IMPLEMENT');
  }

  async fetch(query: FetchQuery): Promise<FetchResult> {
    throw new Error('TODO IMPLEMENT');
  }

  async multiSearch(query: BatchQuery) {
    const multiResult = await Promise.all(query.queries.map(q => this.search(q)));
    return new BatchQueryResult(query.batch_size, multiResult);
  }

  async multiFetch(query: BatchFetchQuery) {
    const multiResult = await Promise.all(query.fetches.map(q => this.fetch(q)));
    return new BatchFetchResult(query.batch_size, multiResult);
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
