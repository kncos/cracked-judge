export * from "./lib/cracked-error";
export * from "./lib/signal";
export * from "./lib/utils";

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
