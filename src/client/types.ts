export type APIResponse<T> = {
  success: boolean;
  code: number;
  data: T;
  message?: string;
};

// TODO: name this something else? this type can be used by others too
export type BatchResponse = {
  vectors: number[][];
  weights: number[];
};

export type SessionObject = {
  id: string;
  isPersistent: boolean;
};
