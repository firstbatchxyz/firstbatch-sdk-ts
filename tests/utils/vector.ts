import {expect} from 'bun:test';
import {Vector} from '../../src/vector/types';
import {randomVector} from '../../src/vector/utils';

/**
 * Generate `count` vectors, each with the given `dimension`.
 * Instead of returning a list of `number[]`s, it will return
 * a list of `Vector`s.
 */
export function generateRandomVectors(count: number, dimension: number): Vector[] {
  return Array.from({length: count}, (_, i) => ({
    vector: randomVector(dimension),
    dim: dimension,
    id: i.toString(),
  }));
}

/** Calculate Mean Absolute Error (MAE) between two vectors. */
export function meanAbsoluteError(a: Vector, b: Vector): number {
  return absoluteError(a, b) / a.dim;
}

/** Calculate absolute error between two vectors. */
export function absoluteError(a: Vector, b: Vector): number {
  expect(a.dim).toBe(b.dim);

  let sum = 0;
  for (let i = 0; i < a.dim; ++i) {
    sum += Math.abs(a.vector[i] - b.vector[i]);
  }
  return sum;
}
