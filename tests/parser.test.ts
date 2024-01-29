import {describe, expect, test} from 'bun:test';
import testLibrary from './data/blueprints';
import mainLibrary from '../src/algorithm/library';
import {Blueprint} from '../src/algorithm/blueprint';
import {Signals} from '../src';

describe('parsing blueprints', () => {
  test('DFA with a new signal', () => {
    // the new signal doesnt exist at first
    expect(Signals.NEW_SIGNAL).toBeUndefined();

    const dfa = testLibrary.withNewSignals;
    const blueprint = new Blueprint(dfa);
    expect(blueprint.vertices.length).toBe(dfa.nodes.length);
    expect(blueprint.edges.length).toBe(dfa.edges.length);

    // signal should be added by reading the parsed blueprint
    expect(Signals.NEW_SIGNAL).not.toBeUndefined();
    const {destination} = blueprint.step('1', Signals.NEW_SIGNAL);
    expect(destination.name).toBe('3');

    const {destination: destination2} = blueprint.step(destination.name, Signals.LIKE);
    expect(destination2.name).toBe('1');
  });

  test('DFA with BATCH and DEFAULTs', () => {
    const dfa = testLibrary.withBatchesAndDefaults;
    const blueprint = new Blueprint(dfa);
    expect(blueprint.vertices.length).toBe(dfa.nodes.length);
    expect(blueprint.edges.length).toBe(dfa.edges.length);

    const startState = blueprint.vertices[0];
    const {destination} = blueprint.step(startState.name, Signals.BATCH);
    expect(destination.name).toBe(startState.name);
  });

  test('Unique Journeys (preset algorithm)', () => {
    const dfa = mainLibrary.UNIQUE_JOURNEYS;
    const blueprint = new Blueprint(dfa);
    expect(blueprint.vertices.length).toBe(dfa.nodes.length);
    expect(blueprint.edges.length).toBe(dfa.edges.length);

    const {destination} = blueprint.step('Exploration', Signals.REPOST);
    expect(destination.name).toBe('Hyper_Focus');
  });

  test('DFA with duplicate nodes / edges', () => {
    expect(() => new Blueprint(testLibrary.withDuplicateNode)).toThrow("Vertex '0' already exists");
    expect(() => new Blueprint(testLibrary.withDuplicateEdge)).toThrow("Edge 'edge1' already exists");
  });

  test('DFA with invalid edges', () => {
    expect(() => new Blueprint(testLibrary.withInvalidEdgeStart)).toThrow(
      "Start vertex '2' of edge edge1 does not exist."
    );
    expect(() => new Blueprint(testLibrary.withInvalidEdgeEnd)).toThrow("End vertex '2' of edge edge1 does not exist.");
  });
});
