export function buildCommitPath(repo: string, sha: string): string {
  return `repos/${repo}/commits/${sha}`;
}

export function buildAssociatedPullsPath(repo: string, sha: string): string {
  return `repos/${repo}/commits/${sha}/pulls`;
}

export function buildRepoCommitsPath(
  repo: string,
  params: { author: string; since: string; until: string; page: number }
): string {
  return `repos/${repo}/commits?author=${encodeURIComponent(params.author)}&since=${encodeURIComponent(params.since)}&until=${encodeURIComponent(params.until)}&per_page=100&page=${params.page}`;
}

export function buildUserReposPath(page: number): string {
  return `user/repos?affiliation=owner,collaborator,organization_member&sort=pushed&direction=desc&per_page=100&page=${page}`;
}

export function buildOrgReposPath(org: string, page: number): string {
  return `orgs/${org}/repos?sort=pushed&direction=desc&per_page=100&page=${page}`;
}
