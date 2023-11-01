/** Configuration for the FirstBatch core client. */
export interface FirstBatchConfig {
  batchSize: number;
  quantizerTrainSize: number;
  quantizerType: 'scalar' | 'product';
  enableHistory: boolean;
  verbose: boolean;
}
