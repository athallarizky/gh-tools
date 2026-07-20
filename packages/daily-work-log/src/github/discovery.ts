import type { GitHubClient } from "./client.js";
import { buildUserReposPath, buildOrgReposPath } from "./queries.js";

export type DiscoveredRepository = {
  repo: string;
  isPrivate: boolean;
  defaultBranch: string | null;
};

type UserResponse = {
  login: string;
};

type RepoListItem = {
  full_name: string;
  private: boolean;
  default_branch: string;
  pushed_at: string;
};

export async function getViewerLogin(client: GitHubClient): Promise<string> {
  const user = await client.rest<UserResponse>("user");
  if (!user.login) {
    throw new Error("GitHub API response did not include user login");
  }
  return user.login;
}

export async function discoverRepositories(
  client: GitHubClient,
  input: { orgs?: string[]; pushedAfter?: string }
): Promise<DiscoveredRepository[]> {
  const repos: DiscoveredRepository[] = [];
  const seen = new Set<string>();

  if (input.orgs && input.orgs.length > 0) {
    for (const org of input.orgs) {
      for (let page = 1; page <= 20; page++) {
        const items = await client.rest<RepoListItem[]>(buildOrgReposPath(org, page));
        if (items.length === 0) break;

        let doneEarly = false;
        for (const item of items) {
          if (input.pushedAfter && item.pushed_at < input.pushedAfter) {
            doneEarly = true;
            break;
          }
          if (!seen.has(item.full_name)) {
            seen.add(item.full_name);
            repos.push({
              repo: item.full_name,
              isPrivate: item.private,
              defaultBranch: item.default_branch
            });
          }
        }
        if (doneEarly || items.length < 100) break;
      }
    }
  } else {
    for (let page = 1; page <= 20; page++) {
      const items = await client.rest<RepoListItem[]>(buildUserReposPath(page));
      if (items.length === 0) break;

      let doneEarly = false;
      for (const item of items) {
        if (input.pushedAfter && item.pushed_at < input.pushedAfter) {
          doneEarly = true;
          break;
        }
        if (!seen.has(item.full_name)) {
          seen.add(item.full_name);
          repos.push({
            repo: item.full_name,
            isPrivate: item.private,
            defaultBranch: item.default_branch
          });
        }
      }
      if (doneEarly || items.length < 100) break;
    }
  }

  return repos;
}
