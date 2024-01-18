import {UserAction} from './action';
import {Blueprint, Edge, Vertex} from './blueprint';
import {Params} from './params';
import {Signal, Signals} from './signal';
import type {DFA} from './types';

/**
 * Parse a given Blueprint DFA to obtain a Blueprint instance.
 *
 * @param dfa DFA (deterministic finite automata)
 * @returns blueprint
 */
export function parseDFA(dfa: DFA): Blueprint {
  const blueprint = new Blueprint();

  // extends Signals // TODO: why do this?
  if (dfa.signals) {
    Signal.extend(Signals, dfa.signals);
  }

  // add vertices (nodes)
  dfa.nodes.forEach(node => {
    blueprint.addVertex(new Vertex(node.name, node.batch_type, new Params(node.params)));
  });

  // add edges
  dfa.edges.forEach(edge => {
    blueprint.addEdge(
      new Edge(edge.name, new UserAction(edge.edge_type), blueprint.map[edge.start], blueprint.map[edge.end])
    );
  });

  // validate connections
  blueprint.vertices.forEach(node => {
    // get edges that have this node as the starting node
    const edges = blueprint.edges.filter(e => e.start.eq(node));

    // check if edges that have this node as its start vertex contain 'batch' action
    if (!edges.some(e => e.edgeType.isBatch)) {
      throw new Error(`Node '${node.name}' is missing a 'BATCH' typed edge.`);
    }

    // within all action types of these edges, we must either have all signals; or some amount of signals along with the DEFAULT signal
    const actionTypes = edges.filter(e => !e.edgeType.isBatch).map(e => e.edgeType.actionType);
    if (!actionTypes.some(e => e.eq(Signals.DEFAULT)) && actionTypes.length !== Object.keys(Signals).length) {
      throw new Error(`Node '${node.name}' does not have all signals covered, or is missing the default signal.`);
    }
  });

  return blueprint;
}
