import type {Index, QueryResponse} from '@pinecone-database/pinecone';
import type {Query, DistanceMetric, Vector, MetadataFilter, QueryResult} from '../types';
import {VectorStore} from './base';

export class Pinecone extends VectorStore {
  index: Index;

  /**
   * @param index a Pinecone index
   * @param namespace (optional) namespace
   * @param distanceMetric (optional) distance metric, defaults to cosine similarity
   */
  constructor(
    index: Index,
    kwargs?: {
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
  }

  async search(query: Query): Promise<QueryResult[]> {
    const result: QueryResponse = await this.index.query({
      vector: query.embedding.vector,
      topK: query.top_k,
      filter: query.filter,
      includeMetadata: query.include_metadata,
      includeValues: query.include_values,
    });
    if (result.matches === undefined) {
      throw Error('No valid match for query');
    }

    return result.matches.map(r => ({
      id: r.id,
      metadata: r.metadata,
      score: r.score ?? 0.0,
      vector: {vector: r.values, id: r.id},
    }));
  }

  async fetch(id: string) {
    const result = await this.index.fetch([id]);

    for (const key in result.records) {
      if (Object.hasOwn(result.records, key)) {
        const v = result.records[key];
        const vector: Vector = {vector: v.values, id: key};
        const metadata = {id: key, data: v.metadata};
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
