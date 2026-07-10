import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  discoverUserCollections,
  mergeCollections,
  sortMerged,
  csvRowToRepo,
} from "../src/combine.js";
import { parseCsv, type RepoCsvRow } from "../src/output/csv.js";

const TMP = join(import.meta.dirname, "..", "tmp-test-combine");

/** Build a RepoCsvRow with sensible defaults for tests. */
function row(fullName: string, overrides: Partial<RepoCsvRow> = {}): RepoCsvRow {
  return {
    full_name: fullName,
    url: `https://github.com/${fullName}`,
    description: `desc for ${fullName}`,
    language: "TypeScript",
    stars: 100,
    forks: 10,
    open_issues: 1,
    license: "MIT",
    topics: ["react"],
    category: "Frontend / UI / Design",
    is_archived: false,
    pushed_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    homepage: "",
    ...overrides,
  };
}

beforeEach(async () => {
  await rm(TMP, { recursive: true, force: true });
});

afterEach(async () => {
  await rm(TMP, { recursive: true, force: true });
});

describe("mergeCollections", () => {
  it("deduplicates repos by full_name across users", () => {
    const collections = new Map<string, RepoCsvRow[]>([
      ["alice", [row("vercel/next.js"), row("facebook/react")]],
      ["bob", [row("vercel/next.js"), row("vuejs/vue")]],
    ]);

    const result = mergeCollections(collections);

    expect(result.merged).toHaveLength(3); // next.js, react, vue
    expect(result.duplicatesRemoved).toBe(1); // next.js appeared twice
    expect(result.totalInputRows).toBe(4);
  });

  it("keeps the highest-star version on conflict", () => {
    const collections = new Map<string, RepoCsvRow[]>([
      ["alice", [row("vercel/next.js", { stars: 50000 })]],
      ["bob", [row("vercel/next.js", { stars: 120000 })]],
    ]);

    const result = mergeCollections(collections);

    expect(result.merged).toHaveLength(1);
    expect(result.merged[0].stars).toBe(120000); // bob's higher version wins
  });

  it("tracks starred-by counts for the popularity signal", () => {
    const collections = new Map<string, RepoCsvRow[]>([
      ["alice", [row("a/repo"), row("b/repo")]],
      ["bob", [row("a/repo")]], // a/repo starred by both
      ["charlie", [row("a/repo")]], // a/repo starred by all three
    ]);

    const result = mergeCollections(collections);

    expect(result.starredByCounts.get("a/repo")).toBe(3);
    expect(result.starredByCounts.get("b/repo")).toBe(1);
  });

  it("handles empty collections", () => {
    const result = mergeCollections(new Map());
    expect(result.merged).toEqual([]);
    expect(result.duplicatesRemoved).toBe(0);
    expect(result.totalInputRows).toBe(0);
  });

  it("handles a user with no repos", () => {
    const collections = new Map<string, RepoCsvRow[]>([
      ["alice", [row("a/repo")]],
      ["bob", []],
    ]);

    const result = mergeCollections(collections);

    expect(result.merged).toHaveLength(1);
    expect(result.totalInputRows).toBe(1);
  });
});

describe("sortMerged", () => {
  it("sorts by stars descending", () => {
    const rows = [row("a/low", { stars: 10 }), row("b/high", { stars: 999 }), row("c/mid", { stars: 100 })];

    const sorted = sortMerged(rows);

    expect(sorted.map((r) => r.full_name)).toEqual(["b/high", "c/mid", "a/low"]);
  });

  it("does not mutate the input", () => {
    const rows = [row("a/low", { stars: 10 }), row("b/high", { stars: 999 })];
    const original = [...rows];

    sortMerged(rows);

    expect(rows.map((r) => r.full_name)).toEqual(original.map((r) => r.full_name));
  });
});

describe("csvRowToRepo", () => {
  it("converts a CSV row back to a Repo-shaped object", () => {
    const r = row("vercel/next.js", { stars: 140000, language: "TypeScript", topics: ["react", "ssr"] });

    const repo = csvRowToRepo(r);

    expect(repo.full_name).toBe("vercel/next.js");
    expect(repo.name).toBe("next.js");
    expect(repo.stargazers_count).toBe(140000);
    expect(repo.language).toBe("TypeScript");
    expect(repo.topics).toEqual(["react", "ssr"]);
    expect(repo.license?.spdx_id).toBe("MIT");
    expect(repo.html_url).toBe("https://github.com/vercel/next.js");
  });

  it("handles empty license gracefully", () => {
    const r = row("a/repo", { license: "" });
    const repo = csvRowToRepo(r);
    expect(repo.license).toBeNull();
  });
});

describe("discoverUserCollections", () => {
  it("finds user folders with data.csv", async () => {
    // Create fake collection folders
    await mkdir(join(TMP, "alice"), { recursive: true });
    await mkdir(join(TMP, "bob"), { recursive: true });
    await mkdir(join(TMP, "_combined"), { recursive: true });
    await mkdir(join(TMP, "no-csv-user"), { recursive: true });

    await writeFile(join(TMP, "alice", "data.csv"), "full_name\nalice/repo\n");
    await writeFile(join(TMP, "bob", "data.csv"), "full_name\nbob/repo\n");
    await writeFile(join(TMP, "_combined", "combined.csv"), "full_name\n");

    const found = await discoverUserCollections(TMP);

    expect(found).toHaveLength(2);
    expect(found.map((f) => f.user)).toEqual(["alice", "bob"]); // sorted
    // _combined and no-csv-user are excluded
    expect(found.find((f) => f.user === "_combined")).toBeUndefined();
    expect(found.find((f) => f.user === "no-csv-user")).toBeUndefined();
  });

  it("returns empty array for a nonexistent directory", async () => {
    const found = await discoverUserCollections(join(TMP, "does-not-exist"));
    expect(found).toEqual([]);
  });
});

describe("parseCsv (round-trip with writeCsv)", () => {
  it("parses fields with commas, quotes, and newlines correctly", () => {
    // A CSV with tricky fields
    const csvText = [
      "full_name,url,description,language,stars,forks,open_issues,license,topics,category,is_archived,pushed_at,created_at,homepage",
      '"a/repo","https://github.com/a/repo","Hello, world!","TypeScript","100","10","1","MIT","react;ssr","Frontend","false","2026-01-01","2026-01-01",""',
    ].join("\n");

    const rows = parseCsv(csvText);

    expect(rows).toHaveLength(1);
    expect(rows[0].full_name).toBe("a/repo");
    expect(rows[0].description).toBe("Hello, world!"); // comma inside quotes
    expect(rows[0].stars).toBe(100);
    expect(rows[0].topics).toEqual(["react", "ssr"]); // semicolon-split
    expect(rows[0].is_archived).toBe(false);
  });
});
