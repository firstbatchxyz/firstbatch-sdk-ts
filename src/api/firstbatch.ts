import axios, {AxiosInstance} from 'axios';
import {createHash} from 'crypto';
import constants from '../constants';
import type {Vertex, WeightedVectors, DFA, Signal, AlgorithmType} from '../types';

/** Endpoint to get region w.r.t user's API key. */
const REGION_URL = 'https://idp.firstbatch.xyz/v1/teams/team/get-team-information';

/** HollowDB regions, the field names are important. */
const REGIONS = {
  'us-east-1': 'https://aws-us-east-1.hollowdb.xyz/',
  'us-west-1': 'https://aws-us-west-1.hollowdb.xyz/',
  'eu-central-1': 'https://aws-eu-central-1.hollowdb.xyz/',
  'ap-southeast-1': 'https://aws-ap-southeast-1.hollowdb.xyz/',
} as const;

export class FirstBatchAPI {
  /** API key of this client. */
  private apiKey: string = '';
  /** Prepared Axios instance with base URL and headers set, see {@link init}. */
  private axios: AxiosInstance = axios.create();
  /** TeamID of this client. */
  teamId: string = '';
  /** Backend URL with respect to the region of the API key. */
  url: string = '';
  /** Region for this client. */
  region: string = '';

