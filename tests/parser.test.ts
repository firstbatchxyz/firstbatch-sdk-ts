import {describe, expect, test} from 'bun:test';
import testLibrary from './data/blueprints';
import mainLibrary from '../src/algorithm/blueprint/library';
import {DFAParser} from '../src/algorithm/blueprint/parser';
import {UserAction} from '../src/algorithm/blueprint/action';
import {Signal, Signals} from '../src/algorithm/blueprint/signal';

describe('parser & blueprint', () => {
  test('batch step', () => {
    const parser = new DFAParser(testLibrary.example2);
    const blueprint = parser.parse();

    expect(blueprint.vertices.length).toBe(4);
    expect(blueprint.edges.length).toBe(8);

    const startState = blueprint.vertices[0];
    const [nextState] = blueprint.step(startState.name, UserAction.BATCH);
    expect(nextState.name).toBe(startState.name);
  });

  test('real blueprint', () => {
    const parser = new DFAParser(mainLibrary.UNIQUE_JOURNEYS);
    const blueprint = parser.parse();

    expect(blueprint.vertices.length).toBe(6);
    expect(blueprint.edges.length).toBe(12);

    const [nextState] = blueprint.step('Exploration', new UserAction(Signals.REPOST));
    expect(nextState.name).toBe('Hyper_Focus');
  });

  test('new signal', () => {
    const parser = new DFAParser(testLibrary.example1);
    const blueprint = parser.parse();

    expect(blueprint.vertices.length).toBe(3);
    expect(blueprint.edges.length).toBe(8);

    // signal should be added by reading the parsed blueprint
    const newSignal = Signals.NEW_SIGNAL;
    expect(newSignal).toBeInstanceOf(Signal);

    // new signal should be able to be used in step
    const [nextState] = blueprint.step('1', new UserAction(Signals.NEW_SIGNAL));
    expect(nextState.name).toBe('3');
  });
});
