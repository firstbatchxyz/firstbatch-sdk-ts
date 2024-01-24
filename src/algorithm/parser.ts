import {Blueprint} from './blueprint';
import {Signals} from '../constants/signal';
import type {DFA, Vertex} from '../types';

const defaultNodeParams: Vertex['params'] = {
  mu: 0,
  alpha: 0,
  r: 0,
  last_n: 0,
  n_topics: 0,
  remove_duplicates: true,
  apply_threshold: 0,
  apply_mmr: false,
};

/**
 * Parse a given Blueprint DFA to obtain a Blueprint instance.
 *
 * @param dfa DFA (deterministic finite automata)
 * @returns a {@link Blueprint}
 */
export function parseDFA(dfa: DFA): Blueprint {
  const blueprint = new Blueprint();

  // extends Signals
  // FIXME: doing this overwrites the weights if they are different!
  if (dfa.signals) {
    dfa.signals.forEach(signal => {
      Signals[signal.label] = signal;
    });
  }

  // add vertices (nodes)
  dfa.nodes.forEach(node => {
    blueprint.addVertex({
      name: node.name,
      batchType: node.batch_type,
      params: {
        ...defaultNodeParams,
        ...node.params,
      },
    });
  });

  // add edges
  dfa.edges.forEach(edge => {
    if (!(edge.edge_type in Signals)) {
      throw `No signal found for: ${edge.edge_type}`;
    }

    blueprint.addEdge({
      name: edge.name,
      signal: Signals[edge.edge_type],
      start: blueprint.map[edge.start],
      end: blueprint.map[edge.end],
    });
  });

  // validate connections
  blueprint.vertices.forEach(node => {
    // get edges that have this node as the starting node
    const edges = blueprint.edges.filter(e => e.start.name === node.name);

    // find edges that are not BATCH actions
    const nonBatchEdges = edges.filter(e => e.signal.label !== 'BATCH');

    // check if edges that have this node as its start vertex contain 'batch' action
    if (nonBatchEdges.length === edges.length) {
      throw new Error(`Node '${node.name}' is missing a 'BATCH' signal.`);
    }

    // within all action types of these edges, we must either have all signals; or some amount of signals along with the DEFAULT signal
    const signals = nonBatchEdges.map(e => e.signal);
    if (!signals.some(s => s.label === 'DEFAULT') && signals.length !== Object.keys(Signals).length) {
      throw new Error(`Node '${node.name}' does not have all signals covered, or is missing the DEFAULT signal.`);
    }
  });

  return blueprint;
}
