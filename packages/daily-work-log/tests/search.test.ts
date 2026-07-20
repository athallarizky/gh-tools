import { describe, expect, it } from "vitest";
import { searchIssuesAndPrs, extractRepo, isPullRequest } from "../src/github/search.js";
import type { GitHubClient } from "../src/github/client.js";
import type { SearchIssueItem } from "../src/github/search.js";

function makeSearchResponse(items: SearchIssueItem[] = []) {
  return { total_count: items.length, incomplete_results: false, items };
}

function makeClient(responses: Record<string, unknown>): GitHubClient {
  return {
    async rest<T>(path: string): Promise<T> {
      const response = responses[path];
      if (!response) return makeSearchResponse() as T;
      return response as T;
    }
  };
}

describe("extractRepo", () => {
  it("extracts owner/repo from repository_url", () => {
    expect(extractRepo("https://api.github.com/repos/acme/api")).toBe("acme/api");
  });
});

describe("isPullRequest", () => {
  it("returns true when pull_request field is present", () => {
    expect(isPullRequest({ pull_request: { url: "...", merged_at: null } } as SearchIssueItem)).toBe(true);
  });

  it("returns false when pull_request field is absent", () => {
    expect(isPullRequest({} as SearchIssueItem)).toBe(false);
  });
});

describe("searchIssuesAndPrs", () => {
  it("runs all 7 queries and returns categorized items", async () => {
    const issue1: SearchIssueItem = {
      id: 1,
      number: 1,
      title: "Issue 1",
      state: "open",
      html_url: "https://github.com/acme/repo/issues/1",
      body: null,
      labels: [],
      assignees: [],
      user: { login: "atha" },
      created_at: "2026-05-25T10:00:00Z",
      updated_at: "2026-05-25T10:00:00Z",
      repository_url: "https://api.github.com/repos/acme/repo"
    };

    const pr1: SearchIssueItem = {
      id: 2,
      number: 2,
      title: "PR 1",
      state: "open",
      html_url: "https://github.com/acme/repo/pull/2",
      body: "PR body",
      labels: [],
      assignees: [],
      user: { login: "atha" },
      created_at: "2026-05-25T10:00:00Z",
      updated_at: "2026-05-25T10:00:00Z",
      repository_url: "https://api.github.com/repos/acme/repo",
      pull_request: { url: "https://api.github.com/repos/acme/repo/pulls/2", merged_at: null }
    };

    const responses: Record<string, unknown> = {
      "/search/issues?q=author:atha+created:2026-05-25+is:issue&per_page=100": makeSearchResponse([issue1]),
      "/search/issues?q=author:atha+updated:2026-05-25+is:issue&per_page=100&sort=updated&order=desc": makeSearchResponse([]),
      "/search/issues?q=assignee:atha+updated:2026-05-25+is:issue&per_page=100&sort=updated&order=desc": makeSearchResponse([]),
      "/search/issues?q=assignee:atha+created:2026-05-25+is:issue&per_page=100": makeSearchResponse([]),
      "/search/issues?q=author:atha+created:2026-05-25+is:pr&per_page=100": makeSearchResponse([pr1]),
      "/search/issues?q=author:atha+updated:2026-05-25+is:pr&per_page=100&sort=updated&order=desc": makeSearchResponse([]),
      "/search/issues?q=reviewed-by:atha+reviewed:2026-05-25+is:pr&per_page=100": makeSearchResponse([])
    };

    const client = makeClient(responses);
    const result = await searchIssuesAndPrs(client, { login: "atha", date: "2026-05-25" });

    expect(result).toHaveLength(2);
    expect(result.find((r) => r.item.id === 1)?.isPr).toBe(false);
    expect(result.find((r) => r.item.id === 1)?.categories).toEqual(new Set(["created"]));
    expect(result.find((r) => r.item.id === 2)?.isPr).toBe(true);
    expect(result.find((r) => r.item.id === 2)?.categories).toEqual(new Set(["created"]));
  });
});
