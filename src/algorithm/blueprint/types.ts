import type {Vertex} from './blueprint';
import type {ParamsInterface} from './params';
import type {Signal} from './signal';

/** A Deterministic Finite Automata. */
export interface DFA {
  signals?: Signal[];
  nodes: {
    name: string;
    batch_type: Vertex['batchType'];
    params: Partial<ParamsInterface>;
  }[];
  edges: {
    name: string;
    edge_type: Signal['label'];
    start: string;
    end: string;
  }[];
}
