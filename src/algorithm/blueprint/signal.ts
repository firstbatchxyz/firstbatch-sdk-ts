export type Signal = {label: string; weight: number};

// export class Signal {
//   constructor(
//     readonly label: string,
//     readonly weight: number
//   ) {}

//   /** Extends a given Signal */
//   static extend(dest: typeof Signals, signals: {label: string; weight: number}[]): typeof Signals {
//     for (const signalObj of signals) {
//       const signal = new Signal(signalObj.label.toUpperCase(), signalObj.weight);
//       dest[signal.label] = signal;
//     }
//     return dest;
//   }

//   /** Creates an empty signal without a label and 0 weight. */
//   static empty() {
//     return new Signal('', 0);
//   }

//   /** Default signal. */
//   static get DEFAULT() {
//     return new Signal('DEFAULT', 1.0);
//   }

//   /** Equality check with another signal. */
//   eq(other: Signal) {
//     return this.label === other.label && this.weight === other.weight;
//   }
// }

const presetSignals = {
  DEFAULT: {label: 'DEFAULT', weight: 1.0},
  BATCH: {label: 'BATCH', weight: 0.0},
  ADD_TO_CART: {label: 'ADD_TO_CART', weight: 16},
  ITEM_VIEW: {label: 'ITEM_VIEW', weight: 10},
  APPLY: {label: 'APPLY', weight: 18},
  PURCHASE: {label: 'PURCHASE', weight: 20},
  HIGHLIGHT: {label: 'HIGHLIGHT', weight: 8},
  GLANCE_VIEW: {label: 'GLANCE_VIEW', weight: 14},
  CAMPAIGN_CLICK: {label: 'CAMPAIGN_CLICK', weight: 6},
  CATEGORY_VISIT: {label: 'CATEGORY_VISIT', weight: 10},
  SHARE: {label: 'SHARE', weight: 10},
  MERCHANT_VIEW: {label: 'MERCHANT_VIEW', weight: 10},
  REIMBURSED: {label: 'REIMBURSED', weight: 20},
  APPROVED: {label: 'APPROVED', weight: 18},
  REJECTED: {label: 'REJECTED', weight: 18},
  SHARE_ARTICLE: {label: 'SHARE_ARTICLE', weight: 10},
  COMMENT: {label: 'COMMENT', weight: 12},
  PERSPECTIVES_SWITCH: {label: 'PERSPECTIVES_SWITCH', weight: 8},
  REPOST: {label: 'REPOST', weight: 20},
  SUBSCRIBE: {label: 'SUBSCRIBE', weight: 18},
  SHARE_PROFILE: {label: 'SHARE_PROFILE', weight: 10},
  PAID_SUBSCRIBE: {label: 'PAID_SUBSCRIBE', weight: 20},
  SAVE: {label: 'SAVE', weight: 8},
  FOLLOW_TOPIC: {label: 'FOLLOW_TOPIC', weight: 10},
  WATCH: {label: 'WATCH', weight: 20},
  CLICK_LINK: {label: 'CLICK_LINK', weight: 6},
  RECOMMEND: {label: 'RECOMMEND', weight: 12},
  FOLLOW: {label: 'FOLLOW', weight: 10},
  VISIT_PROFILE: {label: 'VISIT_PROFILE', weight: 12},
  AUTO_PLAY: {label: 'AUTO_PLAY', weight: 4},
  SAVE_ARTICLE: {label: 'SAVE_ARTICLE', weight: 8},
  REPLAY: {label: 'REPLAY', weight: 20},
  READ: {label: 'READ', weight: 14},
  LIKE: {label: 'LIKE', weight: 8},
  CLICK_EMAIL_LINK: {label: 'CLICK_EMAIL_LINK', weight: 6},
  ADD_TO_LIST: {label: 'ADD_TO_LIST', weight: 12},
  FOLLOW_AUTHOR: {label: 'FOLLOW_AUTHOR', weight: 10},
  SEARCH: {label: 'SEARCH', weight: 15},
  CLICK_AD: {label: 'CLICK_AD', weight: 6.0},
};

/** A union of preset signal names.
 * Each signal here has a corresponding `Signal` object that is prepared by FirstBatch.
 */
export type PresetSignalNames = keyof typeof presetSignals;
/**
 * Preset set of signals, you can use these or add your own signals to this object.
 */
export const Signals: Readonly<{[signal in PresetSignalNames]: Signal}> & {[signal: string]: Signal} =
  presetSignals as Record<PresetSignalNames, Signal>;
