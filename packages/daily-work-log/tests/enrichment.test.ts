import { describe, expect, it } from "vitest";
import type { GitHubClient } from "../src/github/client.js";
import { listPullRequestCommitsForDay } from "../src/github/enrichment.js";

function makeClient(response: unknown): GitHubClient {
  return {
    async rest<T>(): Promise<T> {
      return response as T;
    }
  };
}

describe("listPullRequestCommitsForDay", () => {
  it("returns PR commit shas authored by the login within the UTC window", async () => {
    const client = makeClient([
      {
        sha: "included",
        author: { login: "atha" },
        commit: {
          author: { email: "atha@example.com", date: "2026-05-28T08:33:25Z" },
          committer: { email: "atha@example.com", date: "2026-05-28T08:33:25Z" }
        }
      },
      {
        sha: "outside-window",
        author: { login: "atha" },
        commit: {
          author: { email: "atha@example.com", date: "2026-05-29T18:00:00Z" },
          committer: { email: "atha@example.com", date: "2026-05-29T18:00:00Z" }
        }
      },
      {
        sha: "other-author",
        author: { login: "someone" },
        commit: {
          author: { email: "someone@example.com", date: "2026-05-28T09:00:00Z" },
          committer: { email: "someone@example.com", date: "2026-05-28T09:00:00Z" }
        }
      }
    ]);

    const result = await listPullRequestCommitsForDay(client, {
      repo: "acme/repo",
      number: 42,
      login: "atha",
      fromIso: "2026-05-27T17:00:00.000Z",
      toIso: "2026-05-28T17:00:00.000Z"
    });

    expect(result).toEqual(["included"]);
  });

  it("can filter PR commits by author email", async () => {
    const client = makeClient([
      {
        sha: "included",
        author: { login: "atha" },
        commit: {
          author: { email: "work@example.com", date: "2026-05-28T08:33:25Z" },
          committer: { email: "work@example.com", date: "2026-05-28T08:33:25Z" }
        }
      },
      {
        sha: "wrong-email",
        author: { login: "atha" },
        commit: {
          author: { email: "personal@example.com", date: "2026-05-28T09:00:00Z" },
          committer: { email: "personal@example.com", date: "2026-05-28T09:00:00Z" }
        }
      }
    ]);

    const result = await listPullRequestCommitsForDay(client, {
      repo: "acme/repo",
      number: 42,
      login: "atha",
      fromIso: "2026-05-27T17:00:00.000Z",
      toIso: "2026-05-28T17:00:00.000Z",
      authorEmail: "work@example.com"
    });

    expect(result).toEqual(["included"]);
  });
});
