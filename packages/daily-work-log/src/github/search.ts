import type { GitHubClient } from "./client.js";

export type SearchIssueItem = {
  id: number;
  number: number;
  title: string;
  state: string;
  html_url: string;
  body: string | null;
  labels: Array<{ name: string; color: string }>;
  assignees: Array<{ login: string }>;
  user: { login: string } | null;
  created_at: string;
  updated_at: string;
  pull_request?: {
    url: string;
    merged_at: string | null;
  };
  repository_url: string;
};

type SearchResponse = {
  total_count: number;
  incomplete_results: boolean;
  items: SearchIssueItem[];
};

export type IssueCategory = "created" | "authoredUpdated" | "assignedUpdated" | "assignedCreated";
export type PrCategory = "created" | "authoredUpdated" | "reviewed";

export type CategorizedItem = {
  item: SearchIssueItem;
  categories: Set<string>;
  isPr: boolean;
};

export function extractRepo(repositoryUrl: string): string {
  return repositoryUrl.replace("https://api.github.com/repos/", "");
}

export function isPullRequest(item: SearchIssueItem): boolean {
  return item.pull_request !== undefined;
}

export async function searchIssuesAndPrs(
  client: GitHubClient,
  input: { login: string; date: string }
): Promise<CategorizedItem[]> {
  const { login, date } = input;

  const [issuesCreated, issuesAuthoredUpdated, issuesAssignedUpdated, issuesAssignedCreated, prsCreated, prsAuthoredUpdated, prsReviewed] =
    await Promise.all([
      client.rest<SearchResponse>(`/search/issues?q=author:${login}+created:${date}+is:issue&per_page=100`),
      client.rest<SearchResponse>(`/search/issues?q=author:${login}+updated:${date}+is:issue&per_page=100&sort=updated&order=desc`),
      client.rest<SearchResponse>(`/search/issues?q=assignee:${login}+updated:${date}+is:issue&per_page=100&sort=updated&order=desc`),
      client.rest<SearchResponse>(`/search/issues?q=assignee:${login}+created:${date}+is:issue&per_page=100`),
      client.rest<SearchResponse>(`/search/issues?q=author:${login}+created:${date}+is:pr&per_page=100`),
      client.rest<SearchResponse>(`/search/issues?q=author:${login}+updated:${date}+is:pr&per_page=100&sort=updated&order=desc`),
      client.rest<SearchResponse>(`/search/issues?q=reviewed-by:${login}+reviewed:${date}+is:pr&per_page=100`)
    ]);

  const results: CategorizedItem[] = [];

  for (const item of issuesCreated.items) {
    results.push({ item, categories: new Set(["created" as const]), isPr: false });
  }
  for (const item of issuesAuthoredUpdated.items) {
    results.push({ item, categories: new Set(["authoredUpdated" as const]), isPr: false });
  }
  for (const item of issuesAssignedUpdated.items) {
    results.push({ item, categories: new Set(["assignedUpdated" as const]), isPr: false });
  }
  for (const item of issuesAssignedCreated.items) {
    results.push({ item, categories: new Set(["assignedCreated" as const]), isPr: false });
  }
  for (const item of prsCreated.items) {
    results.push({ item, categories: new Set(["created" as const]), isPr: true });
  }
  for (const item of prsAuthoredUpdated.items) {
    results.push({ item, categories: new Set(["authoredUpdated" as const]), isPr: true });
  }
  for (const item of prsReviewed.items) {
    results.push({ item, categories: new Set(["reviewed" as const]), isPr: true });
  }

  return results;
}
