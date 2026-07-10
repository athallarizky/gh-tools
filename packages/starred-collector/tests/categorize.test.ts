import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  OTHER_CATEGORY,
  categorize,
  groupByCategory,
} from "../src/categorize.js";
import type { Repo } from "../src/types.js";

/** Helper: build a minimal valid repo from a description + optional name/topics. */
function makeRepo(
  description: string,
  opts: { name?: string; topics?: string[]; stars?: number } = {},
): Repo {
  return {
    full_name: `test/${opts.name ?? "repo"}`,
    name: opts.name ?? "repo",
    html_url: "https://github.com/test/repo",
    description,
    homepage: null,
    topics: opts.topics ?? [],
    language: null,
    license: null,
    is_template: false,
    fork: false,
    archived: false,
    owner: { login: "test", avatar_url: "https://github.com/test.png", type: "User" },
    stargazers_count: opts.stars ?? 0,
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

describe("categorize", () => {
  it("routes an LLM-related repo to AI / Agents / LLM", () => {
    const repo = makeRepo("A local LLM inference engine using llama.", {
      topics: ["llm", "ai"],
    });
    expect(categorize(repo)).toBe("AI / Agents / LLM");
  });

  it("routes a React component library to Frontend, not AI", () => {
    // The description mentions "AI" but the primary purpose is a React UI kit —
    // Frontend is checked AFTER AI in the ruleset, so this tests that specific
    // categories still win when the text genuinely matches them. We rely on the
    // explicit frontend keywords winning through order: Frontend appears before
    // AI/LLM, so a repo matching both should land in Frontend.
    const repo = makeRepo("A react component library with tailwind css and design system.", {
      topics: ["react", "css"],
    });
    expect(categorize(repo)).toBe("Frontend / UI / Design");
  });

  it("routes a Postgres ORM to Backend / API / Database", () => {
    const repo = makeRepo("A modern ORM for postgres and mysql.");
    expect(categorize(repo)).toBe("Backend / API / Database");
  });

  it("routes a CLI terminal tool to DevTools", () => {
    const repo = makeRepo("A fast cli terminal tool with tui and fuzzy finder.");
    expect(categorize(repo)).toBe("DevTools / CLI / Terminal");
  });

  it("routes a docker/kubernetes deploy tool to Build / DevOps", () => {
    const repo = makeRepo("Deploy docker containers to kubernetes with CI/CD.");
    expect(categorize(repo)).toBe("Build / Deploy / DevOps / Cloud");
  });

  it("routes a password manager / vpn to Security", () => {
    const repo = makeRepo("A self-hosted password manager with 2fa and encryption.");
    expect(categorize(repo)).toBe("Security / Privacy / Networking");
  });

  it("routes an awesome-list to Awesome Lists", () => {
    const repo = makeRepo("A curated list of awesome-go resources.");
    expect(categorize(repo)).toBe("Awesome Lists / Curated");
  });

  it("routes a template/boilerplate to Templates", () => {
    const repo = makeRepo("A nextjs starter kit and boilerplate.");
    expect(categorize(repo)).toBe("Templates / Starters / Boilerplates");
  });

  it("falls back to Other when nothing matches", () => {
    const repo = makeRepo("zzz qqq xxx unmatchable gibberish.");
    expect(categorize(repo)).toBe(OTHER_CATEGORY);
  });

  it("checks name and topics, not just description", () => {
    const repo = makeRepo("No description here.", {
      name: "my-react-app",
      topics: ["react"],
    });
    expect(categorize(repo)).toBe("Frontend / UI / Design");
  });

  it("every category in CATEGORIES has at least one pattern", () => {
    for (const cat of CATEGORIES) {
      expect(cat.patterns.length).toBeGreaterThan(0);
      expect(cat.name.length).toBeGreaterThan(0);
    }
  });
});

describe("groupByCategory", () => {
  it("groups repos and sorts each group by stars descending", () => {
    const repos = [
      makeRepo("A react component library.", { name: "a", stars: 100 }),
      makeRepo("A smaller react css kit.", { name: "b", stars: 500 }),
      makeRepo("An LLM inference engine.", { name: "c", stars: 300 }),
    ];
    const groups = groupByCategory(repos);

    // Empty categories are still present as empty arrays.
    expect(groups.get("Backend / API / Database")).toEqual([]);

    const frontend = groups.get("Frontend / UI / Design")!;
    expect(frontend.map((r) => r.name)).toEqual(["b", "a"]); // 500 then 100

    const ai = groups.get("AI / Agents / LLM")!;
    expect(ai.map((r) => r.name)).toEqual(["c"]);
  });

  it("includes the Other bucket even when empty", () => {
    const groups = groupByCategory([]);
    expect(groups.get(OTHER_CATEGORY)).toEqual([]);
  });
});
