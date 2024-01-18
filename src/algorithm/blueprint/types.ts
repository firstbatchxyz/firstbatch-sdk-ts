import type {Vertex} from './blueprint';
import type {ParamsInterface} from './params';

/** A Deterministic Finite Automata. */
export interface DFA {
  signals?: {
    label: string;
    weight: number;
  }[];
  nodes: {
    name: string;
    batch_type: Vertex['batchType'];
    params: Partial<ParamsInterface>;
  }[];
  edges: {
    name: string;
    edge_type: string;
    start: string;
    end: string;
  }[];
}
