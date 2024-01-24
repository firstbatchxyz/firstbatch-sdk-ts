import type {DFA} from '../types';
import {BaseAlgorithm} from './';
import library from '../constants/library';

export class CustomAlgorithm extends BaseAlgorithm {
  constructor(blueprint: DFA) {
    super(blueprint);
  }
}

export class FactoryAlgorithm extends BaseAlgorithm {
  constructor(label: string) {
    const blueprint = library[label as keyof typeof library];
    if (!blueprint) {
      throw new Error('Could not find a DFA with label: ' + label);
    }
    super(blueprint);
  }
}

export class SimpleAlgorithm extends BaseAlgorithm {
  constructor() {
    // CONTENT_CURATION is used for the SIMPLE algorithm.
    super(library.CONTENT_CURATION);
  }
}
