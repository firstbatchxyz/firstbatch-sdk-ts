import type {DFA} from '../../src/types';

const withNewSignals: DFA = {
  // this is a new signals
  signals: [{label: 'NEW_SIGNAL', weight: 1.5}],
  nodes: [
    {name: '1', batch_type: 'biased', params: {mu: 0.1}},
    {name: '2', batch_type: 'random', params: {r: 0.5}},
    {name: '3', batch_type: 'sampled', params: {}},
  ],
  edges: [
    {name: 'edge0', edge_type: 'NEW_SIGNAL', start: '1', end: '3'},
    {name: 'edge1', edge_type: 'LIKE', start: '1', end: '2'},
    {name: 'edge2', edge_type: 'BATCH', start: '1', end: '3'},
    {name: 'edge3', edge_type: 'DEFAULT', start: '1', end: '3'},
    {name: 'edge4', edge_type: 'BATCH', start: '2', end: '3'},
    {name: 'edge5', edge_type: 'DEFAULT', start: '2', end: '2'},
    {name: 'edge6', edge_type: 'BATCH', start: '3', end: '2'},
    {name: 'edge7', edge_type: 'DEFAULT', start: '3', end: '2'},
    {name: 'edge8', edge_type: 'LIKE', start: '3', end: '1'},
  ],
};

const withBatchesAndDefaults: DFA = {
  nodes: [
    {name: '0', batch_type: 'random', params: {}},
    {name: '1', batch_type: 'biased', params: {mu: 0.0}},
    {name: '2', batch_type: 'biased', params: {mu: 0.5}},
    {name: '3', batch_type: 'biased', params: {mu: 1.0}},
  ],
  edges: [
    {name: 'edge1', edge_type: 'BATCH', start: '0', end: '0'},
    {name: 'edge2', edge_type: 'DEFAULT', start: '0', end: '1'},
    {name: 'edge3', edge_type: 'DEFAULT', start: '1', end: '1'},
    {name: 'edge4', edge_type: 'BATCH', start: '1', end: '2'},
    {name: 'edge5', edge_type: 'DEFAULT', start: '2', end: '1'},
    {name: 'edge6', edge_type: 'BATCH', start: '2', end: '3'},
    {name: 'edge7', edge_type: 'BATCH', start: '3', end: '0'},
    {name: 'edge8', edge_type: 'DEFAULT', start: '3', end: '1'},
  ],
};

const withDuplicateNode: DFA = {
  nodes: [
    {name: '0', batch_type: 'random', params: {}},
    {name: '0', batch_type: 'biased', params: {}},
    {name: '1', batch_type: 'biased', params: {}},
  ],
  edges: [
    {name: 'edge1', edge_type: 'BATCH', start: '0', end: '0'},
    {name: 'edge2', edge_type: 'DEFAULT', start: '0', end: '1'},
  ],
};

const withDuplicateEdge: DFA = {
  nodes: [
    {name: '0', batch_type: 'random', params: {}},
    {name: '1', batch_type: 'biased', params: {}},
    {name: '2', batch_type: 'biased', params: {}},
  ],
  edges: [
    {name: 'edge1', edge_type: 'BATCH', start: '0', end: '0'},
    {name: 'edge1', edge_type: 'DEFAULT', start: '0', end: '1'},
    {name: 'edge2', edge_type: 'DEFAULT', start: '1', end: '2'},
    {name: 'edge3', edge_type: 'BATCH', start: '1', end: '2'},
  ],
};

const withInvalidEdgeStart: DFA = {
  nodes: [
    {name: '0', batch_type: 'random', params: {}},
    {name: '1', batch_type: 'biased', params: {}},
  ],
  // `end` does not exist
  edges: [{name: 'edge1', edge_type: 'BATCH', start: '2', end: '0'}],
};

const withInvalidEdgeEnd: DFA = {
  nodes: [
    {name: '0', batch_type: 'random', params: {}},
    {name: '1', batch_type: 'biased', params: {}},
  ],
  // `end` does not exist
  edges: [{name: 'edge1', edge_type: 'BATCH', start: '0', end: '2'}],
};

export default {
  withNewSignals,
  withBatchesAndDefaults,
  withDuplicateNode,
  withDuplicateEdge,
  withInvalidEdgeStart,
  withInvalidEdgeEnd,
};
