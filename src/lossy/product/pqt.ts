import {index, Matrix, matrix, range, subtract, sum, zeros} from 'mathjs';
import {kMeans} from './kmeans2';

function computePairwiseDistances(collection1: Matrix, collection2: Matrix): number[][] {
  const distances: number[][] = [];

  for (let i = 0; i < collection1.size()[0]; i++) {
    distances[i] = [];
    for (let j = 0; j < collection2.size()[0]; j++) {
      distances[i][j] = euclideanDistance(collection1.get([i]), collection2.get([j]));
    }
  }

  return distances;
}

function euclideanDistance(matrix1: Matrix, matrix2: Matrix): number {
  const diffMatrix = subtract(matrix1, matrix2);
  const squaredMatrix = diffMatrix.map(value => Math.pow(value, 2));
  const sumOfSquared = sum(squaredMatrix) as number;
  return Math.sqrt(sumOfSquared);
}

function argminAlongAxis(arr: number[][], axis: number): number[] {
  if (axis < 0 || axis >= arr[0].length) {
    throw new Error('Invalid axis');
  }

  const result: number[] = [];

  for (let i = 0; i < arr.length; i++) {
    const row = arr[i];
    let minIndex = 0;
    let minValue = row[0];

    for (let j = 1; j < row.length; j++) {
      if (axis === 0 && row[j] < minValue) {
        minValue = row[j];
        minIndex = j;
      } else if (axis === 1 && row[j] < row[minIndex]) {
        minIndex = j;
      }
    }

    result.push(minIndex);
  }

  return result;
}

function vq(obs: Matrix, codeBook: Matrix) {
  if (obs.size()[0] !== codeBook.size()[0]) {
    throw new Error('Observation and code_book should have the same number of features');
  }

  let reshapedObs;
  let reshapedCodeBook;
  if (obs.size()[0] === 1) {
    // Reshape obs and codeBook if they are 1D arrays
    reshapedObs = obs.map(val => [val[0]]);
    reshapedCodeBook = codeBook.map(val => [val[0]]);
  }
  obs = reshapedObs || obs;
  codeBook = reshapedCodeBook || codeBook;

  const distances: number[][] = computePairwiseDistances(obs, codeBook);
  const code = argminAlongAxis(distances, 1);
  const minDist = 0;
  return [code, minDist];
}

export class PQ {
  M: number;
  Ks: number;
  metric: 'l2' | 'dot';
  verbose: boolean;
  code_dtype: 'uint8' | 'uint16' | 'uint32';
  codewords: Matrix;
  Ds: number;

  constructor(M: number, Ks: number = 256, metric: 'l2' | 'dot' = 'l2', verbose: boolean = true) {
    if (!(0 < Ks && Ks <= 2 ** 32)) {
      throw new Error('Ks must be within the range (0, 2^32]');
    }

    if (!(metric === 'l2' || metric === 'dot')) {
      throw new Error('Metric must be either "l2" or "dot"');
    }

    this.M = M;
    this.Ks = Ks;
    this.metric = metric;
    this.verbose = verbose;
    this.code_dtype = Ks <= 2 ** 8 ? 'uint8' : Ks <= 2 ** 16 ? 'uint16' : 'uint32';
    this.codewords = new Matrix();
    this.Ds = 0;

    if (verbose) {
      console.log(`M: ${M}, Ks: ${Ks}, metric: ${metric}, code_dtype: ${this.code_dtype}`);
    }
  }

  isEqual(other: PQ): boolean {
    return (
      this.M === other.M &&
      this.Ks === other.Ks &&
      this.metric === other.metric &&
      this.verbose === other.verbose &&
      this.code_dtype === other.code_dtype &&
      JSON.stringify(this.codewords) === JSON.stringify(other.codewords)
    );
  }

  fit(vecs: Matrix, iter: number = 20, seed: number = 123, minit: string = 'points'): PQ {
    if (!vecs) {
      throw new Error('vecs must be a valid math.js Matrix');
    }

    if (typeof vecs.get([0, 0]) !== 'number' || vecs.size().length !== 2) {
      throw new Error('vecs must be a 2D Matrix of numbers');
    }

    const [N, D] = vecs.size();

    if (!(this.Ks < N)) {
      throw new Error('The number of training vectors should be more than Ks');
    }

    if (!(D % this.M === 0)) {
      throw new Error('Input dimension must be divisible by M');
    }

    if (!['random', '++', 'points', 'matrix'].includes(minit)) {
      throw new Error('minit must be one of "random", "++", "points", or "matrix"');
    }

    this.Ds = D / this.M;

    if (this.verbose) {
      console.log(`iter: ${iter}, seed: ${seed}`);
    }
    this.codewords = zeros([this.M, this.Ks, this.Ds]) as Matrix;

    for (let m = 0; m < this.M; m++) {
      if (this.verbose) {
        console.log(`Training the subspace: ${m} / ${this.M}`);
      }

      const vecs_sub = vecs.subset(index(range(0, N), range(m * this.Ds, (m + 1) * this.Ds)));

      const codewords_m = matrix(kMeans(vecs_sub.toArray() as number[][], this.Ks, 20));

      this.codewords.set([0, m], codewords_m);
    }

    return this;
  }

  encode(vecs: Matrix): Matrix {
    if (!vecs) {
      throw new Error('vecs must be a valid math.js Matrix');
    }

    if (vecs.size().length !== 2 || typeof vecs.get([0, 0]) !== 'number') {
      throw new Error('vecs must be a 2D Matrix of numbers');
    }

    const [N] = vecs.size();

    if (!(vecs.size()[1] === this.Ds * this.M)) {
      throw new Error('Input dimension must be Ds * M');
    }

    const codes: Matrix = new Matrix();

    for (let m = 0; m < this.M; m++) {
      if (this.verbose) {
        console.log(`Encoding the subspace: ${m} / ${this.M}`);
      }

      const vecs_sub = vecs.subset(index(range(0, N), range(m * this.Ds, (m + 1) * this.Ds)));

      for (let i = 0; i < vecs_sub.size()[0]; i++) {
        const [clusterIndex] = vq(vecs_sub.get([i]), this.codewords.get([m]));
        codes.subset([i, m], clusterIndex);
      }
    }

    return codes;
  }

  decode(codes: Matrix): Matrix {
    if (!(Array.isArray(codes) && codes.length > 0)) {
      throw new Error('codes must be a non-empty array');
    }

    const N = codes.length;

    if (!(codes[0].length === this.M)) {
      throw new Error('The number of columns in codes must be equal to M');
    }

    const vecs = zeros(N, this.Ds * this.M) as Matrix;

    for (let m = 0; m < this.M; m++) {
      const codewords_m = this.codewords.get([m]);
      for (let n = 0; n < N; n++) {
        vecs.subset(index(n, range(m * this.Ds, (m + 1) * this.Ds)), codewords_m[n]);
      }
    }

    return vecs;
  }
}