  /** Acts as a constructor. */
  protected constructor(apiKey: string) {
    this.apiKey = apiKey;
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

  /** Initializes vectorDB, returns error message as a response if there was one. */
  protected async initVectordbScalar(vdbid: string, quantizedVectors: number[][], quantiles: number[]) {
    return await this.post<string>('embeddings/init_vdb', {
      key: createHash('md5').update(this.apiKey).digest('hex'),
      vdbid: vdbid,
      mode: 'scalar',
      region: this.region,
      quantized_vecs: quantizedVectors,
      quantiles: quantiles,
    });
  }

  /** Initializes vectorDB, returns error message as a response if there was one. */
  protected async initVectordbProduct(
    vdbid: string,
    quantizedVectors: number[][],
    quantizedVectorResiduals: number[][],
    codebook: number[][],
    codebookResidual: number[][],
    M: number,
    Ks: number,
    Ds: number
  ) {
    return await this.post<string>('embeddings/init_vdb', {
      key: createHash('md5').update(this.apiKey).digest('hex'),
      vdbid: vdbid,
      mode: 'product',
      region: this.region,
      quantized_vecs: quantizedVectors,
      quantized_residuals: quantizedVectorResiduals,
      codebook: codebook,
      codebook_residual: codebookResidual,
      M: M,
      Ks: Ks,
      Ds: Ds,
    });
  }

  /** Updates history, returns error message as a response if there was one. */
  protected async addHistory(sessionId: string, ids: string[]) {
    return await this.post<string>('embeddings/update_history', {id: sessionId, ids});
  }

  protected async createSession(
    algorithm: string,
    vdbid: string,
    options?: {
      customId?: string;
      factoryId?: string;
      sessionId?: string;
      hasEmbeddings?: string;
    }
  ) {
    const sessionId = options?.sessionId ? this.teamId + '-' + options.sessionId : undefined;
    return await this.post<string>('embeddings/create_session', {
      vdbid,
      algorithm,
      id: sessionId,
      custom_id: options?.customId,
      factory_id: options?.factoryId,
      has_embeddings: options?.hasEmbeddings ?? false,
    });
  }

  /** Updates state, returns error message as a response if there was one. */
  protected async updateState(sessionId: string, state: string, batchType: Vertex['batchType']) {
    return await this.post<string>('embeddings/update_state', {
      id: sessionId,
      state: state,
      batch_type: batchType.toUpperCase(), // NOTE: api expects uppercased values for this field
    });
  }

  /** Adds a signal, returns error message as a response if there was one. */
  protected async signal(sessionId: string, vector: number[], stateName: string, signal: Signal) {
    return this.post<string>('embeddings/signal', {
      id: sessionId,
      state: stateName,
      signal: signal.weight,
      signal_label: signal.label,
      vector: vector,
    });
  }

  protected async biasedBatch(
    sessionId: string,
    vdbid: string,
    state: string,
    options?: {
      bias?: WeightedVectors;
      params?: Vertex['params'];
    }
  ) {
    const response = await this.post<WeightedVectors>('embeddings/biased_batch', {
      id: sessionId,
      vdbid: vdbid,
      state: state,
      params: options?.params,
      bias_vectors: options?.bias?.vectors,
      bias_weights: options?.bias?.weights,
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
    const response = await this.post<WeightedVectors>('embeddings/sampled_batch', {
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

    const data = response.data;

    let algorithm: AlgorithmType = {
      type: 'SIMPLE',
    };

    if (data.algorithm === 'FACTORY') {
      if (data.factory_id === undefined) {
        throw new Error('Did not get factory_id from API for a FACTORY algorithm.');
      }

      algorithm = {
        type: 'FACTORY',
        factoryId: data.factory_id,
      };
    }

    if (data.algorithm === 'CUSTOM') {
      if (data.custom_id === undefined) {
        throw new Error('Did not get custom_id from API for a CUSTOM algorithm.');
      }
      algorithm = {
        type: 'CUSTOM',
        customId: data.custom_id,
      };
    }

    return {
      ...data,
      algorithm,
    };
  }

  protected async getHistory(sessionId: string) {
    const response = await this.post<{ids: string[]}>('embeddings/get_history', {id: sessionId});
    return response.data.ids;
  }

  protected async getUserEmbeddings(sessionId: string, lastN?: number) {
    const response = await this.post<WeightedVectors>('embeddings/get_embeddings', {
      id: sessionId,
      last_n: lastN ?? constants.DEFAULTS.EMBEDDING_LAST_N,
    });
    return response.data;
  }

  protected async vdbExists(vdbid: string) {
    const response = await this.post<boolean>('embeddings/vdb_exists', {vdbid});
    return response.data;
  }

  /**
   * Retrieve the blueprint of some custom id.
   *
   * @param customId algorithm id
   * @returns a DFA (TODO: is this a string & object or always an object?)
   */
  protected async getCustomBlueprint(customId: string) {
    const response = await this.post<DFA>('embeddings/get_blueprint', {id: customId});
    // FIXME: do we ever receive a string here?
    return response.data;
  }

  /** Initialize the client.
   *
   * Retrieves the region for the set API key, and creates an Axios instance for the client. */
  protected async init() {
    const headers = {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };

    // first, get the region & team data
    const axiosResponse = await axios.get<{
      success: boolean;
      code: number;
      message?: string | undefined;
      data: {
        teamID: string;
        region: keyof typeof REGIONS;
      };
    }>(REGION_URL, {
      headers,
      validateStatus: status => {
        if (status != 200) {
          throw new Error(`Region request failed with ${status} at ${REGION_URL}`);
        }
        return true;
      },
    });

    const {teamID, region} = axiosResponse.data.data; // notice the 2 data's
    this.teamId = teamID;
    this.region = region;
    const regionBaseURL = REGIONS[region];
    if (!regionBaseURL) {
      throw new Error('No such region: ' + region);
    }

    // then, set up the axios client with the region base URL
    this.url = regionBaseURL;
    this.axios = axios.create({
      baseURL: this.url,
      headers: headers,
      // override Axios internal handler so that we can handle ourselves
      validateStatus: () => true,
    });

    // useful for debugging
    if (process.env.VERBOSE_TEST) {
      this.axios.interceptors.request.use(request => {
        console.log(`REQ ${request.baseURL! + request.url}`);
        return request;
      });
      this.axios.interceptors.response.use(response => {
        console.log(`RES ${response.statusText} (${response.status})`);
        console.log(response.data);
        return response;
      });
    }
  }
}
