export class Signal {
  constructor(
    readonly label: string,
    readonly weight: number
  ) {}

  /** Extends a given Signal */
  static extend(dest: typeof Signals, signals: {label: string; weight: number}[]): typeof Signals {
    for (const signalObj of signals) {
      const signal = new Signal(signalObj.label.toUpperCase(), signalObj.weight);
      dest[signal.label] = signal;
    }
    return dest;
  }

  /** Creates an empty signal without a label and 0 weight. */
  static empty() {
    return new Signal('', 0);
  }

  /** Default signal. */
  static get DEFAULT() {
    return new Signal('DEFAULT', 1.0);
  }

  /** Equality check with another signal. */
  eq(other: Signal) {
    return this.label === other.label && this.weight === other.weight;
  }
}

const presetSignals = {
  DEFAULT: new Signal('DEFAULT', 1.0),
  ADD_TO_CART: new Signal('ADD_TO_CART', 16),
  ITEM_VIEW: new Signal('ITEM_VIEW', 10),
  APPLY: new Signal('APPLY', 18),
  PURCHASE: new Signal('PURCHASE', 20),
  HIGHLIGHT: new Signal('HIGHLIGHT', 8),
  GLANCE_VIEW: new Signal('GLANCE_VIEW', 14),
  CAMPAIGN_CLICK: new Signal('CAMPAIGN_CLICK', 6),
  CATEGORY_VISIT: new Signal('CATEGORY_VISIT', 10),
  SHARE: new Signal('SHARE', 10),
  MERCHANT_VIEW: new Signal('MERCHANT_VIEW', 10),
  REIMBURSED: new Signal('REIMBURSED', 20),
  APPROVED: new Signal('APPROVED', 18),
  REJECTED: new Signal('REJECTED', 18),
  SHARE_ARTICLE: new Signal('SHARE_ARTICLE', 10),
  COMMENT: new Signal('COMMENT', 12),
  PERSPECTIVES_SWITCH: new Signal('PERSPECTIVES_SWITCH', 8),
  REPOST: new Signal('REPOST', 20),
  SUBSCRIBE: new Signal('SUBSCRIBE', 18),
  SHARE_PROFILE: new Signal('SHARE_PROFILE', 10),
  PAID_SUBSCRIBE: new Signal('PAID_SUBSCRIBE', 20),
  SAVE: new Signal('SAVE', 8),
  FOLLOW_TOPIC: new Signal('FOLLOW_TOPIC', 10),
  WATCH: new Signal('WATCH', 20),
  CLICK_LINK: new Signal('CLICK_LINK', 6),
  RECOMMEND: new Signal('RECOMMEND', 12),
  FOLLOW: new Signal('FOLLOW', 10),
  VISIT_PROFILE: new Signal('VISIT_PROFILE', 12),
  AUTO_PLAY: new Signal('AUTO_PLAY', 4),
  SAVE_ARTICLE: new Signal('SAVE_ARTICLE', 8),
  REPLAY: new Signal('REPLAY', 20),
  READ: new Signal('READ', 14),
  LIKE: new Signal('LIKE', 8),
  CLICK_EMAIL_LINK: new Signal('CLICK_EMAIL_LINK', 6),
  ADD_TO_LIST: new Signal('ADD_TO_LIST', 12),
  FOLLOW_AUTHOR: new Signal('FOLLOW_AUTHOR', 10),
  SEARCH: new Signal('SEARCH', 15),
  CLICK_AD: new Signal('CLICK_AD', 6.0),
};

/** A union of preset signal names.
 * Each signal here has a corresponding `Signal` object that is prepared by FirstBatch.
 */
export type PresetSignalNames = keyof typeof presetSignals;
/**
 * Preset set of signals, you can use these or add your own signals to this object.
 */
export const Signals: Readonly<{[signal in PresetSignalNames]: Signal}> & {[signal: string]: Signal} = presetSignals;
