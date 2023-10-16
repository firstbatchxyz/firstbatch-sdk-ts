import {BaseAlgorithm} from './base';
import library from './blueprint/library';

export class SimpleAlgorithm extends BaseAlgorithm {
  constructor(batchSize: number, options?: {embeddingSize?: number; includeValues?: boolean}) {
    super('SIMPLE', batchSize, {
      blueprint: library.CONTENT_CURATION, // alias: Simple
      embeddingSize: options?.embeddingSize,
      includeValues: options?.includeValues,
    });
  }
}
