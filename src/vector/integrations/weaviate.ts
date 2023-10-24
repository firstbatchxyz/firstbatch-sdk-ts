import type {WeaviateClient} from 'weaviate-ts-client';
import type {DistanceMetric, Vector} from '../types';
import {BatchQuery, BatchQueryResult, Query, QueryResult} from '../query';
import {MetadataFilter, QueryMetadata} from '../metadata';
import {BatchFetchQuery, BatchFetchResult, FetchQuery, FetchResult} from '../fetch';
import type {RecordMetadata} from '@pinecone-database/pinecone';
import {VectorStore} from './base';
import constants from '../../constants';

export class Weaviate extends VectorStore {
  private client: WeaviateClient;
  private readonly index: string;
  private readonly outputFields: string[] = [];

  /**
   *
   * @param client a Weaviate client
   * @param index index name
   * @param outputFields an array of field names
   * @param distanceMetric optional distance metric, defaults to cosine similarity
   */
  constructor(
    client: WeaviateClient,
    index?: string, // TODO: why is this optional?
    outputFields: string[] = ['text'],
    distanceMetric?: DistanceMetric
  ) {
    super(distanceMetric);
    this.client = client;
    this.index = index || constants.DEFAULT_WEAVIATE_INDEX;
    this.outputFields = outputFields;
  }

  async search(query: Query, options?: {additional?: string}): Promise<QueryResult> {
    if (query.search_type === 'fetch') {
      throw new Error("search_type must be 'default' or 'sparse' to use the search method");
    }
    if (query.search_type === 'sparse') {
      throw new Error('Sparse search is not supported');
    }

    const vector = {vector: query.embedding.vector};
    let queryObject = this.client.graphql.get();
    queryObject.withClassName(this.index);
    queryObject.withFields(this.outputFields?.join(' ') as string);
    if (query.filter.name && typeof query.filter.filter === 'object') {
      queryObject = queryObject.withWhere({
        operands: query.filter.filter['operands'],
        operator: query.filter.filter['operator'],
      });
    }

    if (options?.additional) {
      queryObject = queryObject.withFields(`_additional { ${options.additional} }`);
    }

    if (query.include_values) {
      queryObject = queryObject.withFields('_additional { vector } _additional { id } _additional { distance }');
    } else {
      queryObject = queryObject.withFields('_additional { id } _additional { distance }');
    }

    const result = await queryObject.withNearVector(vector).withLimit(query.top_k).do();

    const ids: string[] = [];
    const scores: number[] = [];
    const vectors: Vector[] = [];
    const metadata: QueryMetadata[] = [];
    const data = result.data['Get'][this.index.charAt(0).toUpperCase() + this.index.slice(1)];

    for (const res of data) {
      const _id = res['_additional'].id;
      ids.push(_id);

      const m: Record<string, any> = {};
      for (const k of this.outputFields) {
        m[k] = res[k];
        delete res[k];
      }

      metadata.push(new QueryMetadata(_id, m));
      scores.push(res['_additional'].distance);
      if (query.include_values) {
        vectors.push({vector: res['_additional'].vector, id: _id, dim: res['_additional'].vector.length});
      } else vectors.push({vector: [], id: _id, dim: 0});
    }

    return new QueryResult({vectors, metadata, scores, ids, distanceMetric: this.distanceMetric});
  }

  async fetch(query: FetchQuery): Promise<FetchResult> {
    const result = await this.client.data.getterById().withClassName(this.index).withVector().withId(query.id).do();
    const vec = result.vector as number[];

    const metadata = new QueryMetadata(query.id, result.properties as RecordMetadata);
    const vector: Vector = {vector: vec, id: query.id, dim: vec.length};

    return new FetchResult(vector, metadata, query.id);
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

  historyFilter(
    ids: string[],
    prevFilter?: {
      operands: any[];
      operator: string;
    },
    idField: string = 'id'
  ) {
    const filter = prevFilter || {
      operator: 'And',
      operands: [],
    };

    for (const id of ids) {
      const f = {
        path: [idField],
        operator: 'NotEqual',
        valueText: id,
      };
      filter.operands.push(f);
    }

    return new MetadataFilter('History', filter);
  }
}
