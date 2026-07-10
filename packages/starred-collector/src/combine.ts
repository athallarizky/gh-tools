/**
 * Combine engine — merges per-user CSV collections into one deduplicated
 * catalog. Pure functions (except filesystem discovery), fully unit-testable.
 *
 * Pipeline:  discover → read → merge (dedup by full_name) → sort
 *
 * Dedup rule: when the same repo (full_name) appears in multiple users'
 * collections, keep ONE row — the version with the highest star count (most
 * recent snapshot wins). The combined CSV is a pure tool catalog (no
 * starred_by column); the combined MD adds a "Starred by N users" popularity
 * line derived during merge.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { parseCsv, type RepoCsvRow } from "./output/csv.js";

export type DiscoveredCollection = {
  user: string;
  csvPath: string;
};

export type MergeResult = {
  merged: RepoCsvRow[];
  duplicatesRemoved: number;
  totalInputRows: number;
  /** How many users starred each repo (for the MD popularity line). */
  starredByCounts: Map<string, number>;
};

// ─── discovery ───────────────────────────────────────────────────────────────

/**
 * Find all per-user collections under <inputDir>. A collection is a
 * subdirectory containing a `data.csv`. The `_combined` output dir is skipped.
 */
export async function discoverUserCollections(inputDir: string): Promise<DiscoveredCollection[]> {
  let entries: string[];
  try {
    entries = await readdir(inputDir);
  } catch {
    return [];
  }

  const found: DiscoveredCollection[] = [];
  for (const name of entries) {
    if (name.startsWith("_") || name.startsWith(".")) continue; // skip _combined, hidden
    const csvPath = join(inputDir, name, "data.csv");
    try {
      const s = await stat(csvPath);
      if (s.isFile()) {
        found.push({ user: name, csvPath });
      }
    } catch {
      // not a collection folder (no data.csv) — skip
    }
  }
  return found.sort((a, b) => a.user.localeCompare(b.user));
}

/** Read + parse a single collection CSV. */
export async function readCollectionCsv(csvPath: string): Promise<RepoCsvRow[]> {
  const text = await readFile(csvPath, "utf8");
  return parseCsv(text);
}

// ─── merge ───────────────────────────────────────────────────────────────────

/**
 * Merge multiple users' collections into one deduplicated catalog.
 *
 * @param collections Map of user login → their parsed CSV rows.
 * @returns deduplicated rows + stats + per-repo starred-by counts.
 */
export function mergeCollections(collections: Map<string, RepoCsvRow[]>): MergeResult {
  const byName = new Map<string, RepoCsvRow>();
  const starredByCounts = new Map<string, number>();
  let totalInputRows = 0;

  for (const [_user, rows] of collections) {
    for (const row of rows) {
      totalInputRows++;
      const key = row.full_name;

      // Track how many users starred this repo
      starredByCounts.set(key, (starredByCounts.get(key) ?? 0) + 1);

      // Dedup: keep the version with the highest star count
      const existing = byName.get(key);
      if (!existing || row.stars > existing.stars) {
        byName.set(key, row);
      }
    }
  }

  const merged = sortMerged([...byName.values()]);
  return {
    merged,
    duplicatesRemoved: totalInputRows - merged.length,
    totalInputRows,
    starredByCounts,
  };
}

/** Sort merged rows by stars descending (the default for a tool catalog). */
export function sortMerged(rows: RepoCsvRow[]): RepoCsvRow[] {
  return [...rows].sort((a, b) => b.stars - a.stars);
}

/**
 * Convert a parsed CSV row back into a Repo-shaped object so the markdown
 * writer can be reused. Fields not present in the CSV (owner avatar, watchers,
 * etc.) are filled with safe defaults — they're not shown in the knowledge-base
 * output anyway.
 */
export function csvRowToRepo(row: RepoCsvRow): import("./types.js").Repo {
  return {
    full_name: row.full_name,
    name: row.full_name.split("/")[1] ?? row.full_name,
    html_url: row.url,
    description: row.description || null,
    homepage: row.homepage || null,
    topics: row.topics,
    language: row.language || null,
    license: row.license ? { key: row.license, name: row.license, spdx_id: row.license } : null,
    is_template: false,
    fork: false,
    archived: row.is_archived,
    owner: { login: row.full_name.split("/")[0] ?? "unknown", avatar_url: "", type: "User" },
    stargazers_count: row.stars,
    forks_count: row.forks,
    open_issues_count: row.open_issues,
    watchers_count: 0,
    has_discussions: false,
    visibility: "public",
    created_at: row.created_at,
    updated_at: row.pushed_at,
    pushed_at: row.pushed_at,
  };
}
