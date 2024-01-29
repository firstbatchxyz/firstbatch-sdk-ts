import constants from '../constants';
import type {MetadataFilter, Query, DistanceMetric, FetchResult, QueryResult} from '../types';

/** Base vector store implementation.
 *
 * Every integration must extend & implement this abstract class.
 */
export abstract class VectorStore {
  public embeddingSize: number;
  public distanceMetric: DistanceMetric;
  protected readonly historyField: string;

  constructor(options?: {embeddingSize?: number; distanceMetric?: DistanceMetric; historyField?: string}) {
    this.embeddingSize = options?.embeddingSize ?? constants.DEFAULTS.EMBEDDING_SIZE;
    this.distanceMetric = options?.distanceMetric ?? constants.DEFAULTS.DISTANCE_METRIC;
    this.historyField = options?.historyField ?? constants.DEFAULTS.HISTORY_FIELD;
  }

  async multiSearch(queries: Query[]): Promise<QueryResult[][]> {
    return await Promise.all(queries.map(q => this.search(q)));
  }

  async multiFetch(ids: string[]): Promise<FetchResult[]> {
    return await Promise.all(ids.map(id => this.fetch(id)));
  }

  public abstract search(query: Query): Promise<QueryResult[]>;
  public abstract fetch(id: string): Promise<FetchResult>;
  public abstract historyFilter(ids: string[], prevFilter?: object): MetadataFilter;
}
