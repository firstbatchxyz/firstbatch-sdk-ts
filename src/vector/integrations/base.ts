import constants from '../../constants';
import type {BaseLossy} from '../../lossy/base';
import {BatchFetchQuery, BatchFetchResult, FetchQuery, FetchResult} from '../fetch';
import {BatchQuery, BatchQueryResult, Query, QueryResult} from '../query';
import type {MetadataFilter} from '../metadata';
import type {CompressedVector, DistanceMetric, Vector} from '../types';

export abstract class VectorStore {
  private _registered: boolean = false;
  private _embeddingSize: number = constants.DEFAULT_EMBEDDING_SIZE;
  private _quantizer?: BaseLossy;
  constructor(readonly distanceMetric: DistanceMetric = 'cosine_sim') {}

  get embeddingSize() {
    return this._embeddingSize;
  }

  set embeddingSize(value: number) {
    this._embeddingSize = value;
  }

  get quantizer() {
    if (!this._quantizer) {
      throw new Error('Quantizer not set');
    }
    return this._quantizer;
  }
  set quantizer(value: BaseLossy) {
    this._quantizer = value;
  }

  get registered() {
    return this._registered;
  }
  set registered(value: boolean) {
    this._registered = value;
  }

  trainQuantizer(vectors: Vector[]): void {
    this.quantizer.train(vectors);
  }

  quantizeVector(vector: Vector): CompressedVector {
    return this.quantizer.compress(vector);
  }

  dequantizeVector(vector: CompressedVector): Vector {
    return this.quantizer.decompress(vector);
  }

  async multiSearch(query: BatchQuery): Promise<BatchQueryResult> {
    const multiResult = await Promise.all(query.queries.map(q => this.search(q)));
    return new BatchQueryResult(query.batch_size, multiResult);
  }

  async multiFetch(query: BatchFetchQuery): Promise<BatchFetchResult> {
    const multiResult = await Promise.all(query.fetches.map(q => this.fetch(q)));
    return new BatchFetchResult(query.batch_size, multiResult);
  }

  public abstract search(query: Query): Promise<QueryResult>;
  public abstract fetch(query: FetchQuery): Promise<FetchResult>;
  public abstract historyFilter(ids: string[], prevFilter?: object, idField?: string): MetadataFilter;
}
