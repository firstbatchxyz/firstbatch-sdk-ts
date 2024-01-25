import {QueryResult} from '../vector/query';
import {Query, Vector} from '../types';
import {divide, index, matrix, Matrix, multiply, norm, range} from 'mathjs';
import constants from '../constants';

function getRow(matrix: Matrix, ind: number): Matrix {
  return matrix.subset(index(ind, range(0, matrix.size()[1])));
}

function argsort(mat: Matrix): number[] {
  const array2D: number[][] = matrix(mat).toArray() as number[][];
  const indices: number[] = array2D.map((_, index) => index);
  indices.sort((a, b) => array2D[a][0] - array2D[b][0]);

  return indices;
}

/** Generate a random vector with the specified dimension.  */
export function randomVector(dim: number): number[] {
  const vec = new Array(dim).fill(0).map(() => Math.random());
  const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  return vec.map(val => val / (norm + Number.EPSILON));
}

/** Generate an array of random vectors with the specified dimension and count. */
export function generateVectors(dim: number, numVectors: number): Vector[] {
  return Array.from({length: numVectors}, (_, i) => {
    const vector = randomVector(dim);
    return {vector, dim, id: i.toString()};
  });
}

export function generateQuery(numVecs: number, dim: number, topK: number, includeValues: boolean): Query {
  return {
    embedding: generateVectors(dim, 1)[0],
    top_k: topK,
    top_k_mmr: Math.floor(topK / constants.MMR_TOPK_FACTOR),
    include_values: includeValues,
    filter: {},
    include_metadata: true,
  };
}

// TODO: instead of random_batch_request with defaults, have the defaults apply here?
export function generateBatch(numVecs: number, dim: number, topK: number, includeValues: boolean): Query[] {
  return Array.from({length: numVecs}, () => generateQuery(numVecs, dim, topK, includeValues));
}

// Adjust weights to meet batch size requirements.
export function adjustWeights(weights: number[], batchSize: number, confidenceInterval: number): number[] {
  const minWeight = Math.min(...weights);
  if (minWeight < 1) {
    const diff = 1 - minWeight;
    weights = weights.map(w => w + diff);
  }

  const sum = weights.reduce((sum, w) => sum + w, 0);
  if (!(batchSize - confidenceInterval <= sum && sum <= batchSize + confidenceInterval)) {
    const scaleFactor = batchSize / sum;
    weights = weights.map(w => Math.ceil(w * scaleFactor));
  }

  return weights;
}

// Perform maximal marginal relevance ranking.
export function maximalMarginalRelevance(
  queryEmbedding: Vector,
  batch: QueryResult,
  lambdaMult: number = 0.5,
  k: number = 4
): QueryResult {
  const embeddings: Matrix = batch.toNdArray();
  const query: Matrix = matrix(queryEmbedding.vector);

  if (Math.min(k, embeddings.size()[0]) <= 0) {
    // return the input QueryResult itself
    return batch;
  }

  const queryMatrix = matrix(query);
  const embeddingsNorm = norm(embeddings, 'fro');
  const queryNorm = norm(queryMatrix, 'fro');
  const a = multiply(embeddings, queryMatrix);
  const b = multiply(embeddingsNorm, queryNorm);

  const dists = divide(a, b) as Matrix;
  const minVal: number[] = argsort(dists);

  const indices: number[] = [minVal[0]];
  let selected = getRow(embeddings, minVal[0]).toArray() as number[][];
  while (indices.length < Math.min(k, embeddings.size()[0])) {
    let bestScore = -Infinity;
    let idxToAdd = -1;
    const similarityToSelected = cosineSimilarityMatrix(embeddings.toArray() as number[][], selected);

    for (let i = 0; i < dists.size()[0]; i++) {
      if (indices.includes(i)) {
        continue;
      }
      const queryScore = dists.get([i]);
      const redundantScore = Math.max(...similarityToSelected[i]);
      const equationScore = lambdaMult * queryScore - (1 - lambdaMult) * redundantScore;

      if (equationScore > bestScore) {
        bestScore = equationScore;
        idxToAdd = i;
      }
    }
    indices.push(idxToAdd);
    selected = selected.concat(getRow(embeddings, idxToAdd).toArray() as number[]);
  }

  return new QueryResult({
    ids: indices.map(i => batch.ids[i]),
    scores: indices.map(i => batch.scores[i]),
    vectors: indices.map(i => batch.vectors[i]),
    metadatas: indices.map(i => batch.metadatas[i]),
  });
}

// Calculate cosine similarity between two matrices.
function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, index) => sum + val * b[index], 0);
}

function magnitude(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
}

function cosineSimilarityMatrix(A: number[][], B: number[][]): number[][] {
  if (A[0].length !== B[0].length) {
    throw new Error('Matrices must have the same number of columns');
  }

  const similarities: number[][] = [];
  for (let i = 0; i < A.length; i++) {
    const rowSimilarities: number[] = [];
    for (let j = 0; j < B.length; j++) {
      const dot = dotProduct(A[i], B[j]);
      const magA = magnitude(A[i]);
      const magB = magnitude(B[j]);
      rowSimilarities.push(dot / (magA * magB));
    }
    similarities.push(rowSimilarities);
  }
  return similarities;
}

export function concatVectors(self: Vector, other: Vector): Vector {
  return {vector: self.vector.concat(other.vector), id: self.id + '_' + other.id};
}
