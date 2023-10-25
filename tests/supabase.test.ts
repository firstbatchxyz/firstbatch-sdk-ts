import {describe, it} from 'bun:test';
import {createClient} from '@supabase/supabase-js';
import constants from './constants';
import {Supabase} from '../src';
describe('supabase', () => {
  it('should connect and stuff', async () => {
    const client = createClient(constants.SUPABASE.URL, constants.SUPABASE.KEY);
    const vs = new Supabase(client);
  });
});
