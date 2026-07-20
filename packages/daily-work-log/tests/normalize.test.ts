import { describe, expect, it } from "vitest";
import { normalizeCommit } from "../src/normalize.js";

describe("normalizeCommit", () => {
  it("maps GitHub commit detail and associated PRs into a compact model", () => {
    const commit = normalizeCommit(
      "acme/private-api",
      {
        sha: "abc123",
        html_url: "https://github.com/acme/private-api/commit/abc123",
        commit: {
          message: "Fix retry handling",
          author: { date: "2026-05-25T03:00:00Z" },
          committer: { date: "2026-05-25T03:05:00Z" }
        },
        stats: { additions: 20, deletions: 5, total: 25 },
        files: [
          { filename: "src/retry.ts", status: "modified", additions: 15, deletions: 3, changes: 18 },
          { filename: "tests/retry.test.ts", status: "added", additions: 5, deletions: 2, changes: 7 }
        ]
      },
      [
        {
          number: 42,
          title: "Improve retry handling",
          state: "closed",
          merged_at: "2026-05-25T04:00:00Z",
          html_url: "https://github.com/acme/private-api/pull/42",
          body: "Tightens retry behavior."
        }
      ]
    );

    expect(commit).toEqual({
      repo: "acme/private-api",
      sha: "abc123",
      url: "https://github.com/acme/private-api/commit/abc123",
      message: "Fix retry handling",
      authorDate: "2026-05-25T03:00:00Z",
      committerDate: "2026-05-25T03:05:00Z",
      stats: { additions: 20, deletions: 5, total: 25 },
      files: [
        { path: "src/retry.ts", status: "modified", additions: 15, deletions: 3, changes: 18 },
        { path: "tests/retry.test.ts", status: "added", additions: 5, deletions: 2, changes: 7 }
      ],
      pullRequests: [
        {
          number: 42,
          title: "Improve retry handling",
          state: "closed",
          mergedAt: "2026-05-25T04:00:00Z",
          url: "https://github.com/acme/private-api/pull/42",
          body: "Tightens retry behavior."
        }
      ]
    });
  });
});
