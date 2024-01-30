import type {Quantizer, CompressedVector, Vector} from '../../types';
import {TDigest} from 'tdigest';

export class ScalarQuantizer implements Quantizer {
  private quantizer: TDigest;
  private levels: number;
  quantiles: number[] = [];

  constructor(levels: number = 256) {
    this.quantizer = new TDigest(false);
    this.levels = levels;
    this.quantiles = [];
  }

  train(data: Vector[]): void {
    // concat all vectors within the data
    const scalars = data.reduce((acc, cur) => acc.concat(cur));

    for (const scalar of scalars) {
      this.quantizer.push(scalar);
    }
    this.quantiles = Array.from({length: this.levels}, (_, i) => this.quantizer.percentile(i / this.levels));
  }

  findIndex(scalar: number): number {
    for (let i = 0; i < this.quantiles.length; i++) {
      if (scalar < this.quantiles[i]) {
        return i;
      }
    }
    return this.levels - 1;
  }

  private dequantize(qv: number[]): number[] {
    return qv.map(val => this.quantiles[val]);
  }

  private quantize(v: number[]): number[] {
    return v.map(val => this.quantizeScalar(val));
  }

  private quantizeScalar(scalar: number): number {
    return this.findIndex(scalar);
  }

  compress(data: Vector): CompressedVector {
    const quantizedData: number[] = this.quantize(data);
    return {
      vector: quantizedData,
      // id: data.id,
    };
  }

  decompress(data: CompressedVector): Vector {
    return this.dequantize(data.vector);
  }
}
