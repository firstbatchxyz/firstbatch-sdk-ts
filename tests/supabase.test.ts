import {describe, it} from 'bun:test';
import {createClient} from '@supabase/supabase-js';
import constants from './constants';
import {Supabase} from '../src';
import {FetchQuery, generateQuery} from '../src/vector';

// FIXME: remove this test suite when Supabase is done

describe('supabase', () => {
  let vs: Supabase;

  it('should connect', async () => {
    const client = createClient(constants.SUPABASE.URL, constants.SUPABASE.KEY);
    vs = new Supabase(client, {
      collectionName: 'new',
      queryName: 'match_documents',
    });
  });

  it('should search', async () => {
    const query = generateQuery(1, 1536, 10, true).next().value;
    const result = await vs.fetch(new FetchQuery('0'));
    console.log(result);
  });
});
