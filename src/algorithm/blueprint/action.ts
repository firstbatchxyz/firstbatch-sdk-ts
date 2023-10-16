import {Signal, Signals, PresetSignalNames} from './signal';

/** A user action.
 *
 * You can create an action in several ways:
 *
 * - Create a `Signal` and pass it in the user action `new UserAction(yourSignal)`
 * - Create a an action with a preset signal name (TypeScript should provide autocomplete) such
 * as `new UserAction('CLICK_AD')`
 * - Create a batch user action, either via `new UserAction('BATCH')` or the shorthand `UserAction.BATCH`
 */
export class UserAction {
  readonly actionType: Signal;
  readonly isBatch: boolean = false;

  // eslint-disable-next-line @typescript-eslint/ban-types
  constructor(action: Signal | PresetSignalNames | 'BATCH') {
    if (action instanceof Signal) {
      this.actionType = action;
    } else if (action === 'BATCH') {
      this.actionType = Signal.empty();
      this.isBatch = true;
    } else if (action in Signals) {
      this.actionType = Signals[action];
    } else {
      throw new Error('Invalid action: ' + action);
    }
  }

  /** Shorthand to create a BATCH user action. */
  static get BATCH() {
    return new UserAction('BATCH');
  }

  /** Equality check with another `UserAction`. */
  eq(other: UserAction) {
    return this.isBatch === other.isBatch || this.actionType.eq(other.actionType);
  }
}
