import type {CompressedVector, Vector} from '../../types';

/** Base class for lossy compression algorithms. */
export interface BaseLossy {
  train(data: Vector[]): void;
  compress(data: Vector): CompressedVector;
  decompress(data: CompressedVector): Vector;
}
