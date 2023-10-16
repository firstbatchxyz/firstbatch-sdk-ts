/** Configuration for the FirstBatch core client. */
export interface FirstBatchConfig {
  embeddingSize: number;
  batchSize: number;
  quantizerTrainSize: number;
  quantizerType: 'scalar' | 'product';
  enableHistory: boolean;
  verbose: boolean;
}
