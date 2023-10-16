import {UserAction} from './action';
import {Blueprint, Edge, Vertex} from './blueprint';
import {Params, ParamsInterface} from './params';
import {PresetSignalNames, Signal, Signals} from './signal';

export class DFAParser {
  data: {
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
      edge_type: PresetSignalNames | 'BATCH';
      start: string;
      end: string;
    }[];
  };
  blueprint: Blueprint;

  constructor(blueprint: string | object) {
    // perhaps only allow type-safe object here?
    // let the user JSON.parse outside?
    if (typeof blueprint === 'string') {
      this.data = JSON.parse(blueprint);
    } else {
      // FIXME: can we maybe not do this type-narrow here?
      this.data = blueprint as typeof this.data;
    }
    this.blueprint = new Blueprint();
  }

  private validateEdges(): void {
    for (const node of this.blueprint.vertices) {
      // get edges that have this node as the starting node
      const edges = this.blueprint.edges.filter(e => e.start.eq(node));

      // check if edges that have this node as its start vertex contain 'batch' action
      if (!edges.some(e => e.edgeType.isBatch)) {
        throw new Error(`Node '${node.name}' is missing a 'BATCH' typed edge.`);
      }

      // within all action types of these edges, we must either have all signals; or some amount of signals along with the DEFAULT signal
      const actionTypes = edges.filter(e => !e.edgeType.isBatch).map(e => e.edgeType.actionType);
      if (!actionTypes.some(e => e.eq(Signals.DEFAULT)) && actionTypes.length !== Object.keys(Signals).length) {
        throw new Error(`Node '${node.name}' does not have all signals covered, or is missing the default signal.`);
      }
    }
  }

  parse(): Blueprint {
    if (this.data.signals) {
      Signal.extend(Signals, this.data.signals);
    }

    if (!this.data.nodes) throw new Error("Expected 'nodes' in data.");
    for (const node of this.data.nodes) {
      this.blueprint.addVertex(new Vertex(node.name, node.batch_type, new Params(node.params)));
    }

    if (!this.data.edges) throw new Error("Expected 'edges' in data.");
    for (const edge of this.data.edges) {
      this.blueprint.addEdge(
        new Edge(
          edge.name,
          new UserAction(edge.edge_type),
          this.blueprint.map[edge.start],
          this.blueprint.map[edge.end]
        )
      );
    }

    this.validateEdges();
    return this.blueprint;
  }
}
