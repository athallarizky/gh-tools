import { describe, expect, it } from "vitest";
import { normalizeSearchItem } from "../src/search/normalize.js";
import type { SearchIssueItem } from "../src/github/search.js";

function makeSearchItem(overrides: Partial<SearchIssueItem> = {}): SearchIssueItem {
  return {
    id: 100,
    number: 42,
    title: "Fix bug",
    state: "open",
    html_url: "https://github.com/acme/repo/issues/42",
    body: "Some description",
    labels: [{ name: "bug", color: "ff0000" }],
    assignees: [],
    user: { login: "atha" },
    created_at: "2026-05-25T10:00:00Z",
    updated_at: "2026-05-25T12:00:00Z",
    repository_url: "https://api.github.com/repos/acme/repo",
    ...overrides
  };
}

describe("normalizeSearchItem", () => {
  it("normalizes an issue", () => {
    const result = normalizeSearchItem(makeSearchItem(), "created", false);

    expect(result).toEqual({
      id: 100,
      repo: "acme/repo",
      number: 42,
      title: "Fix bug",
      state: "open",
      url: "https://github.com/acme/repo/issues/42",
      labels: [{ name: "bug", color: "ff0000" }],
      createdAt: "2026-05-25T10:00:00Z",
      updatedAt: "2026-05-25T12:00:00Z",
      category: "created"
    });
  });

  it("normalizes a pull request", () => {
    const item = makeSearchItem({
      pull_request: { url: "https://api.github.com/repos/acme/repo/pulls/42", merged_at: "2026-05-25T14:00:00Z" }
    });
    const result = normalizeSearchItem(item, "authoredUpdated", true);

    expect(result).toEqual({
      id: 100,
      repo: "acme/repo",
      number: 42,
      title: "Fix bug",
      state: "open",
      url: "https://github.com/acme/repo/issues/42",
      body: "Some description",
      labels: [{ name: "bug", color: "ff0000" }],
      createdAt: "2026-05-25T10:00:00Z",
      updatedAt: "2026-05-25T12:00:00Z",
      mergedAt: "2026-05-25T14:00:00Z",
      author: "atha",
      category: "authoredUpdated"
    });
  });

  it("handles null mergedAt for unmerged PRs", () => {
    const item = makeSearchItem({
      pull_request: { url: "https://api.github.com/repos/acme/repo/pulls/42", merged_at: null }
    });
    const result = normalizeSearchItem(item, "reviewed", true);

    expect(result).toMatchObject({ mergedAt: null });
  });
});
