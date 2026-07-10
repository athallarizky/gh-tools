/**
 * CLI configuration schemas. Commander parses flags into plain objects; zod
 * validates and coerces them into typed configs. Schemas are the single source
 * of truth — there are no hand-written interfaces.
 */
import { z } from "zod";

export const SORT_OPTIONS = ["stars", "name", "updated"] as const;

// ─── collect ─────────────────────────────────────────────────────────────────

export const collectConfigSchema = z.object({
  user: z.string().min(1),
  output: z.string().min(1),
  language: z.string().optional(),
  category: z.string().optional(),
  categories: z.boolean(),
  sort: z.enum(SORT_OPTIONS),
  debug: z.boolean(),
});

export type CollectConfig = z.infer<typeof collectConfigSchema>;

/** Validate raw commander options into a CollectConfig. */
export function parseCollectConfig(input: unknown): CollectConfig {
  return collectConfigSchema.parse(input);
}

// ─── combine ─────────────────────────────────────────────────────────────────

export const combineConfigSchema = z.object({
  user: z.string().optional(), // comma-separated logins, omitted = all
  input: z.string().min(1),
  output: z.string().min(1),
  debug: z.boolean(),
});

export type CombineConfig = z.infer<typeof combineConfigSchema>;

/** Validate raw commander options into a CombineConfig. */
export function parseCombineConfig(input: unknown): CombineConfig {
  return combineConfigSchema.parse(input);
}
