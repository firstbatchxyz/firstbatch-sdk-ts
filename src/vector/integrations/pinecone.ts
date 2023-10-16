import type {Index, QueryResponse, RecordMetadata} from '@pinecone-database/pinecone';
import type {Vector, DistanceMetric} from '../types';
import {MetadataFilter, QueryMetadata} from '../metadata';
import {BatchFetchQuery, BatchFetchResult, FetchQuery, FetchResult} from '../fetch';
import {BatchQuery, BatchQueryResult, Query, QueryResult} from '../query';
import {VectorStore} from './base';

export class Pinecone extends VectorStore {
  index: Index;
  private namespace: string | undefined;

  constructor(index: Index, namespace?: string, distanceMetric?: DistanceMetric) {
    super(distanceMetric);
    this.index = index;
    this.namespace = namespace;
  }

  async search(query: Query) {
    if (query.search_type === 'fetch') throw Error("search_type must be 'default' or 'sparse' to use search method");
    else if (query.search_type === 'sparse') throw Error('sparse search is not implemented yet');
    else {
      // FIXME: what is the if condition here?
      if (query.filter.filter && query.embedding.vector) {
        const result: QueryResponse = await this.index.query({
          vector: query.embedding.vector,
          topK: query.top_k,
          filter: query.filter.filter as Record<string, any>, // TODO: type
          includeMetadata: query.include_metadata,
          includeValues: query.include_values,
        });
        if (result.matches === undefined) throw Error('No valid match for query');

        const ids: string[] = [];
        const scores: number[] = [];
        const vectors: Vector[] = [];
        const metadata: QueryMetadata[] = [];

        for (const r of result.matches) {
          ids.push(r.id);
          if (r.score != undefined) scores.push(r.score);
          else scores.push(0);
          vectors.push({vector: r.values, dim: r.values.length, id: r.id});
          metadata.push(new QueryMetadata(r.id, r.metadata as RecordMetadata));
        }
        return new QueryResult({vectors, metadata, scores, ids, distanceMetric: this.distanceMetric});
      } else throw Error('query must have a valid embedding and filter');
    }
  }

  async fetch(query: FetchQuery) {
    if (query.id === undefined) throw Error('id must be provided for fetch query');
    const result = await this.index.fetch([query.id]);
    const fetches: FetchResult[] = [];

    for (const key in result.records) {
      if (Object.hasOwn(result.records, key)) {
        const v = result.records[key];
        const vector: Vector = {vector: v.values, dim: v.values.length, id: key};
        const metadata = new QueryMetadata(key, v.metadata as RecordMetadata);
        fetches.push(new FetchResult(vector, metadata, key));
      }
    }
    return fetches[0];
  }

  async multiSearch(query: BatchQuery) {
    const multiResult = await Promise.all(query.queries.map(q => this.search(q)));
    return new BatchQueryResult(query.batch_size, multiResult);
  }

  async multiFetch(query: BatchFetchQuery) {
    const multiResult = await Promise.all(query.fetches.map(q => this.fetch(q)));
    return new BatchFetchResult(query.batch_size, multiResult);
  }

  historyFilter(ids: string[], prevFilter?: object) {
    const filter: Record<string, any> = {
      id: {$nin: ids},
    };

    if (prevFilter) {
      const merged: Record<string, any> = {...prevFilter};

      if (merged.id) {
        merged.id.$nin = Array.from(new Set([...(merged.id.$nin || []), ...filter.id.$nin]));
      } else {
        merged.id = filter.id;
      }

      for (const [key, value] of Object.entries(filter)) {
        if (key !== 'id' && !(key in merged)) {
          merged[key] = value;
        }
      }

      return new MetadataFilter('history', merged);
    } else {
      return new MetadataFilter('history', filter);
    }
  }
}
