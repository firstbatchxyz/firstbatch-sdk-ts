import {expect} from 'bun:test';

/** Calculate Mean Absolute Error (MAE) between two vectors. */
export function meanAbsoluteError(a: number[], b: number[]): number {
  return absoluteError(a, b) / a.length;
}

/** Calculate absolute error between two vectors. */
export function absoluteError(a: number[], b: number[]): number {
  expect(a.length).toBe(b.length);

  let sum = 0;
  for (let i = 0; i < a.length; ++i) {
    sum += Math.abs(a[i] - b[i]);
  }
  return sum;
}
