import {DistanceMetric, Vector} from '../types';
import {Query, QueryResult, BatchQuery, BatchQueryResult} from '../query';
import {MetadataFilter, QueryMetadata} from '../metadata';
import constants from '../../constants';
import {Client as TypesenseClient} from 'typesense';
import Collection from 'typesense/lib/Typesense/Collection';
import {FetchQuery, FetchResult, BatchFetchResult, BatchFetchQuery} from '../fetch';
import {MultiSearchRequestWithPresetSchema} from 'typesense/lib/Typesense/MultiSearch';
import {VectorStore} from './base';

export class Typesense extends VectorStore {
  private client: TypesenseClient;
  private collectionName: string;
  private collection: Collection;
  private metadataKey: string;

  constructor(client: TypesenseClient, collectionName?: string, queryName?: string, distanceMetric?: DistanceMetric) {
    super(distanceMetric);
    this.client = client;
    this.collectionName = collectionName || constants.DEFAULT_TYPESENSE_COLLECTION;
    this.collection = client.collections(this.collectionName);
    this.metadataKey = 'metadata';
  }

  async search(query: Query): Promise<QueryResult> {
    let queryObj;
    if (query.filter?.filter) {
      queryObj = {
        q: '*',
        vector_query: 'vec:({query.embedding.vector}, k:{query.top_k})',
        collection: this.collectionName,
      };
    } else {
      queryObj = {
        q: '*',
        vector_query: 'vec:({query.embedding.vector}, k:{query.top_k})',
        collection: this.collectionName,
        filter_by: query.filter.filter,
      };
    }
    const res = await this.client.multiSearch.perform({searches: [queryObj as MultiSearchRequestWithPresetSchema]}, {});

    const ids: string[] = [];
    const scores: number[] = [];
    const vectors: Vector[] = [];
    const metadata: QueryMetadata[] = [];
    const metadataObject: Record<string, any> = {};

    const q = new QueryResult({vectors, metadata, scores, ids, distanceMetric: this.distanceMetric});
    const hits = res.results[0]['hits'] as any[];
    for (let i = 0; i < hits.length; i++) {
      const document = res.results[0]['hits'][i];
      for (const [k, v] of Object.entries(document)) {
        if (k !== 'vec') {
          metadataObject[k] = v;
        }
      }
      const vecObj: number[] = document['vec'];
      q.metadata.push(new QueryMetadata('', metadataObject as object));
      q.vectors.push({vector: vecObj, dim: vecObj.length, id: document['id']} as Vector);
      q.scores.push(document['vector_distance']);
      q.ids.push(document['id']);
    }
    return q;
  }

  async fetch(query: FetchQuery): Promise<FetchResult> {
    const res = await this.client
      .collections<{
        vec: Vector;
        metadata: QueryMetadata;
        id: string;
      }>(this.collectionName)
      .documents(query.id)
      .retrieve();
    return new FetchResult(res.vec, res.metadata, res.id);
  }

  async multiSearch(query: BatchQuery): Promise<BatchQueryResult> {
    const results = query.queries.map(q => this.search(q));
    const multiResult = await Promise.all(results);
    return new BatchQueryResult(query.batch_size, multiResult);
  }

  async multiFetch(query: BatchFetchQuery): Promise<BatchFetchResult> {
    const results = query.fetches.map(q => this.fetch(q));
    const multiResult = await Promise.all(results);
    return new BatchFetchResult(query.batch_size, multiResult);
  }

  historyFilter(ids: string[], prevFilter?: {[key: string]: any} | string, idField: string = '_id') {
    if (idField !== '_id') {
      throw new Error("TypeSense doesn't allow filtering on id field. Try duplicating id in another field like _id.");
    }

    let filter_ = `${idField}:!=[${ids.join(',')}]`;

    if (prevFilter !== undefined && typeof prevFilter === 'string') {
      filter_ += ` && ${prevFilter}`;
    }
    return new MetadataFilter('History', filter_);
  }
}
