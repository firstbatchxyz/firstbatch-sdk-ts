const example1: string = `{
  "signals": [
    {"label": "NEW_SIGNAL", "weight": 1.5}
  ],
  "nodes": [
    {"name": "1", "batch_type": "biased",  "params": {"mu":0.1}},
    {"name": "2", "batch_type": "random",  "params": {"r":0.5}},
    {"name": "3", "batch_type": "sampled", "params": {}}
  ],
  "edges": [
    {"name": "edge0", "edge_type": "NEW_SIGNAL",  "start": "1", "end": "3"},
    {"name": "edge1", "edge_type": "LIKE",        "start": "1", "end": "2"},
    {"name": "edge2", "edge_type": "BATCH",       "start": "1", "end": "3"},
    {"name": "edge3", "edge_type": "DEFAULT",     "start": "1", "end": "3"},
    {"name": "edge4", "edge_type": "BATCH",       "start": "2", "end": "3"},
    {"name": "edge5", "edge_type": "DEFAULT",     "start": "2", "end": "2"},
    {"name": "edge6", "edge_type": "BATCH",       "start": "3", "end": "2"},
    {"name": "edge7", "edge_type": "DEFAULT",     "start": "3", "end": "2"},
    {"name": "edge8", "edge_type": "LIKE",        "start": "3", "end": "1"}
  ]
}`;

const example2: string = `{
  "nodes": [
    {"name": "0", "batch_type": "random", "params": {}},
    {"name": "1", "batch_type": "biased", "params": {"mu":0.0}},
    {"name": "2", "batch_type": "biased", "params": {"mu":0.5}},
    {"name": "3", "batch_type": "biased", "params": {"mu":1.0}}
  ],
  "edges": [
    {"name": "edge1", "edge_type": "BATCH",   "start": "0", "end": "0"},
    {"name": "edge2", "edge_type": "DEFAULT", "start": "0", "end": "1"},
    {"name": "edge3", "edge_type": "DEFAULT", "start": "1", "end": "1"},
    {"name": "edge4", "edge_type": "BATCH",   "start": "1", "end": "2"},
    {"name": "edge5", "edge_type": "DEFAULT", "start": "2", "end": "1"},
    {"name": "edge6", "edge_type": "BATCH",   "start": "2", "end": "3"},
    {"name": "edge7", "edge_type": "BATCH",   "start": "3", "end": "0"},
    {"name": "edge8", "edge_type": "DEFAULT", "start": "3", "end": "1"}
  ]
}`;

export default {
  example1,
  example2,
};
