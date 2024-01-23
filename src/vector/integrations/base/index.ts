import constants from '../../../constants';
import type {BaseLossy} from '../../../lossy/interface';
import {BatchQuery, BatchQueryResult, Query, QueryResult} from '../../query';
import type {MetadataFilter, CompressedVector, DistanceMetric, Vector, FetchResult} from '../../../types';

export abstract class VectorStore {
  public embeddingSize: number;
  public distanceMetric: DistanceMetric;
  public registered: boolean = false;

  protected readonly historyField: string;

  private _quantizer?: BaseLossy;

  constructor(options?: {embeddingSize?: number; distanceMetric?: DistanceMetric; historyField?: string}) {
    this.embeddingSize = options?.embeddingSize || constants.DEFAULT_EMBEDDING_SIZE;
    this.distanceMetric = options?.distanceMetric || constants.DEFAULT_DISTANCE_METRIC;
    this.historyField = options?.historyField || constants.DEFAULT_HISTORY_FIELD;
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

  async multiFetch(ids: string[]): Promise<FetchResult[]> {
    return await Promise.all(ids.map(id => this.fetch(id)));
  }

  public abstract search(query: Query): Promise<QueryResult>;
  public abstract fetch(id: string): Promise<FetchResult>;
  public abstract historyFilter(ids: string[], prevFilter?: object): MetadataFilter;
}
