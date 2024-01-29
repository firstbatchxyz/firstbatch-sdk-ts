import type {DFA, Edge, Vertex, Signal} from '../types';
import {Signals} from './signals';
import constants from '../constants';

export class Blueprint {
  vertices: Vertex[] = [];
  edges: Edge[] = [];
  map: Record<string, Vertex> = {};

  constructor(dfa: DFA) {
    // extends Signals
    // FIXME: doing this overwrites the weights if they are different!
    if (dfa.signals) {
      dfa.signals.forEach(signal => {
        Signals[signal.label] = signal;
      });
    }

    // add vertices (nodes)
    dfa.nodes.forEach(node => {
      this.addVertex({
        name: node.name,
        batchType: node.batch_type,
        params: {
          ...constants.DEFAULTS.PARAMS,
          ...node.params,
        },
      });
    });

    // add edges
    dfa.edges.forEach(edge => {
      if (!(edge.edge_type in Signals)) {
        throw `No signal found for: ${edge.edge_type} of edge ${edge.name}.`;
      }
      if (!(edge.start in this.map)) {
        throw `Start vertex '${edge.start}' of edge ${edge.name} does not exist.`;
      }
      if (!(edge.end in this.map)) {
        throw `End vertex '${edge.end}' of edge ${edge.name} does not exist.`;
      }

      this.addEdge({
        name: edge.name,
        signal: Signals[edge.edge_type],
        start: this.map[edge.start],
        end: this.map[edge.end],
      });
    });

    // validate connections
    this.vertices.forEach(node => {
      // get edges that have this node as the starting node
      const edges = this.edges.filter(e => e.start.name === node.name);

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
  }

  addVertex(vertex: Vertex) {
    // no duplicate vertices with the same name allowed
    if (vertex.name in this.map) {
      throw new Error(`Vertex '${vertex.name}' already exists`);
    }

    this.vertices.push(vertex);
    this.map[vertex.name] = vertex;
  }

  addEdge(edge: Edge) {
    // no duplicate edge names allowed
    if (this.edges.some(e => e.name === edge.name)) {
      throw new Error(`Edge '${edge.name}' already exists`);
    }

    // check if vertices exist
    // we expect them to exist because vertices are added before edges in `parseDFA`
    if (!(edge.start.name in this.map)) {
      throw new Error('Could not find the start vertex named: ' + edge.start.name);
    }
    if (!(edge.end.name in this.map)) {
      throw new Error('Could not find the end vertex named: ' + edge.end.name);
    }

    this.edges.push(edge);
  }

  /**
   *
   * @param state name of the current state (vertex)
   * @param signal signal to be applied
   * @returns the source and destination vertices
   */
  step(state: string, signal: Signal): {source: Vertex; destination: Vertex} {
    // find the vertex with this state
    let source: Vertex;
    if (!(state in this.map)) {
      if (state === '0') {
        // FIXME: edge case until API is fixed
        // API will request the state 0 referring to the first state.
        // is this due to "initial state" maybe?
        source = this.vertices[0];
      } else {
        throw new Error('No vertex found for ' + state);
      }
    } else {
      source = this.map[state];
    }

    // find an edge from that vertex with the given action, or a DEFAULT edge
    const edge =
      this.edges.find(e => e.start.name === source.name && e.signal.label === signal.label) ||
      this.edges.find(e => e.signal.label === Signals.DEFAULT.label);

    if (!edge) {
      // this should never happen if DFA parser works correctly
      throw new Error('Expected to find an edge.');
    }

    return {source, destination: edge.end};
  }
}
