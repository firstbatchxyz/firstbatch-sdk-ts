export interface ParamsInterface {
  mu: number;
  alpha: number;
  r: number;
  last_n: number;
  n_topics: number;
  remove_duplicates: boolean;
  apply_threshold: number;
  apply_mmr: boolean;
}

export class Params implements ParamsInterface {
  mu: number;
  alpha: number;
  r: number;
  last_n: number;
  n_topics: number;
  remove_duplicates: boolean;
  apply_threshold: number;
  apply_mmr: boolean;

  constructor(args: Partial<ParamsInterface>) {
    this.mu = args.mu ?? 0;
    this.alpha = args.alpha ?? 0;
    this.r = args.r ?? 0;
    this.last_n = args.last_n ?? 0;
    this.n_topics = args.n_topics ?? 0;
    this.remove_duplicates = args.remove_duplicates ?? true;
    this.apply_mmr = args.apply_mmr ?? false;
    this.apply_threshold = args.apply_threshold ?? 0;
  }

  static eq(a: Params, b: Params) {
    return (
      a.mu === b.mu &&
      a.alpha === b.alpha &&
      a.r === b.r &&
      a.last_n === b.last_n &&
      a.n_topics === b.n_topics &&
      a.remove_duplicates === b.remove_duplicates &&
      a.apply_threshold === b.apply_threshold &&
      a.apply_mmr === b.apply_mmr
    );
  }
}
