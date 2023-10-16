export class Params {
  mu: number;
  alpha: number;
  r: number;
  last_n: number;
  n_topics: number;
  remove_duplicates: boolean;
  apply_threshold: [boolean, number];
  apply_mmr: boolean;

  constructor(
    args: Partial<{
      mu: number;
      alpha: number;
      r: number;
      last_n: number;
      n_topics: number;
      remove_duplicates: boolean;
      apply_threshold: [boolean, number] | number;
      apply_mmr: boolean;
    }>
  ) {
    this.mu = args.mu || 0;
    this.alpha = args.alpha || 0;
    this.r = args.r || 0;
    this.last_n = args.last_n || 0;
    this.n_topics = args.n_topics || 0;
    this.remove_duplicates = args.remove_duplicates || true;
    this.apply_mmr = args.apply_mmr || false;

    this.apply_threshold = [false, 0];
    if (args.apply_threshold) {
      if (Array.isArray(args.apply_threshold)) {
        this.apply_threshold = args.apply_threshold;
      } else {
        this.apply_threshold = [true, args.apply_threshold];
      }
    }
  }

  eq(other: Params) {
    return (
      this.mu === other.mu &&
      this.alpha === other.alpha &&
      this.r === other.r &&
      this.last_n === other.last_n &&
      this.n_topics === other.n_topics &&
      this.remove_duplicates === other.remove_duplicates &&
      this.apply_threshold === other.apply_threshold &&
      this.apply_mmr === other.apply_mmr
    );
  }
}
