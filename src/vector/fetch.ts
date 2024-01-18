import {QueryMetadata} from './metadata';
import {SearchType, Vector} from './types';

export class FetchQuery {
  id: string;
  search_type: SearchType = 'fetch';

  constructor(id: string) {
    this.id = id;
  }
}

export type FetchResult = {
  vector: Vector;
  metadata: QueryMetadata;
  id: string;
};

// TODO: we may not need these to be classes everywhere!

export class BatchFetchQuery {
  batch_size: number = 1;
  fetches: FetchQuery[] = [];

  constructor(batch_size: number, fetches: FetchQuery[] = []) {
    this.batch_size = batch_size;
    this.fetches = fetches;
  }
}

// TODO: BatchFetchQueryResult?
export class BatchFetchResult {
  batch_size: number = 1;
  results: FetchResult[] = [];

  constructor(batch_size: number, results: FetchResult[] = []) {
    this.batch_size = batch_size;
    this.results = results;
  }
}
