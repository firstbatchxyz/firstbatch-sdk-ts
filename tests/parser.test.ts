import {describe, expect, test} from 'bun:test';
import testLibrary from './data/blueprints';
import mainLibrary from '../src/constants/library';
import {parseDFA} from '../src/algorithm/parser';
import {Signals} from '../src';

describe('blueprint parser', () => {
  test('case: example1 with NEW_SIGNAL', () => {
    // NEW_SIGNAL doesnt exist at first
    expect(Signals.NEW_SIGNAL).toBeUndefined();

    const blueprint = parseDFA(testLibrary.example1);

    expect(blueprint.vertices.length).toBe(3);
    expect(blueprint.edges.length).toBe(9);

    // signal should be added by reading the parsed blueprint
    expect(Signals.NEW_SIGNAL).not.toBeUndefined();

    // new signal should be able to be used in step
    const [nextState] = blueprint.step('1', Signals.NEW_SIGNAL);
    expect(nextState.name).toBe('3');

    const [finalState] = blueprint.step(nextState.name, Signals.LIKE);
    expect(finalState.name).toBe('1');
  });

  test('case: example2 with BATCH', () => {
    const blueprint = parseDFA(testLibrary.example2);

    expect(blueprint.vertices.length).toBe(4);
    expect(blueprint.edges.length).toBe(8);

    const startState = blueprint.vertices[0];
    const [nextState] = blueprint.step(startState.name, Signals.BATCH);
    expect(nextState.name).toBe(startState.name);
  });

  test('case: unique journeys', () => {
    const dfa = mainLibrary.UNIQUE_JOURNEYS;
    const blueprint = parseDFA(dfa);

    expect(blueprint.vertices.length).toBe(dfa.nodes.length);
    expect(blueprint.edges.length).toBe(dfa.edges.length);

    const [nextState] = blueprint.step('Exploration', Signals.REPOST);
    expect(nextState.name).toBe('Hyper_Focus');
  });
});

// TODO: add tests for thrown errors on same edge & same vertex being added
