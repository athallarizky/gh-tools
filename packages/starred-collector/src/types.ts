/**
 * Zod schema describing the slice of a GitHub "starred repo" object we care
 * about. The schema is the source of truth: `Repo` is inferred from it, and
 * every API response is validated against it so unexpected shapes fail loudly.
 *
 * The field set is chosen to be a complete knowledge base for tool
 * recommendation: an agent reading the output should be able to answer "can
 * this help me build X?" without re-fetching from the API. GitHub's REST shape
 * is far richer; we drop the ~55 URL-template fields that add no analytical value.
 */
import { z } from "zod";

export const repoSchema = z.object({
  // Identity
  full_name: z.string(), // "owner/repo"
  name: z.string(), // "repo"
  html_url: z.string().url(), // https://github.com/owner/repo
  description: z.string().nullable(), // one-line purpose
  homepage: z.string().nullable(), // project website
  topics: z.array(z.string()).default([]), // tags: ["react", "ssr", ...]

  // Classification
  language: z.string().nullable(), // primary language
  license: z
    .object({
      key: z.string(),
      name: z.string(),
      spdx_id: z.string().nullable(),
    })
    .nullable(), // can-I-use-this signal
  is_template: z.boolean(), // "Use this template" repo
  fork: z.boolean(),
  archived: z.boolean(), // read-only / deprecated

  // Owner (for grouping by org/user)
  owner: z.object({
    login: z.string(),
    avatar_url: z.string(),
    type: z.string(), // "User" | "Organization"
  }),

  // Popularity & health signals
  stargazers_count: z.number().int().nonnegative(),
  forks_count: z.number().int().nonnegative(),
  open_issues_count: z.number().int().nonnegative(),
  watchers_count: z.number().int().nonnegative(),
  has_discussions: z.boolean(), // community engagement
  visibility: z.string(), // "public" | "private"

  // Time — spot trendy vs. established, gauge maintenance
  created_at: z.string(), // repo birth
  updated_at: z.string(), // metadata last changed
  pushed_at: z.string(), // last code push
});

export type Repo = z.infer<typeof repoSchema>;

/** Minimal repo shape used in tests and fixtures. */
export type RepoInput = z.input<typeof repoSchema>;
