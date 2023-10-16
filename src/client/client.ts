import axios, {AxiosInstance} from 'axios';
import * as crypto from 'crypto';
import constants from '../constants';
import {BatchResponse} from './types';
import {Params} from '../algorithm/blueprint/params';

export class FirstBatchClient {
  private apiKey: string;
  /** Prepared Axios instance with base URL and headers set. */
  private axios: AxiosInstance;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.axios = axios.create({
      baseURL: constants.BASE_URL,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      // override Axios internal handler so that we can handle ourselves
      validateStatus: () => true,
    });

    if (Bun.env.VERBOSE_TEST) {
      this.axios.interceptors.request.use(request => {
        console.log(`REQ ${request.baseURL! + request.url}`);
        return request;
      });
      this.axios.interceptors.response.use(response => {
        console.log(`RES ${response.statusText} (${response.status})`);
        if (response.status !== 200) {
          console.log(response.data);
        }
        return response;
      });
    }
  }

  /** POST request wrapper. The actual response is wrapped within `data` field of the Axios response.
   *
   * @template T type of the returned JSON data
   * @template I type of the input data field values
   */
  private async post<T, I = unknown>(url: string, data: Record<string, I>) {
    const axiosResponse = await this.axios.post<{
      success: boolean;
      code: number;
      message?: string | undefined;
      data: T;
    }>(url, data);

    if (axiosResponse.status != 200) {
      throw new Error(`FirstBatch API failed with ${axiosResponse.statusText} (${axiosResponse.status}) at ${url}`);
    }

    return axiosResponse.data;
  }

  protected async initVectordbScalar(vdbid: string, vecs: number[][], quantiles: number[]) {
    // TODO: type of `data`?
    return await this.post<any>('embeddings/init_vdb', {
      key: crypto.createHash('md5').update(this.apiKey).digest('hex'),
      vdbid: vdbid,
      mode: 'scalar',
      quantized_vecs: vecs,
      quantiles: quantiles,
    });
  }

  protected async initVectordbProduct(
    vdbid: string,
    vecs: number[][],
    res_vecs: number[][],
    codebook: number[][],
    codebook_residual: number[][],
    M: number,
    Ks: number,
    Ds: number
  ) {
    // TODO: type of `data`?
    return await this.post<any>('embeddings/init_vdb', {
      key: crypto.createHash('md5').update(this.apiKey).digest('hex'),
      vdbid: vdbid,
      mode: 'product',
      quantized_vecs: vecs,
      quantized_residuals: res_vecs,
      codebook: codebook,
      codebook_residual: codebook_residual,
      M: M,
      Ks: Ks,
      Ds: Ds,
    });
  }

  protected async addHistory(sessionId: string, ids: string[]) {
    // TODO: type of data?
    return await this.post<any>('embeddings/update_history', {
      id: sessionId,
      ids,
    });
  }

  protected async createSession(
    algorithm: string,
    vdbid: string,
    options?: {
      customId?: string;
      factoryId?: string;
      hasEmbeddings?: string;
      id?: string;
    }
  ) {
    return await this.post<string>('embeddings/create_session', {
      vdbid,
      algorithm,
      id: options?.id,
      custom_id: options?.customId,
      factory_id: options?.factoryId,
      has_embeddings: options?.hasEmbeddings || false,
    });
  }

  protected async updateState(id: string, state: string) {
    // TODO: type of data?
    return await this.post<any>('embeddings/update_state', {
      id: id,
      state: state,
    });
  }

  protected async signal(args: {sessionId: string; vector: number[]; stateName: string; signal: number}) {
    // TODO: type of data?
    return this.post<any>('embeddings/signal', {
      id: args.sessionId,
      state: args.stateName,
      signal: args.signal,
      vector: args.vector,
    });
  }

  protected async biasedBatch(
    sessionId: string,
    vdbid: string,
    state: string,
    options?: {
      biasVectors?: number[][];
      biasWeights?: number[];
      params?: Params;
    }
  ) {
    const response = await this.post<BatchResponse>('embeddings/biased_batch', {
      id: sessionId,
      vdbid: vdbid,
      state: state,
      params: options?.params,
      bias_vectors: options?.biasVectors,
      bias_weights: options?.biasWeights,
    });
    return response.data;
  }

  protected async sampledBatch(
    sessionId: string,
    vdbid: string,
    state: string,
    nTopics: number,
    params?: Record<string, number>
  ) {
    const response = await this.post<BatchResponse>('embeddings/sampled_batch', {
      id: sessionId,
      n: nTopics,
      vdbid: vdbid,
      state: state,
      params: params,
    });
    return response.data;
  }

  protected async getSession(sessionId: string) {
    const response = await this.post<{
      state: string;
      algorithm: 'SIMPLE' | 'CUSTOM' | 'FACTORY';
      vdbid: string;
      has_embeddings: boolean;
      factory_id?: string;
      custom_id?: string;
    }>('embeddings/get_session', {id: sessionId});

    return response.data;
  }

  protected async getHistory(id: string) {
    const response = await this.post<{ids: string[]}>('embeddings/get_history', {
      id,
    });
    return response.data;
  }

  protected async getUserEmbeddings(id: string, lastN?: number) {
    const response = await this.post<BatchResponse>('embeddings/get_embeddings', {
      id: id,
      last_n: lastN || constants.DEFAULT_EMBEDDING_LAST_N,
    });
    return response.data;
  }

  protected async vdbExists(vdbid: string) {
    const response = await this.post<boolean>('embeddings/vdb_exists', {
      vdbid,
    });
    return response.data;
  }

  protected async getBlueprint(id: string) {
    const response = await this.post<string>('embeddings/get_blueprint', {
      id,
    });
    return response.data;
  }
}
