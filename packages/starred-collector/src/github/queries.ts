/**
 * Pure path builders for the GitHub REST API. Keeping URLs here (out of the
 * client) makes them trivial to unit-test and swap.
 */

/** `/users/<login>/starred?page=N&per_page=P` — public starred list for any user. */
export function buildStarredPath(user: string, page: number, perPage: number): string {
  return `/users/${encodeURIComponent(user)}/starred?page=${page}&per_page=${perPage}`;
}

/** `/user/starred?page=N&per_page=P` — starred list for the *authenticated* viewer. */
export function buildViewerStarredPath(page: number, perPage: number): string {
  return `/user/starred?page=${page}&per_page=${perPage}`;
}

/** `/user` — returns the authenticated viewer's profile (to resolve `login`). */
export function buildViewerPath(): string {
  return "/user";
}
