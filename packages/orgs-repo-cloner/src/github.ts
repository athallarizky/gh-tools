import { execa } from "execa";

type RepoItem = {
  full_name: string;
  ssh_url: string;
  clone_url: string;
  private: boolean;
  pushed_at: string;
  archived: boolean;
};

async function rest<T>(path: string): Promise<T> {
  const result = await execa("gh", ["api", path]);
  return JSON.parse(result.stdout) as T;
}

export async function listOrgRepos(org: string, maxRepos?: number): Promise<RepoItem[]> {
  const repos: RepoItem[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= 20; page++) {
    const items = await rest<RepoItem[]>(
      `orgs/${org}/repos?sort=pushed&direction=desc&per_page=100&page=${page}`
    );
    if (items.length === 0) break;

    for (const item of items) {
      if (!seen.has(item.full_name)) {
        seen.add(item.full_name);
        repos.push(item);
        if (maxRepos && repos.length >= maxRepos) break;
      }
    }

    if ((maxRepos && repos.length >= maxRepos) || items.length < 100) break;
  }

  return repos;
}
