import {expect} from 'bun:test';
import type {Vector} from '../../src/types';
import {generateVector} from '../../src/utils';

/**
 * Generate `count` vectors, each with the given `dimension`.
 * Instead of returning a list of `number[]`s, it will return
 * a list of `Vector`s.
 */
// FIXME: we already have this in SRC utils?
export function generateRandomVectors(count: number, dimension: number): Vector[] {
  return Array.from({length: count}, () => generateVector(dimension));
}

/** Calculate Mean Absolute Error (MAE) between two vectors. */
export function meanAbsoluteError(a: Vector, b: Vector): number {
  return absoluteError(a, b) / a.length;
}

/** Calculate absolute error between two vectors. */
export function absoluteError(a: Vector, b: Vector): number {
  expect(a.length).toBe(b.length);

  let sum = 0;
  for (let i = 0; i < a.length; ++i) {
    sum += Math.abs(a[i] - b[i]);
  }
  return sum;
}
