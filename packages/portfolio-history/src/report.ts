import type { Config } from "./config.js";
import type { RepoSummary } from "./summary.js";

export type PortfolioStats = {
  activeRepos: RepoSummary[];
  totalCommits: number;
  totalAdditions: number;
  totalDeletions: number;
  totalFiles: number;
};

export function computeStats(repos: RepoSummary[]): PortfolioStats {
  const activeRepos = repos
    .filter((repo) => repo.commitCount > 0)
    .sort((a, b) => b.commitCount - a.commitCount);

  return {
    activeRepos,
    totalCommits: activeRepos.reduce((sum, repo) => sum + repo.commitCount, 0),
    totalAdditions: activeRepos.reduce((sum, repo) => sum + repo.additions, 0),
    totalDeletions: activeRepos.reduce((sum, repo) => sum + repo.deletions, 0),
    totalFiles: activeRepos.reduce((sum, repo) => sum + repo.fileCount, 0)
  };
}

export function buildSelectedCommitsMarkdown(config: Config, repos: RepoSummary[]): string {
  const stats = computeStats(repos);

  const lines = [
    "# Portfolio — Selected Commits",
    "",
    "Commit activity across local Git repositories, generated from `git log` data only.",
    "",
    `Range: ${config.since} to ${config.until}`,
    `Author filter: ${config.author ?? config.authorEmail ?? "all"}`,
    `Repositories with activity: ${stats.activeRepos.length}`,
    `Total commits: ${stats.totalCommits}`,
    `Total lines added: ${stats.totalAdditions}`,
    `Total lines deleted: ${stats.totalDeletions}`,
    `Distinct files touched: ${stats.totalFiles}`,
    "",
    "## Repositories",
    ""
  ];

  if (stats.activeRepos.length === 0) {
    lines.push("No matching commit activity found.");
    return `${lines.join("\n").trimEnd()}\n`;
  }

  for (const repo of stats.activeRepos) {
    lines.push(`### ${repo.repo}`, "");
    lines.push(`- Commits: ${repo.commitCount}`);
    lines.push(`- Lines added: ${repo.additions}`);
    lines.push(`- Lines deleted: ${repo.deletions}`);
    lines.push(`- Distinct files touched: ${repo.fileCount}`);
    lines.push("");
    lines.push("#### Selected commits", "");

    for (const commit of repo.commits.slice(0, 50)) {
      lines.push(`- \`${commit.sha.slice(0, 8)}\` ${commit.subject} (${commit.date})`);
    }

    if (repo.commits.length > 50) {
      lines.push("");
      lines.push(`_${repo.commits.length - 50} more commit(s) omitted_`);
    }

    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export function buildCvMarkdown(config: Config, repos: RepoSummary[]): string {
  const stats = computeStats(repos);

  const lines = [
    "# Portfolio",
    "",
    `**Range:** ${config.since} to ${config.until}`,
    "",
    "## Summary",
    "",
    `Over this period I contributed **${stats.totalCommits} commits** across **${stats.activeRepos.length} repositories**, touching **${stats.totalFiles} files** (${formatNumber(stats.totalAdditions)} lines added, ${formatNumber(stats.totalDeletions)} removed).`,
    "",
    "## Experience",
    ""
  ];

  if (stats.activeRepos.length === 0) {
    lines.push("No matching commit activity found.");
    return `${lines.join("\n").trimEnd()}\n`;
  }

  for (const repo of stats.activeRepos) {
    lines.push(`### ${repo.repo}`, "");
    lines.push(`- **${repo.commitCount} commits** · ${formatNumber(repo.additions)} lines added · ${repo.fileCount} files touched`);
    lines.push("");
    lines.push("Key work:");

    for (const theme of extractThemes(repo)) {
      lines.push(`- ${theme}`);
    }

    lines.push("");
  }

  lines.push("## Notes", "");
  lines.push("This document is a starting point for a CV. Replace placeholders and tailor the wording to each role before submitting.");
  lines.push("");

  return lines.join("\n");
}

function extractThemes(repo: RepoSummary): string[] {
  const subjects = repo.commits
    .map((commit) => commit.subject)
    .map(normalizeSubject)
    .filter((subject) => subject.length > 0);

  const unique = [...new Set(subjects)];
  return unique.slice(0, 20).map((subject) => capitalizeFirst(subject));
}

function normalizeSubject(subject: string): string {
  return subject
    .replace(/^[a-z]+(\([^)]*\))?:\s*/i, "")
    .replace(/\s*\(#\d+\)\s*$/i, "")
    .trim();
}

function capitalizeFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}
