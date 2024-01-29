import {describe, expect, test} from 'bun:test';
import testLibrary from './data/blueprints';
import mainLibrary from '../src/algorithm/library';
import {Blueprint} from '../src/algorithm/blueprint';
import {Signals} from '../src';

describe('blueprint parser', () => {
  test('case: DFA with a new signal', () => {
    // NEW_SIGNAL doesnt exist at first
    expect(Signals.NEW_SIGNAL).toBeUndefined();

    const blueprint = new Blueprint(testLibrary.withNewSignals);

    expect(blueprint.vertices.length).toBe(3);
    expect(blueprint.edges.length).toBe(9);

    // signal should be added by reading the parsed blueprint
    expect(Signals.NEW_SIGNAL).not.toBeUndefined();

    // new signal should be able to be used in step
    const {destination} = blueprint.step('1', Signals.NEW_SIGNAL);
    expect(destination.name).toBe('3');

    const {destination: destination2} = blueprint.step(destination.name, Signals.LIKE);
    expect(destination2.name).toBe('1');
  });

  test('case: DFA with BATCH and DEFAULTs', () => {
    const blueprint = new Blueprint(testLibrary.withBatchesAndDefaults);

    expect(blueprint.vertices.length).toBe(4);
    expect(blueprint.edges.length).toBe(8);

    const startState = blueprint.vertices[0];
    const {destination} = blueprint.step(startState.name, Signals.BATCH);
    expect(destination.name).toBe(startState.name);
  });

  test('case: unique journeys', () => {
    const dfa = mainLibrary.UNIQUE_JOURNEYS;
    const blueprint = new Blueprint(dfa);

    expect(blueprint.vertices.length).toBe(dfa.nodes.length);
    expect(blueprint.edges.length).toBe(dfa.edges.length);

    const {destination} = blueprint.step('Exploration', Signals.REPOST);
    expect(destination.name).toBe('Hyper_Focus');
  });
});

// TODO: add tests for thrown errors on same edge & same vertex being added
