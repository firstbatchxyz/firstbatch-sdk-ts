import {BaseAlgorithm} from './';
import library from './blueprint/library';

export class CustomAlgorithm extends BaseAlgorithm {
  constructor(blueprint: string | object, batchSize: number, options?: {includeValues?: boolean}) {
    super('CUSTOM', batchSize, {
      blueprint: blueprint,
      includeValues: options?.includeValues,
    });
  }
}

export class FactoryAlgorithm extends BaseAlgorithm {
  constructor(
    label: string,
    batchSize: number,
    options?: {
      includeValues?: boolean;
    }
  ) {
    if (!(label in library)) {
      throw new Error('Could not find a DFA with label: ' + label);
    }

    super('FACTORY', batchSize, {
      blueprint: library[label as keyof typeof library],
      includeValues: options?.includeValues,
    });
  }
}

export class SimpleAlgorithm extends BaseAlgorithm {
  constructor(batchSize: number, options?: {includeValues?: boolean}) {
    super('SIMPLE', batchSize, {
      blueprint: library.CONTENT_CURATION, // alias: Simple
      includeValues: options?.includeValues,
    });
  }
}
