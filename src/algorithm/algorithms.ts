import type {DFA} from '../types';
import {BaseAlgorithm} from './';
import library from './blueprint/library';

export class CustomAlgorithm extends BaseAlgorithm {
  constructor(blueprint: DFA) {
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
    super('SIMPLE', library.SIMPLE);
  }
}
