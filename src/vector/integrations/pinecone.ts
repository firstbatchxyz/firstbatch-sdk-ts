import type {Index, QueryResponse, RecordMetadata} from '@pinecone-database/pinecone';
import {Query, QueryResult} from '../query';
import {VectorStore} from './base';
import {QueryMetadata, DistanceMetric, Vector, MetadataFilter} from '../../types';

export class Pinecone extends VectorStore {
  index: Index;
  private namespace: string | undefined;

  /**
   * @param index a Pinecone index
   * @param namespace (optional) namespace
   * @param distanceMetric (optional) distance metric, defaults to cosine similarity
   */
  constructor(
    index: Index,
    kwargs?: {
      namespace?: string;
      historyField?: string;
      embeddingSize?: number;
      distanceMetric?: DistanceMetric;
    }
  ) {
    super({
      embeddingSize: kwargs?.embeddingSize,
      distanceMetric: kwargs?.distanceMetric,
      historyField: kwargs?.historyField,
    });
    this.index = index;
    this.namespace = kwargs?.namespace;
  }

  async search(query: Query) {
    const result: QueryResponse = await this.index.query({
      vector: query.embedding.vector,
      topK: query.top_k,
      filter: query.filter,
      includeMetadata: query.include_metadata,
      includeValues: query.include_values,
    });
    if (result.matches === undefined) throw Error('No valid match for query');

    const ids: string[] = [];
    const scores: number[] = [];
    const vectors: Vector[] = [];
    const metadatas: QueryMetadata[] = [];

    for (const r of result.matches) {
      ids.push(r.id);
      scores.push(r.score ?? 0);
      vectors.push({vector: r.values, id: r.id});
      metadatas.push(r.metadata as RecordMetadata);
    }
    return new QueryResult({vectors, metadatas, scores, ids, distanceMetric: this.distanceMetric});
  }

  async fetch(id: string) {
    const result = await this.index.fetch([id]);

    for (const key in result.records) {
      if (Object.hasOwn(result.records, key)) {
        const v = result.records[key];
        const vector: Vector = {vector: v.values, id: key};
        const metadata = {id: key, data: v.metadata as RecordMetadata};
        return {vector, metadata, id: key};
      }
    }

    throw new Error('Could not find a result.');
  }

  historyFilter(ids: string[], prevFilter?: object): MetadataFilter {
    const filter = {
      [this.historyField]: {$nin: ids},
    };

    if (prevFilter) {
      const merged: Record<string, any> = {...prevFilter};

      if (merged[this.historyField]) {
        merged[this.historyField].$nin = Array.from(
          new Set([...(merged[this.historyField].$nin || []), ...filter[this.historyField].$nin])
        );
      } else {
        merged[this.historyField] = filter[this.historyField];
      }

      for (const [key, value] of Object.entries(filter)) {
        if (key !== this.historyField && !(key in merged)) {
          merged[key] = value;
        }
      }

      return merged;
    } else {
      return filter;
    }
  }
}
