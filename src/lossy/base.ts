import {CompressedVector, Vector} from '../vector/types';

/** Base class for lossy compression algorithms. */
export abstract class BaseLossy {
  abstract train(data: Vector[]): void;
  abstract compress(data: Vector): CompressedVector;
  abstract decompress(data: CompressedVector): Vector;
}
