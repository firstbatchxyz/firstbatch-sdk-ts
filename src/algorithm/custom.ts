import {BaseAlgorithm} from './';

export class CustomAlgorithm extends BaseAlgorithm {
  constructor(
    blueprint: string | object,
    batchSize: number,
    options?: {embeddingSize?: number; includeValues?: boolean}
  ) {
    super('CUSTOM', batchSize, {
      blueprint: blueprint,
      embeddingSize: options?.embeddingSize,
      includeValues: options?.includeValues,
    });
  }
}
