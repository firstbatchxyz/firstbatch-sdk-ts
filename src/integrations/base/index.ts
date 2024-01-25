import constants from '../../constants';
import {BatchQuery, BatchQueryResult, QueryResult} from '../../vector/query';
import type {
  MetadataFilter,
  Query,
  CompressedVector,
  DistanceMetric,
  Vector,
  FetchResult,
  Quantizer,
} from '../../types';

export abstract class VectorStore {
  public embeddingSize: number;
  public distanceMetric: DistanceMetric;

  protected readonly historyField: string;

  private _quantizer?: Quantizer;

  constructor(options?: {embeddingSize?: number; distanceMetric?: DistanceMetric; historyField?: string}) {
    this.embeddingSize = options?.embeddingSize || constants.DEFAULTS.EMBEDDING_SIZE;
    this.distanceMetric = options?.distanceMetric || constants.DEFAULTS.DISTANCE_METRIC;
    this.historyField = options?.historyField || constants.DEFAULTS.HISTORY_FIELD;
  }

  get quantizer() {
    if (!this._quantizer) {
      throw new Error('Quantizer not set!');
    }
    return this._quantizer;
  }
  set quantizer(value: Quantizer) {
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
