import { describe, expect, it } from "vitest";
import { buildStoryCvMarkdown } from "../src/story.js";
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
    repo: "kanvas",
    commitCount: 2,
    additions: 30,
    deletions: 5,
    fileCount: 3,
    commits: [
      {
        sha: "abc12345",
        author: "Atha",
        email: "atha@example.com",
        date: "2024-01-15T10:00:00+07:00",
        subject: "fix: redirect payment flow (#123)",
        files: [
          { path: "src/containers/Payment/index.tsx", additions: 20, deletions: 5 },
          { path: "src/utils/payment.ts", additions: 10, deletions: 0 }
        ]
      },
      {
        sha: "def67890",
        author: "Atha",
        email: "atha@example.com",
        date: "2024-02-10T10:00:00+07:00",
        subject: "feat: add about us section",
        files: [
          { path: "src/components/AboutUs/index.tsx", additions: 30, deletions: 0 }
        ]
      }
    ]
  }
];

describe("buildStoryCvMarkdown", () => {
  it("renders story sections with repo narrative", () => {
    const markdown = buildStoryCvMarkdown(config, repos);

    expect(markdown).toContain("# Portfolio — Story");
    expect(markdown).toContain("## My Story");
    expect(markdown).toContain("### kanvas");
    expect(markdown).toContain("Redirect payment flow");
    expect(markdown).toContain("Add about us section");
  });

  it("handles no active repos", () => {
    const markdown = buildStoryCvMarkdown(config, []);

    expect(markdown).toContain("No matching commit activity found.");
  });
});
