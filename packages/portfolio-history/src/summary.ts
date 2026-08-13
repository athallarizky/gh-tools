import type { GitCommit } from "./git.js";
import type { LocalRepo } from "./repo-discovery.js";

export type RepoSummary = {
  repo: string;
  commitCount: number;
  additions: number;
  deletions: number;
  fileCount: number;
  commits: GitCommit[];
};

export function summarizeRepo(repo: LocalRepo, commits: GitCommit[]): RepoSummary {
  let additions = 0;
  let deletions = 0;
  const files = new Set<string>();

  for (const commit of commits) {
    for (const file of commit.files) {
      additions += file.additions;
      deletions += file.deletions;
      files.add(file.path);
    }
  }

  return {
    repo: repo.name,
    commitCount: commits.length,
    additions,
    deletions,
    fileCount: files.size,
    commits
  };
}
