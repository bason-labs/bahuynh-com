import type { vi } from "./vi";

type Widen<T> = T extends string
  ? string
  : T extends readonly [unknown, ...unknown[]]
    ? { -readonly [K in keyof T]: Widen<T[K]> }
    : T extends readonly (infer U)[]
      ? Widen<U>[]
      : T extends object
        ? { -readonly [K in keyof T]: Widen<T[K]> }
        : T;

export type Messages = Widen<typeof vi>;
