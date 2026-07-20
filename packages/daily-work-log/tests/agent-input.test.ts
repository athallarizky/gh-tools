import { describe, expect, it } from "vitest";
import { buildAgentInputMarkdown } from "../src/context/agent-input.js";
import { buildManifest } from "../src/context/manifest.js";
import type { NormalizedDay } from "../src/model.js";

function makeDay(): NormalizedDay {
  return {
    date: "2026-05-25",
    timezone: "Asia/Jakarta",
    fromIso: "2026-05-24T17:00:00.000Z",
    toIso: "2026-05-25T17:00:00.000Z",
    user: "atha",
    issues: [
      {
        id: 1,
        repo: "acme/api",
        number: 10,
        title: "Fix login bug",
        state: "open",
        url: "https://github.com/acme/api/issues/10",
        labels: [{ name: "bug", color: "ff0000" }],
        createdAt: "2026-05-25T08:00:00Z",
        updatedAt: "2026-05-25T08:00:00Z",
        category: "created"
      },
      {
        id: 2,
        repo: "acme/web",
        number: 20,
        title: "Update docs",
        state: "closed",
        url: "https://github.com/acme/web/issues/20",
        labels: [],
        createdAt: "2026-05-20T10:00:00Z",
        updatedAt: "2026-05-25T09:00:00Z",
        category: "authoredUpdated"
      }
    ],
    pullRequests: [
      {
        id: 3,
        repo: "acme/api",
        number: 11,
        title: "Fix auth flow",
        state: "closed",
        url: "https://github.com/acme/api/pull/11",
        body: "This PR fixes the auth flow.",
        labels: [],
        createdAt: "2026-05-25T10:00:00Z",
        updatedAt: "2026-05-25T12:00:00Z",
        mergedAt: "2026-05-25T13:00:00Z",
        author: "atha",
        category: "created"
      },
      {
        id: 4,
        repo: "acme/web",
        number: 30,
        title: "Refactor components",
        state: "open",
        url: "https://github.com/acme/web/pull/30",
        body: null,
        labels: [],
        createdAt: "2026-05-24T10:00:00Z",
        updatedAt: "2026-05-25T11:00:00Z",
        mergedAt: null,
        author: "colleague",
        category: "reviewed"
      }
    ],
    repositories: [
      {
        repo: "acme/private-api",
        isPrivate: true,
        defaultBranch: "main",
        commits: [
          {
            repo: "acme/private-api",
            sha: "abc123",
            url: "https://github.com/acme/private-api/commit/abc123",
            message: "Fix retry handling",
            authorDate: "2026-05-25T03:00:00Z",
            committerDate: "2026-05-25T03:05:00Z",
            stats: { additions: 20, deletions: 5, total: 25 },
            files: [{ path: "src/retry.ts", status: "modified", additions: 20, deletions: 5, changes: 25 }],
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
          }
        ]
      }
    ]
  };
}

describe("buildAgentInputMarkdown", () => {
  it("creates agent-readable instructions with issues, PRs, and commits", () => {
    const markdown = buildAgentInputMarkdown(makeDay());

    expect(markdown).toContain("# Daily GitHub Work Summary Request");
    expect(markdown).toContain("Date: 2026-05-25");
    expect(markdown).toContain("## Issues");
    expect(markdown).toContain("### Issues Created");
    expect(markdown).toContain("Fix login bug");
    expect(markdown).toContain("### Issues Updated");
    expect(markdown).toContain("Update docs");
    expect(markdown).toContain("## Pull Requests");
    expect(markdown).toContain("### PRs Created");
    expect(markdown).toContain("Fix auth flow");
    expect(markdown).toContain("### PRs Reviewed");
    expect(markdown).toContain("Refactor components");
    expect(markdown).toContain("## Work Data");
    expect(markdown).toContain("acme/private-api");
    expect(markdown).toContain("Fix retry handling");
  });

  it("handles empty issues and pull requests", () => {
    const day = makeDay();
    day.issues = [];
    day.pullRequests = [];
    const markdown = buildAgentInputMarkdown(day);

    expect(markdown).toContain("## Issues");
    expect(markdown).toContain("0 issues found");
    expect(markdown).toContain("## Pull Requests");
    expect(markdown).toContain("0 pull requests found");
  });
});

describe("buildManifest", () => {
  it("creates a schema-versioned bundle manifest with v2 version", () => {
    const manifest = buildManifest({
      day: makeDay(),
      bundleDir: "runs/2026-05-25"
    });

    expect(manifest.schemaVersion).toBe("2.0");
    expect(manifest.files.agentInput).toBe("agent-input.md");
    expect(manifest.files.summaryOutput).toBe("summary.md");
  });
});
