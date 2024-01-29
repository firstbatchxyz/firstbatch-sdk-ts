import {describe, it, expect, beforeAll} from 'bun:test';
import {ScalarQuantizer} from '../src/lossy/scalar';
import {flatten, matrix, equal as mathEqual} from 'mathjs';
import {meanAbsoluteError} from './utils/vector';
import {ProductQuantizer} from '../src/lossy/product';
import {PQ} from '../src/lossy/product/pqt';
import {generateVectors} from '../src/utils';

describe('lossy compression', () => {
  const EPSILON = 1e-4;
  const data = generateVectors(1536, 1000);

  describe.skip('product quantization', () => {
    const pq = new ProductQuantizer(512, 32);

    beforeAll(() => {
      pq.train(data);
    });

    it('should compress & decompress', () => {
      const vector = data[0];
      const compressed = pq.compress(vector);
      const decompressed = pq.decompress(compressed);

      const mae = meanAbsoluteError(vector, decompressed);
      expect(mae).toBeLessThan(EPSILON);
    });

    it('should produce the same things via codewords', () => {
      const vector = data[0];

      const newPQ = new PQ(32, 512);
      const newPQRes = new PQ(32, 512);

      newPQ.codewords = pq.quantizer.codewords;
      newPQRes.codewords = pq.quantizerResidual.codewords;

      newPQ.Ds = pq.quantizer.Ds;
      newPQRes.Ds = pq.quantizerResidual.Ds;

      const m = matrix(flatten(vector));
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

  describe('scalar quantization', () => {
    const data = generateVectors(1536, 1000);
    const quantizer = new ScalarQuantizer(256);

    beforeAll(() => {
      quantizer.train(data);
    });

    it('should compress & decompress', () => {
      const vector = data[0];

      const compressed = quantizer.compress(vector);
      const decompressed = quantizer.decompress(compressed);

      const mae = meanAbsoluteError(vector, decompressed);
      expect(mae).toBeLessThan(EPSILON);
    });
  });
});
