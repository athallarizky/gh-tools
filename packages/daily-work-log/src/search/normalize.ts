import type { SearchIssueItem, IssueCategory, PrCategory } from "../github/search.js";
import { extractRepo } from "../github/search.js";
import type { NormalizedIssue, NormalizedSearchPullRequest } from "../model.js";

export function normalizeSearchItem(
  item: SearchIssueItem,
  category: string,
  isPr: boolean
): NormalizedIssue | NormalizedSearchPullRequest {
  const repo = extractRepo(item.repository_url);

  if (isPr) {
    return {
      id: item.id,
      repo,
      number: item.number,
      title: item.title,
      state: item.state,
      url: item.html_url,
      body: item.body,
      labels: item.labels.map((l) => ({ name: l.name, color: l.color })),
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      mergedAt: item.pull_request?.merged_at ?? null,
      author: item.user?.login ?? null,
      category: category as PrCategory
    };
  }

  return {
    id: item.id,
    repo,
    number: item.number,
    title: item.title,
    state: item.state,
    url: item.html_url,
    labels: item.labels.map((l) => ({ name: l.name, color: l.color })),
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    category: category as IssueCategory
  };
}
