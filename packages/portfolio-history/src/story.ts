import type { Config } from "./config.js";
import { computeStats } from "./report.js";
import type { RepoSummary } from "./summary.js";

type FocusArea = {
  label: string;
  count: number;
};

export function buildStoryCvMarkdown(config: Config, repos: RepoSummary[]): string {
  const stats = computeStats(repos);

  const lines = [
    "# Portfolio — Story",
    "",
    `**Range:** ${config.since} to ${config.until}`,
    "",
    "## My Story",
    "",
    buildOpeningStory(config, stats),
    ""
  ];

  for (const repo of stats.activeRepos) {
    const commits = [...repo.commits].reverse();
    lines.push(`### ${repo.repo}`, "");
    lines.push(buildRepoStory(repo));
    lines.push("");

    if (commits.length > 0) {
      lines.push("#### Key contributions", "");
      for (const commit of commits) {
        lines.push(`- ${formatStoryDate(commit.date)} — ${formatStorySubject(commit.subject)}`);
      }
      lines.push("");
    }
  }

  lines.push("## Notes", "");
  lines.push("This narrative is generated from commit subjects and file paths. Review and adjust the wording to match the role you are applying for.");
  lines.push("");

  return lines.join("\n");
}

function buildOpeningStory(config: Config, stats: ReturnType<typeof computeStats>): string {
  const { totalCommits, activeRepos, totalFiles, totalAdditions, totalDeletions } = stats;

  if (totalCommits === 0) {
    return "No matching commit activity found.";
  }

  return `From ${config.since} to ${config.until}, I shipped ${totalCommits} commits across ${activeRepos.length} repositories. That work touched ${totalFiles} files, added ${formatNumber(totalAdditions)} lines, and removed ${formatNumber(totalDeletions)}. The sections below tell the story behind the most significant repositories.`;
}

function buildRepoStory(repo: RepoSummary): string {
  const commits = [...repo.commits].reverse();
  const firstDate = commits[0]?.date ? formatStoryDate(commits[0].date) : "this period";
  const lastDate = commits[commits.length - 1]?.date ? formatStoryDate(commits[commits.length - 1].date) : "this period";

  const focusAreas = summarizeFocusAreas(repo);
  const focusText = formatFocusAreas(focusAreas);

  const period = firstDate === lastDate ? firstDate : `${firstDate} to ${lastDate}`;

  return `Between ${period}, I made ${repo.commitCount} commits in ${repo.repo}, touching ${repo.fileCount} files and adding ${formatNumber(repo.additions)} lines. ${focusText}`;
}

function summarizeFocusAreas(repo: RepoSummary): FocusArea[] {
  const counts = new Map<string, number>();

  for (const commit of repo.commits) {
    for (const file of commit.files) {
      const label = categorizePath(file.path);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function formatFocusAreas(areas: FocusArea[]): string {
  if (areas.length === 0) {
    return "Most changes were general code edits.";
  }

  const top = areas.slice(0, 3);
  const phrases = top.map((area) => `${lowerFirst(area.label)} (${area.count} file changes)`);
  return `My work concentrated on ${toSentence(phrases)}.`;
}

function categorizePath(path: string): string {
  const lower = path.toLowerCase();

  if (lower.includes("__tests__") || lower.includes(".test.") || lower.includes(".spec.") || lower.includes("__mocks__")) {
    return "Testing";
  }

  if (
    lower.startsWith(".github/") ||
    lower.startsWith(".infra/") ||
    lower.startsWith(".local/") ||
    lower.startsWith("helm") ||
    lower.startsWith("terraform") ||
    lower.startsWith("docker") ||
    lower.startsWith("k8s")
  ) {
    return "Infrastructure and CI/CD";
  }

  if (
    lower.startsWith("public/") ||
    lower.startsWith("assets/") ||
    lower.startsWith("static/") ||
    lower.endsWith(".svg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".gif")
  ) {
    return "Visual and static assets";
  }

  if (
    lower.includes("payment") ||
    lower.includes("webview") ||
    lower.includes("campaign") ||
    lower.includes("insurance") ||
    lower.includes("donation") ||
    lower.includes("redirect")
  ) {
    return "Payment, campaign, and navigation flows";
  }

  if (
    lower.includes("/utils/") ||
    lower.includes("/lib/") ||
    lower.includes("/services/") ||
    lower.includes("/api/") ||
    lower.includes("/hooks/")
  ) {
    return "Shared utilities and services";
  }

  if (
    lower.includes("/components/") ||
    lower.includes("/containers/") ||
    lower.includes("/pages/") ||
    lower.startsWith("src/") ||
    lower.startsWith("apps/") ||
    lower.startsWith("packages/")
  ) {
    return "Application feature development";
  }

  return "General code changes";
}

function formatStoryDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });
}

function formatStorySubject(subject: string): string {
  const cleaned = subject
    .replace(/^[a-z]+(\([^)]*\))?:\s*/i, "")
    .replace(/\s*\(#\d+\)\s*$/i, "")
    .trim();

  return capitalizeFirst(cleaned);
}

function capitalizeFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function lowerFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function toSentence(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}
