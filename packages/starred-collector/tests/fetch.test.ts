import { describe, expect, it } from "vitest";
import { fetchAllStarred } from "../src/fetch.js";
import type { GitHubClient } from "../src/github/client.js";
import type { Logger } from "../src/logger.js";

/** A logger that discards output during tests. */
const silentLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

/** Build a fake GitHubClient that returns canned pages of starred repos. */
function makeClient(pages: Record<number, unknown[]>): GitHubClient {
  return {
    async rest<T>(path: string): Promise<T> {
      const match = path.match(/page=(\d+)/);
      const page = match ? Number(match[1]) : 1;
      return (pages[page] ?? []) as unknown as T;
    },
    async getViewerLogin() {
      return "testuser";
    },
  };
}

function repoStub(n: number) {
  return {
    full_name: `owner/repo-${n}`,
    name: `repo-${n}`,
    html_url: "https://github.com/owner/repo",
    description: "stub",
    homepage: null,
    topics: [],
    language: "TypeScript",
    license: null,
    is_template: false,
    fork: false,
    archived: false,
    owner: { login: "owner", avatar_url: "https://github.com/owner.png", type: "User" },
    stargazers_count: n,
    forks_count: 0,
    open_issues_count: 0,
    watchers_count: 0,
    has_discussions: false,
    visibility: "public",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    pushed_at: "2026-01-01T00:00:00Z",
  };
}

describe("fetchAllStarred", () => {
  it("stops at the first short page (under 100 items)", async () => {
    const client = makeClient({
      1: Array.from({ length: 100 }, (_, i) => repoStub(i + 1)),
      2: Array.from({ length: 37 }, (_, i) => repoStub(101 + i)),
      3: Array.from({ length: 100 }, (_, i) => repoStub(201 + i)), // should never be fetched
    });
    const repos = await fetchAllStarred(client, "someuser", silentLogger);
    expect(repos).toHaveLength(137);
  });

  it("handles a single short page", async () => {
    const client = makeClient({ 1: [repoStub(1), repoStub(2)] });
    const repos = await fetchAllStarred(client, "someuser", silentLogger);
    expect(repos).toHaveLength(2);
  });

  it("handles zero starred repos", async () => {
    const client = makeClient({ 1: [] });
    const repos = await fetchAllStarred(client, "someuser", silentLogger);
    expect(repos).toHaveLength(0);
  });

  it("validates each repo against the schema, stripping unknown fields", async () => {
    const client = makeClient({
      1: [
        {
          ...repoStub(1),
          extraUnknownField: "should be dropped by zod default parsing",
        },
      ],
    });
    const repos = await fetchAllStarred(client, "someuser", silentLogger);
    expect(repos).toHaveLength(1);
    expect(repos[0]).not.toHaveProperty("extraUnknownField");
    expect(repos[0].full_name).toBe("owner/repo-1");
  });

  it("throws on a non-array API response", async () => {
    const client: GitHubClient = {
      async rest() {
        return { unexpected: true } as unknown as never;
      },
      async getViewerLogin() {
        return "testuser";
      },
    };
    await expect(fetchAllStarred(client, "someuser", silentLogger)).rejects.toThrow(
      /non-array/,
    );
  });
});
