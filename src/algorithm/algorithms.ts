import {BaseAlgorithm} from './';
import library from './blueprint/library';

export class CustomAlgorithm extends BaseAlgorithm {
  constructor(blueprint: string | object) {
    super('CUSTOM', blueprint);
  }
}

export class FactoryAlgorithm extends BaseAlgorithm {
  constructor(label: string) {
    const blueprint = library[label as keyof typeof library];
    if (!blueprint) {
      throw new Error('Could not find a DFA with label: ' + label);
    }

    super('FACTORY', blueprint);
  }
}

export class SimpleAlgorithm extends BaseAlgorithm {
  constructor() {
    // CONTENT_CURATION is chosen as the Simple algorithm.
    const blueprint = library.CONTENT_CURATION;

    super('SIMPLE', blueprint);
  }
}
