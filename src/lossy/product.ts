import {CompressedVector, Vector} from '../vector/types';
import {BaseLossy} from './base';
import {PQ} from './pqt';
import {concat, Matrix, matrix} from 'mathjs';

export class ProductQuantizer extends BaseLossy {
  /** Cluster size */
  readonly ks: number;
  /** Subquantizer size */
  readonly m: number;
  readonly data: Vector[] | null = null;
  private trained = false;
  readonly quantizer: PQ;
  readonly quantizerResidual: PQ;

  constructor(clusterSize: number = 512, subquantizerSize: number = 32, verbose: boolean = false) {
    super();
    this.m = subquantizerSize;
    this.ks = clusterSize;
    this.quantizer = new PQ(subquantizerSize, clusterSize, 'l2', verbose);
    this.quantizerResidual = new PQ(subquantizerSize, clusterSize, 'l2', verbose);
  }

  train(data: Vector[]): void {
    // Encode data to PQ-codes
    if (data[0].dim % this.m !== 0) {
      throw new Error('Input dimension must be divisible by M');
    }

    if (this.trained) {
      return;
    }

    const trainX = matrix(data.map(v => v.vector));
    this.quantizer.fit(trainX);
    const xCode = this.quantizer.encode(trainX);
    const x = this.quantizer.decode(xCode);

    const residuals = trainX.map((v, i) => v - x.get(i));
    this.quantizerResidual.fit(residuals);

    this.trained = true;
  }

  compress(data: Vector): CompressedVector {
    if (!this.trained) {
      throw new Error('train() must be called before compress()');
    }

    const dataVector = matrix(data.vector);
    const x = this.quantizer.encode(dataVector);
    const decodedX = this.quantizer.decode(x.get([0]));
    const residual = this.quantizerResidual.encode(dataVector.map((value, index) => value - decodedX.get(index)));

    return {
      vector: x.get([0]),
      id: data.id,
      residual: residual.get([0]),
    };
  }
  decompress(data: CompressedVector): Vector {
    if (!this.trained) {
      throw new Error('train() must be called before decompress()');
    }

    const dataVector = matrix(data.vector);
    if (data.residual !== undefined) {
      const dataResidual: Matrix = matrix(data.residual);
      const x = this.quantizer.decode(dataVector);
      const residual = this.quantizerResidual.decode(dataResidual);
      const vector = concat(x, residual, 0); // 0 indicates vertical concatenation

      // TODO: is this cast valid?
      return {vector: vector as number[], dim: data.vector.length, id: data.id};
    } else {
      throw new Error('No residual');
    }
  }
}
