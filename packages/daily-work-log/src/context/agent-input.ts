import type { NormalizedDay } from "../model.js";

export function buildAgentInputMarkdown(day: NormalizedDay): string {
  const lines = [
    "# Daily GitHub Work Summary Request",
    "",
    "You are writing a concise daily engineering work log from GitHub activity data.",
    "Use only the commits, pull requests, issues, and files listed below. Do not invent work.",
    "Group the summary by repository. Highlight outcomes, notable technical changes, risks, and follow-ups.",
    "Write the final answer to `summary.md` in Markdown.",
    "",
    `Date: ${day.date}`,
    `Timezone: ${day.timezone}`,
    `User: ${day.user}`,
    `UTC window: ${day.fromIso} to ${day.toIso}`,
    ""
  ];

  // Issues
  const issuesCreated = day.issues.filter((i) => i.category === "created" || i.category === "assignedCreated");
  const issuesUpdated = day.issues.filter((i) => i.category !== "created" && i.category !== "assignedCreated");

  lines.push("## Issues", "");
  lines.push(`${day.issues.length} issues found.`, "");

  if (issuesCreated.length > 0) {
    lines.push("### Issues Created");
    for (const issue of issuesCreated) {
      lines.push(`- ${issue.repo}: #${issue.number} ${issue.title} (${issue.state}) ${issue.url}`);
    }
    lines.push("");
  }

  if (issuesUpdated.length > 0) {
    lines.push("### Issues Updated");
    for (const issue of issuesUpdated) {
      lines.push(`- ${issue.repo}: #${issue.number} ${issue.title} (${issue.state}) ${issue.url}`);
    }
    lines.push("");
  }

  // Pull requests section
  const prsCreated = day.pullRequests.filter((p) => p.category === "created");
  const prsUpdated = day.pullRequests.filter((p) => p.category === "authoredUpdated");
  const prsReviewed = day.pullRequests.filter((p) => p.category === "reviewed");

  lines.push("## Pull Requests", "");
  lines.push(`${day.pullRequests.length} pull requests found.`, "");

  if (prsCreated.length > 0) {
    lines.push("### PRs Created");
    for (const pr of prsCreated) {
      lines.push(`- ${pr.repo}: #${pr.number} ${pr.title} (${pr.state}) ${pr.url}`);
      if (pr.body) {
        lines.push(`  Body: ${truncate(oneLine(pr.body), 500)}`);
      }
    }
    lines.push("");
  }

  if (prsUpdated.length > 0) {
    lines.push("### PRs Updated");
    for (const pr of prsUpdated) {
      lines.push(`- ${pr.repo}: #${pr.number} ${pr.title} (${pr.state}) ${pr.url}`);
    }
    lines.push("");
  }

  if (prsReviewed.length > 0) {
    lines.push("### PRs Reviewed");
    for (const pr of prsReviewed) {
      const author = pr.author ? ` by @${pr.author}` : "";
      lines.push(`- ${pr.repo}: #${pr.number} ${pr.title}${author} (${pr.state}) ${pr.url}`);
    }
    lines.push("");
  }

  // Commits section
  lines.push("## Work Data", "");

  for (const repo of day.repositories) {
    lines.push(`### ${repo.repo}`, "");
    lines.push(`Private: ${repo.isPrivate ? "yes" : "no"}`);
    lines.push(`Default branch: ${repo.defaultBranch ?? "unknown"}`);
    lines.push(`Commit count: ${repo.commits.length}`, "");

    for (const commit of repo.commits) {
      lines.push(`#### ${commit.sha.slice(0, 12)} - ${firstLine(commit.message)}`);
      lines.push(`URL: ${commit.url}`);
      lines.push(`Author date: ${commit.authorDate}`);
      lines.push(`Committer date: ${commit.committerDate}`);
      lines.push(`Stats: +${commit.stats.additions} -${commit.stats.deletions} (${commit.stats.total} total)`);
      lines.push("");
      lines.push("Files:");
      for (const file of commit.files.slice(0, 50)) {
        lines.push(`- ${file.status}: ${file.path} (+${file.additions} -${file.deletions})`);
      }
      if (commit.files.length > 50) {
        lines.push(`- ${commit.files.length - 50} more file(s) omitted from agent input`);
      }
      lines.push("");
      lines.push("Pull requests:");
      if (commit.pullRequests.length === 0) {
        lines.push("- None found");
      } else {
        for (const pr of commit.pullRequests) {
          lines.push(`- #${pr.number} ${pr.title} (${pr.state}) ${pr.url}`);
          if (pr.mergedAt) {
            lines.push(`  Merged at: ${pr.mergedAt}`);
          }
          if (pr.body) {
            lines.push(`  Body: ${truncate(oneLine(pr.body), 1000)}`);
          }
        }
      }
      lines.push("");
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function firstLine(value: string): string {
  return value.split("\n")[0] ?? value;
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}...`;
}
