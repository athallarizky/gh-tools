import { describe, expect, it } from "vitest";
import { deduplicateSearchResults, pickBestCategory } from "../src/search/deduplicate.js";
import type { CategorizedItem } from "../src/github/search.js";

function makeItem(id: number, updatedAt: string): CategorizedItem["item"] {
  return {
    id,
    number: id,
    title: `Item ${id}`,
    state: "open",
    html_url: `https://github.com/acme/repo/issues/${id}`,
    body: null,
    labels: [],
    assignees: [],
    user: { login: "atha" },
    created_at: "2026-05-25T10:00:00Z",
    updated_at: updatedAt,
    repository_url: "https://api.github.com/repos/acme/repo"
  };
}

describe("deduplicateSearchResults", () => {
  it("removes duplicates by id, merging categories", () => {
    const items: CategorizedItem[] = [
      { item: makeItem(1, "2026-05-25T10:00:00Z"), categories: new Set(["created"]), isPr: false },
      { item: makeItem(1, "2026-05-25T12:00:00Z"), categories: new Set(["authoredUpdated"]), isPr: false },
      { item: makeItem(2, "2026-05-25T11:00:00Z"), categories: new Set(["created"]), isPr: false }
    ];

    const result = deduplicateSearchResults(items);

    expect(result).toHaveLength(2);
    expect(result.find((r) => r.item.id === 1)?.categories).toEqual(new Set(["created", "authoredUpdated"]));
    expect(result.find((r) => r.item.id === 1)?.item.updated_at).toBe("2026-05-25T12:00:00Z");
  });

  it("keeps unique items unchanged", () => {
    const items: CategorizedItem[] = [
      { item: makeItem(1, "2026-05-25T10:00:00Z"), categories: new Set(["created"]), isPr: false },
      { item: makeItem(2, "2026-05-25T11:00:00Z"), categories: new Set(["authoredUpdated"]), isPr: false }
    ];

    const result = deduplicateSearchResults(items);

    expect(result).toHaveLength(2);
  });

  it("keeps a duplicate item classified as a pull request when any source says it is a PR", () => {
    const items: CategorizedItem[] = [
      { item: makeItem(1, "2026-05-25T10:00:00Z"), categories: new Set(["authoredUpdated"]), isPr: false },
      {
        item: {
          ...makeItem(1, "2026-05-25T12:00:00Z"),
          pull_request: { url: "https://api.github.com/repos/acme/repo/pulls/1", merged_at: null }
        },
        categories: new Set(["authoredUpdated"]),
        isPr: true
      }
    ];

    const result = deduplicateSearchResults(items);

    expect(result).toHaveLength(1);
    expect(result[0]?.isPr).toBe(true);
  });
});

describe("pickBestCategory", () => {
  it("picks 'created' over other categories for issues", () => {
    expect(pickBestCategory(new Set(["authoredUpdated", "created"]), false)).toBe("created");
  });

  it("picks 'created' over other categories for PRs", () => {
    expect(pickBestCategory(new Set(["reviewed", "created"]), true)).toBe("created");
  });

  it("picks 'authoredUpdated' when 'created' is absent for issues", () => {
    expect(pickBestCategory(new Set(["assignedUpdated", "authoredUpdated"]), false)).toBe("authoredUpdated");
  });

  it("picks 'reviewed' when higher priorities are absent for PRs", () => {
    expect(pickBestCategory(new Set(["involved", "reviewed"]), true)).toBe("reviewed");
  });
});
