export type APIResponse<T> = {
  success: boolean;
  code: number;
  data: T; // string | {[key: string]: string | number | string[] | number[] | number[][]};
  message?: string;
};

export type BatchResponse = {
  vectors: number[][];
  weights: number[];
};
