import { describe, expect, it } from "vitest";
import { summarizeRepo } from "../src/summary.js";
import type { LocalRepo } from "../src/repo-discovery.js";
import type { GitCommit } from "../src/git.js";

const repo: LocalRepo = { name: "api", path: "/tmp/api" };

function commit(files: GitCommit["files"]): GitCommit {
  return {
    sha: "abc123",
    author: "Atha",
    email: "atha@example.com",
    date: "2024-01-15T10:00:00+07:00",
    subject: "Fix",
    files
  };
}

describe("summarizeRepo", () => {
  it("aggregates commit and file stats", () => {
    const summary = summarizeRepo(repo, [
      commit([
        { path: "src/a.ts", additions: 10, deletions: 2 },
        { path: "src/b.ts", additions: 5, deletions: 0 }
      ]),
      commit([
        { path: "src/a.ts", additions: 1, deletions: 1 },
        { path: "src/c.ts", additions: 3, deletions: 0 }
      ])
    ]);

    expect(summary).toEqual({
      repo: "api",
      commitCount: 2,
      additions: 19,
      deletions: 3,
      fileCount: 3,
      commits: summary.commits
    });
  });

  it("returns zeroes for no commits", () => {
    const summary = summarizeRepo(repo, []);

    expect(summary).toMatchObject({
      repo: "api",
      commitCount: 0,
      additions: 0,
      deletions: 0,
      fileCount: 0
    });
  });
});
