import type { NormalizedCommit } from "./model.js";

type GitHubCommitDetail = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { date: string };
    committer: { date: string };
  };
  stats?: { additions: number; deletions: number; total: number };
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
  }>;
};

type GitHubPull = {
  number: number;
  title: string;
  state: string;
  merged_at: string | null;
  html_url: string;
  body: string | null;
};

export function normalizeCommit(repo: string, commit: GitHubCommitDetail, pulls: GitHubPull[]): NormalizedCommit {
  return {
    repo,
    sha: commit.sha,
    url: commit.html_url,
    message: commit.commit.message,
    authorDate: commit.commit.author.date,
    committerDate: commit.commit.committer.date,
    stats: commit.stats ?? { additions: 0, deletions: 0, total: 0 },
    files: (commit.files ?? []).map((file) => ({
      path: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes
    })),
    pullRequests: pulls.map((pull) => ({
      number: pull.number,
      title: pull.title,
      state: pull.state,
      mergedAt: pull.merged_at,
      url: pull.html_url,
      body: pull.body
    }))
  };
}
