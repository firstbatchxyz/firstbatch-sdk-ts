import {UserAction} from './action';
import {Signals} from './signal';
import type {Params} from './params';

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

    // check the start vertex
    if (edge.start.name in this.map) {
      if (!edge.start.eq(this.map[edge.start.name])) {
        throw new Error('Start vertex is not equal to an existing vertex with the same name');
      }
    } else {
      this.addVertex(edge.start);
    }

    // check the end vertex
    if (edge.end.name in this.map) {
      if (!edge.end.eq(this.map[edge.end.name])) {
        throw new Error('End vertex is not equal to an existing vertex with the same name');
      }
    } else {
      this.addVertex(edge.end);
    }

    this.edges.push(edge);
  }

  getOperation(state: string): Vertex {
    return this.map[state];
  }

  step(state: string, action: UserAction): [Vertex, Vertex['batchType'], Params] {
    // find the vertex with this state
    let vertex: Vertex;
    if (!(state in this.map)) {
      if (state === '0') {
        // FIXME: edge case until API is fixes
        vertex = this.vertices[0];
      } else {
        throw new Error('No vertex found for ' + state);
      }
    } else {
      vertex = this.map[state];
    }

    // find an edge from that vertex with the given action, or one that has DEFAULT signal
    const edge = this.edges.find(
      e => e.start.eq(vertex) && (e.edgeType.eq(action) || Signals.DEFAULT.eq(e.edgeType.actionType))
    );
    if (!edge) {
      // this should never happen if `DFAParser.validateEdges` works correctly
      throw new Error('Expected to find an edge');
    }

    return [edge.end, vertex.batchType, vertex.params];
  }
}

export class Vertex {
  constructor(
    readonly name: string,
    readonly batchType: 'biased' | 'sampled' | 'random' | 'personalized',
    readonly params: Params
  ) {
    if (!['biased', 'sampled', 'random', 'personalized'].includes(this.batchType)) {
      throw new Error('Invalid batch type: ' + this.batchType);
    }
  }

  eq(other: Vertex) {
    return this.name === other.name && this.batchType === other.batchType && this.params.eq(other.params);
  }
}

export class Edge {
  constructor(
    readonly name: string,
    readonly edgeType: UserAction,
    readonly start: Vertex,
    readonly end: Vertex
  ) {}

  eq(other: Edge) {
    return (
      this.name === other.name &&
      this.edgeType.eq(other.edgeType) &&
      this.start.eq(other.start) &&
      this.end.eq(other.end)
    );
  }
}
