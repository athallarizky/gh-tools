import { z } from "zod";

// --- Commit schemas (from V1) ---

export const normalizedFileSchema = z.object({
  path: z.string(),
  status: z.string(),
  additions: z.number(),
  deletions: z.number(),
  changes: z.number()
});

export const normalizedCommitPullRequestSchema = z.object({
  number: z.number(),
  title: z.string(),
  state: z.string(),
  mergedAt: z.string().nullable(),
  url: z.string(),
  body: z.string().nullable()
});

export const normalizedCommitSchema = z.object({
  repo: z.string(),
  sha: z.string(),
  url: z.string(),
  message: z.string(),
  authorDate: z.string(),
  committerDate: z.string(),
  stats: z.object({
    additions: z.number(),
    deletions: z.number(),
    total: z.number()
  }),
  files: z.array(normalizedFileSchema),
  pullRequests: z.array(normalizedCommitPullRequestSchema)
});

// --- Search-derived schemas (new in V2) ---

export const searchLabelSchema = z.object({
  name: z.string(),
  color: z.string()
});

export const normalizedIssueSchema = z.object({
  id: z.number(),
  repo: z.string(),
  number: z.number(),
  title: z.string(),
  state: z.string(),
  url: z.string(),
  labels: z.array(searchLabelSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  category: z.enum(["created", "authoredUpdated", "assignedUpdated", "assignedCreated"])
});

export const normalizedSearchPullRequestSchema = z.object({
  id: z.number(),
  repo: z.string(),
  number: z.number(),
  title: z.string(),
  state: z.string(),
  url: z.string(),
  body: z.string().nullable(),
  labels: z.array(searchLabelSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  mergedAt: z.string().nullable(),
  author: z.string().nullable(),
  category: z.enum(["created", "authoredUpdated", "reviewed"])
});

// --- Top-level day schema ---

export const normalizedDaySchema = z.object({
  date: z.string(),
  timezone: z.string(),
  fromIso: z.string(),
  toIso: z.string(),
  user: z.string(),
  issues: z.array(normalizedIssueSchema),
  pullRequests: z.array(normalizedSearchPullRequestSchema),
  repositories: z.array(
    z.object({
      repo: z.string(),
      isPrivate: z.boolean().optional(),
      defaultBranch: z.string().nullable().optional(),
      commits: z.array(normalizedCommitSchema)
    })
  )
});

export type NormalizedDay = z.infer<typeof normalizedDaySchema>;
export type NormalizedCommit = z.infer<typeof normalizedCommitSchema>;
export type NormalizedIssue = z.infer<typeof normalizedIssueSchema>;
export type NormalizedSearchPullRequest = z.infer<typeof normalizedSearchPullRequestSchema>;
