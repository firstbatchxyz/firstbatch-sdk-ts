import type {WeaviateClient} from 'weaviate-ts-client';
import type {MetadataFilter, QueryMetadata, DistanceMetric, Vector, FetchResult} from '../../types';
import {Query, QueryResult} from '../query';
import type {RecordMetadata} from '@pinecone-database/pinecone';
import {VectorStore} from './base';
import constants from '../../constants';

export class Weaviate extends VectorStore {
  private client: WeaviateClient;
  private readonly className: string;
  private readonly outputFields: string[] = [];

  /** A wrapper for the Weaviate client.
   * @param client a Weaviate client
   * @param className (optional) className name
   * @param outputFields (optional) an array of field names for outputs
   * @param historyField (optional) the name of the `id` field for history filtering
   * @param distanceMetric (optional) optional distance metric, defaults to cosine similarity
   */
  constructor(
    client: WeaviateClient,
    kwargs?: {
      className?: string;
      outputFields?: string[];
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
    this.className = kwargs?.className || constants.DEFAULT_WEAVIATE_CLASS_NAME;
    this.outputFields = kwargs?.outputFields || ['text'];
  }

  async search(query: Query, options?: {additional?: string}): Promise<QueryResult> {
    const vector = {vector: query.embedding.vector};
    let queryObject = this.client.graphql.get();
    queryObject.withClassName(this.className);
    queryObject.withFields(this.outputFields?.join(' ') as string);

    // FIXME: wth is this check?
    if (typeof query.filter === 'object') {
      queryObject = queryObject.withWhere({
        operands: query.filter['operands'],
        operator: query.filter['operator'],
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
    const data = result.data['Get'][this.className.charAt(0).toUpperCase() + this.className.slice(1)];

    for (const res of data) {
      const _id = res['_additional'].id;
      ids.push(_id);

      const m: Record<string, any> = {};
      for (const k of this.outputFields) {
        m[k] = res[k];
        delete res[k];
      }

      metadata.push({id: _id, data: m});
      scores.push(res['_additional'].distance);
      if (query.include_values) {
        vectors.push({vector: res['_additional'].vector, id: _id});
      } else {
        vectors.push({vector: [], id: _id});
      }
    }

    return new QueryResult({vectors, metadata, scores, ids, distanceMetric: this.distanceMetric});
  }

  async fetch(id: string): Promise<FetchResult> {
    const result = await this.client.data.getterById().withClassName(this.className).withVector().withId(id).do();
    const vector = result.vector as number[];
    const metadata = {id, data: result.properties as RecordMetadata};
    return {vector: {vector, id}, metadata, id};
  }

  historyFilter(
    ids: string[],
    prevFilter?: {
      operands: any[];
      operator: string;
    }
  ): MetadataFilter {
    const filter = prevFilter || {
      operator: 'And',
      operands: [],
    };

    for (const id of ids) {
      const f = {
        path: [this.historyField],
        operator: 'NotEqual',
        valueText: id,
      };
      filter.operands.push(f);
    }

    return filter;
  }
}
