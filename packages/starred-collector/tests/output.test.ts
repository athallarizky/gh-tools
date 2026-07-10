import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { rm, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { writeMarkdown } from "../src/output/markdown.js";
import { writeJson } from "../src/output/json.js";
import { writeCsv } from "../src/output/csv.js";
import type { Repo } from "../src/types.js";

const TMP = join(import.meta.dirname, "..", "tmp-test-output");

function repo(n: number, lang: string, desc: string, stars = n): Repo {
  return {
    full_name: `owner/repo-${n}`,
    name: `repo-${n}`,
    html_url: `https://github.com/owner/repo-${n}`,
    description: desc,
    homepage: null,
    topics: [],
    language: lang,
    license: { key: "mit", name: "MIT License", spdx_id: "MIT" },
    is_template: false,
    fork: false,
    archived: false,
    owner: { login: "owner", avatar_url: "https://github.com/owner.png", type: "User" },
    stargazers_count: stars,
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

const SAMPLE: Repo[] = [
  repo(1, "TypeScript", "A react component library.", 500),
  repo(2, "Rust", "A local LLM inference engine.", 1200),
  repo(3, "TypeScript", "A fast cli terminal tool.", 50),
];

beforeEach(async () => {
  await rm(TMP, { recursive: true, force: true });
});

afterEach(async () => {
  await rm(TMP, { recursive: true, force: true });
});

describe("writeMarkdown", () => {
  it("writes frontmatter, TOC, stats, and per-category detail blocks", async () => {
    const file = await writeMarkdown(SAMPLE, {
      outputDir: TMP,
      filename: "stars",
      user: "testuser",
      includeCategories: true,
    });
    const content = await readFile(file, "utf8");

    expect(content).toMatch(/^---\ntitle: GitHub Starred Repos/);
    expect(content).toContain("source: https://github.com/testuser?tab=stars");
    expect(content).toContain("[[#Frontend / UI / Design]]");
    expect(content).toContain("[[#AI / Agents / LLM]]");
    expect(content).toContain("## Frontend / UI / Design");
    // detail block uses ### heading with link
    expect(content).toContain("### [owner/repo-1]");
    expect(content).toContain("1.2k"); // 1200 stars → 1.2k
    expect(content).toContain("`TypeScript`");
    // knowledge-base fields present
    expect(content).toContain("**License:** MIT");
    expect(content).toContain("**🍴**");
    expect(content).toContain("**⚠**");
  });

  it("respects onlyCategory filter", async () => {
    const file = await writeMarkdown(SAMPLE, {
      outputDir: TMP,
      filename: "stars",
      user: "testuser",
      includeCategories: true,
      onlyCategory: "AI / Agents / LLM",
    });
    const content = await readFile(file, "utf8");

    expect(content).toContain("## AI / Agents / LLM");
    expect(content).not.toContain("## Frontend / UI / Design");
  });

  it("emits a flat list when includeCategories is false", async () => {
    const file = await writeMarkdown(SAMPLE, {
      outputDir: TMP,
      filename: "stars",
      user: "testuser",
      includeCategories: false,
    });
    const content = await readFile(file, "utf8");

    expect(content).toContain("## All Repos");
    expect(content).not.toContain("[[#");
  });

  it("escapes pipes in descriptions", async () => {
    const repos = [repo(1, "TypeScript", "has a | pipe in it")];
    const file = await writeMarkdown(repos, {
      outputDir: TMP,
      filename: "stars",
      user: "u",
      includeCategories: false,
    });
    const content = await readFile(file, "utf8");
    expect(content).toContain("has a \\| pipe in it");
  });

  it("includes maintenance signals in statistics", async () => {
    const file = await writeMarkdown(SAMPLE, {
      outputDir: TMP,
      filename: "stars",
      user: "testuser",
      includeCategories: false,
    });
    const content = await readFile(file, "utf8");
    expect(content).toContain("**Maintenance signals:**");
    expect(content).toContain("Archived");
  });
});

describe("writeJson", () => {
  it("writes meta, categories summary, and repos with category field", async () => {
    const file = await writeJson(SAMPLE, { outputDir: TMP, filename: "stars", user: "testuser" });
    const content = await readFile(file, "utf8");
    const parsed = JSON.parse(content);

    expect(parsed.meta.total).toBe(3);
    expect(parsed.meta.user).toBe("testuser");
    expect(parsed.categories["AI / Agents / LLM"]).toBe(1);
    expect(parsed.categories["Frontend / UI / Design"]).toBe(1);
    expect(Array.isArray(parsed.repos)).toBe(true);
    expect(parsed.repos[0]).toHaveProperty("category");
    expect(parsed.repos[0]).toHaveProperty("full_name");
  });
});

describe("writeCsv", () => {
  it("writes a header row and one row per repo with category and new fields", async () => {
    const file = await writeCsv(SAMPLE, { outputDir: TMP, filename: "stars" });
    const content = await readFile(file, "utf8");
    const lines = content.trim().split("\n");

    expect(lines[0]).toBe(
      "full_name,url,description,language,stars,forks,open_issues,license,topics,category,is_archived,pushed_at,created_at,homepage",
    );
    expect(lines).toHaveLength(4); // header + 3 repos

    // The LLM repo should mention its category in the row.
    const llmRow = lines.find((l) => l.includes("repo-2"));
    expect(llmRow).toBeDefined();
    expect(llmRow).toContain("AI / Agents / LLM");
    expect(llmRow).toContain("MIT");
  });

  it("quotes fields containing commas", async () => {
    const repos = [repo(1, "Go", "hello, world")];
    const file = await writeCsv(repos, { outputDir: TMP, filename: "stars" });
    const content = await readFile(file, "utf8");
    expect(content).toContain('"hello, world"');
  });
});

describe("all formats land in the output dir", () => {
  it("creates the directory if missing and writes the expected extensions", async () => {
    await writeMarkdown(SAMPLE, { outputDir: TMP, filename: "f", user: "u", includeCategories: false });
    await writeJson(SAMPLE, { outputDir: TMP, filename: "f", user: "u" });
    await writeCsv(SAMPLE, { outputDir: TMP, filename: "f" });

    const files = await readdir(TMP);
    expect(files.sort()).toEqual(["f.csv", "f.json", "f.md"]);
  });
});
