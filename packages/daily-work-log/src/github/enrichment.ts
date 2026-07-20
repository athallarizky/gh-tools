import type { GitHubClient } from "./client.js";
import { normalizeCommit } from "../normalize.js";
import type { NormalizedCommit } from "../model.js";
import { buildAssociatedPullsPath, buildCommitPath, buildRepoCommitsPath } from "./queries.js";

type RepoCommitListItem = {
  sha: string;
  commit: {
    author: { email: string | null } | null;
    committer: { email: string | null } | null;
  };
};

type PullRequestCommitListItem = {
  sha: string;
  author: { login: string } | null;
  commit: {
    author: { email: string | null; date: string } | null;
    committer: { email: string | null; date: string } | null;
  };
};

export async function listRepoCommitsForDay(
  client: GitHubClient,
  input: { repo: string; login: string; fromIso: string; toIso: string; authorEmail?: string }
): Promise<string[]> {
  const perPage = 100;
  const shas: string[] = [];

  for (let page = 1; page <= 10; page++) {
    const path = buildRepoCommitsPath(input.repo, {
      author: input.login,
      since: input.fromIso,
      until: input.toIso,
      page
    });

    let items: RepoCommitListItem[];
    try {
      items = await client.rest<RepoCommitListItem[]>(path);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("409") || msg.includes("empty")) return [];
      throw error;
    }

    const filtered = input.authorEmail
      ? items.filter((item) => {
          const email = item.commit.author?.email ?? item.commit.committer?.email ?? "";
          return email === input.authorEmail;
        })
      : items;

    shas.push(...filtered.map((item) => item.sha));
    if (items.length < perPage) break;
  }

  return shas;
}

export async function enrichCommit(
  client: GitHubClient,
  input: { repo: string; sha: string }
): Promise<NormalizedCommit> {
  const [commit, pulls] = await Promise.all([
    client.rest<Parameters<typeof normalizeCommit>[1]>(buildCommitPath(input.repo, input.sha)),
    client.rest<Parameters<typeof normalizeCommit>[2]>(buildAssociatedPullsPath(input.repo, input.sha), {
      previewAccept: "application/vnd.github.groot-preview+json"
    })
  ]);
  return normalizeCommit(input.repo, commit, pulls);
}

export async function listPullRequestCommitsForDay(
  client: GitHubClient,
  input: { repo: string; number: number; login: string; fromIso: string; toIso: string; authorEmail?: string }
): Promise<string[]> {
  const items = await client.rest<PullRequestCommitListItem[]>(
    `repos/${input.repo}/pulls/${input.number}/commits?per_page=100`
  );
  const fromMs = Date.parse(input.fromIso);
  const toMs = Date.parse(input.toIso);

  return items
    .filter((item) => {
      const authorDate = item.commit.author?.date ?? item.commit.committer?.date;
      if (!authorDate) return false;

      const authorMs = Date.parse(authorDate);
      if (authorMs < fromMs || authorMs >= toMs) return false;

      if (input.authorEmail) {
        const email = item.commit.author?.email ?? item.commit.committer?.email ?? "";
        return email === input.authorEmail;
      }

      return item.author?.login === input.login;
    })
    .map((item) => item.sha);
}
