import {BaseAlgorithm} from './base';
import library from './blueprint/library';

export class FactoryAlgorithm extends BaseAlgorithm {
  constructor(
    label: string,
    batchSize: number,
    options?: {
      embeddingSize?: number;
      includeValues?: boolean;
    }
  ) {
    if (!(label in library)) {
      throw new Error('Could not find a DFA with label: ' + label);
    }

    // TODO: 'RECOMMENDATIONS' this is intentional as the label
    // but why not pass in the `label` itself?
    super('RECOMMENDATIONS', batchSize, {
      blueprint: library[label as keyof typeof library],
      embeddingSize: options?.embeddingSize,
      includeValues: options?.includeValues,
    });
  }
}
