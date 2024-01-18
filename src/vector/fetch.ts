import {QueryMetadata} from './metadata';
import {Vector} from './types';

export type FetchResult = {
  vector: Vector;
  metadata: QueryMetadata;
  id: string;
};

// TODO: BatchFetchQueryResult?
export class BatchFetchResult {
  batch_size: number = 1;
  results: FetchResult[] = [];

  constructor(batch_size: number, results: FetchResult[] = []) {
    this.batch_size = batch_size;
    this.results = results;
  }
}
