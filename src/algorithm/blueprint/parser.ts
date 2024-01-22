import {Blueprint, Edge, Vertex} from './blueprint';
import {Params} from './params';
import {Signals} from './signal';
import type {DFA} from '../../types';

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
    blueprint.addVertex(new Vertex(node.name, node.batch_type, new Params(node.params)));
  });

  // add edges
  dfa.edges.forEach(edge => {
    if (!(edge.edge_type in Signals)) {
      throw `No signal found for: ${edge.edge_type}`;
    }
    const signal = Signals[edge.edge_type];
    blueprint.addEdge(new Edge(edge.name, signal, blueprint.map[edge.start], blueprint.map[edge.end]));
  });

  // validate connections
  blueprint.vertices.forEach(node => {
    // get edges that have this node as the starting node
    const edges = blueprint.edges.filter(e => e.start.eq(node));

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
