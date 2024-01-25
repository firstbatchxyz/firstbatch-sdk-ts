import type {Quantizer, CompressedVector, Vector} from '../../types';
import {concatVectors} from '../../utils';
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
    // TODO: we probably dont need the initial value here
    const scalars = data.reduce((acc, cur) => concatVectors(acc, cur), {vector: [], id: ''});

    for (const scalar of scalars.vector) {
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
    const quantizedData: number[] = this.quantize(data.vector);
    return {
      vector: quantizedData,
      id: data.id,
    };
  }

  decompress(data: CompressedVector): Vector {
    const dequantizedData: number[] = this.dequantize(data.vector);
    return {vector: dequantizedData, id: data.id};
  }
}
