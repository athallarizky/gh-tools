/**
 * Paginated fetcher for a user's starred repos. Walks the starred endpoint
 * `per_page=100` until a page returns fewer than 100 items (the GitHub
 * pagination idiom — we stop at the first short page rather than relying on
 * the absent total-count header).
 */
import type { GitHubClient } from "./github/client.js";
import { buildStarredPath, buildViewerStarredPath } from "./github/queries.js";
import type { Logger } from "./logger.js";
import { repoSchema, type Repo } from "./types.js";

const PER_PAGE = 100;
const MAX_PAGES = 20; // safety cap: 20 × 100 = 2000 repos

export async function fetchAllStarred(
  client: GitHubClient,
  user: string,
  logger: Logger,
): Promise<Repo[]> {
  // `/user/starred` works only for the authenticated viewer; for any other
  // login we use the public `/users/<login>/stared` endpoint.
  const isViewer = user === "viewer" || user === "";
  const pathFn = isViewer
    ? (page: number) => buildViewerStarredPath(page, PER_PAGE)
    : (page: number) => buildStarredPath(user, page, PER_PAGE);

  const all: Repo[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const path = pathFn(page);
    logger.debug(`Fetching starred repos — page ${page}`);
    const raw = await client.rest<unknown[]>(path);
    if (!Array.isArray(raw)) {
      throw new Error(`Unexpected (non-array) response on page ${page}.`);
    }
    const repos = raw.map((r) => repoSchema.parse(r));
    all.push(...repos);
    logger.debug(`  got ${repos.length} repos (total: ${all.length})`);
    if (repos.length < PER_PAGE) break; // short page ⇒ done
  }
  return all;
}
