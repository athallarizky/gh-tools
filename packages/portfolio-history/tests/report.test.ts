import { describe, expect, it } from "vitest";
import { buildCvMarkdown, buildSelectedCommitsMarkdown } from "../src/report.js";
import type { Config } from "../src/config.js";
import type { RepoSummary } from "../src/summary.js";

const config: Config = {
  reposDir: "./org-repos",
  outputDir: "./output",
  since: "2024-01-01",
  until: "2024-12-31",
  debug: false
};

const repos: RepoSummary[] = [
  {
    repo: "api",
    commitCount: 2,
    additions: 10,
    deletions: 2,
    fileCount: 2,
    commits: [
      {
        sha: "abc12345",
        author: "Atha",
        email: "atha@example.com",
        date: "2024-01-15T10:00:00+07:00",
        subject: "feat: implement login flow",
        files: []
      }
    ]
  }
];

describe("buildSelectedCommitsMarkdown", () => {
  it("renders aggregate totals and repo summaries", () => {
    const markdown = buildSelectedCommitsMarkdown(config, repos);

    expect(markdown).toContain("# Portfolio — Selected Commits");
    expect(markdown).toContain("Total commits: 2");
    expect(markdown).toContain("### api");
    expect(markdown).toContain("implement login flow");
  });

  it("handles no active repos", () => {
    const markdown = buildSelectedCommitsMarkdown(config, []);

    expect(markdown).toContain("No matching commit activity found.");
  });
});

describe("buildCvMarkdown", () => {
  it("renders a summary and experience sections", () => {
    const markdown = buildCvMarkdown(config, repos);

    expect(markdown).toContain("# Portfolio");
    expect(markdown).toContain("## Summary");
    expect(markdown).toContain("## Experience");
    expect(markdown).toContain("### api");
    expect(markdown).toContain("Implement login flow");
  });

  it("handles no active repos", () => {
    const markdown = buildCvMarkdown(config, []);

    expect(markdown).toContain("No matching commit activity found.");
  });
});
