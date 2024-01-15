import {describe, it, expect, beforeAll} from 'bun:test';
import {ScalarQuantizer} from '../src/lossy/scalar';
import {flatten, matrix, equal as mathEqual} from 'mathjs';
import {generateRandomVectors, meanAbsoluteError} from './utils/vector';
import {ProductQuantizer} from '../src/lossy/product';
import {PQ} from '../src/lossy/product/pqt';

describe('lossy compression', () => {
  const EPSILON = 1e-4; // FIXME: aggree on an eps value
  const data = generateRandomVectors(1000, 1536);

  describe.skip('via product quantization', () => {
    const pq = new ProductQuantizer(512, 32);

    beforeAll(() => {
      pq.train(data);
    });

    it('should compress & decompress', () => {
      const vector = data[0];

      const compressed = pq.compress(vector);
      expect(compressed.id).toBe(vector.id);

      const decompressed = pq.decompress(compressed);
      expect(decompressed.id).toBe(vector.id);

      const mae = meanAbsoluteError(vector, decompressed);
      expect(mae).toBeLessThan(EPSILON);
    });

    it('should reproduce (?)', () => {
      const vector = data[0];

      const newPQ = new PQ(32, 512);
      const newPQRes = new PQ(32, 512);

      newPQ.codewords = pq.quantizer.codewords;
      newPQRes.codewords = pq.quantizerResidual.codewords;

      newPQ.Ds = pq.quantizer.Ds;
      newPQRes.Ds = pq.quantizerResidual.Ds;

      const m = matrix(flatten(vector.vector));
      {
        const comp = pq.quantizer.encode(m);
        const newComp = newPQ.encode(m);
        expect(mathEqual(comp, newComp)).toBeTrue();
      }
      {
        const comp = pq.quantizerResidual.encode(m);
        const newComp = newPQRes.encode(m);
        expect(mathEqual(comp, newComp)).toBeTrue();
      }
    });
  });

  describe('via scalar quantization', () => {
    const data = generateRandomVectors(1000, 1536);
    const quantizer = new ScalarQuantizer(256);

    beforeAll(() => {
      quantizer.train(data);
    });

    it('should compress & decompress', () => {
      const vector = data[0];

      const compressed = quantizer.compress(vector);
      expect(compressed.id).toBe(vector.id);

      const decompressed = quantizer.decompress(compressed);
      expect(decompressed.id).toBe(vector.id);

      const mae = meanAbsoluteError(vector, decompressed);
      expect(mae).toBeLessThan(EPSILON);
    });
  });
});
