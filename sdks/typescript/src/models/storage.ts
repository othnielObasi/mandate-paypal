import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

export const Storage = {
  Postgres: "postgres",
  Memory: "memory",
} as const;
export type Storage = (typeof Storage)[keyof typeof Storage] | (string & {});

export const storageSchema: EnumSchema<Storage> = s.enumOf<Storage>(Storage);
