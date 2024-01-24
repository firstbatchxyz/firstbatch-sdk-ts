import {Signals} from '../constants/signal';
import type {Edge, Vertex, Signal} from '../types';

export class Blueprint {
  vertices: Vertex[] = [];
  edges: Edge[] = [];
  map: Record<string, Vertex> = {};

  addVertex(vertex: Vertex) {
    // no duplicate vertices with the same name allowed
    if (vertex.name in this.map) {
      throw new Error(`Vertex: name '${vertex.name}' already exists`);
    }

    this.vertices.push(vertex);
    this.map[vertex.name] = vertex;
  }

  addEdge(edge: Edge) {
    // no duplicate edge names allowed
    if (this.edges.some(e => e.name === edge.name)) {
      throw new Error('An edge with the same name exists');
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
      throw new Error('Expected to find an edge');
    }

    const destination = edge.end;

    return {source, destination};
  }
}
