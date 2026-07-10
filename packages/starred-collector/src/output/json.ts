/**
 * Structured JSON writer. Emits the full repo list plus a categories summary
 * block — suitable for programmatic consumption or re-import.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { CATEGORY_NAMES, categorize } from "../categorize.js";
import type { Repo } from "../types.js";

export type JsonOptions = {
  outputDir: string;
  filename: string;
  user: string;
};

export async function writeJson(repos: Repo[], opts: JsonOptions): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);

  const summary: Record<string, number> = {};
  for (const name of CATEGORY_NAMES) summary[name] = 0;
  for (const repo of repos) {
    const cat = categorize(repo);
    summary[cat] = (summary[cat] ?? 0) + 1;
  }

  const payload = {
    meta: {
      user: opts.user,
      source: `https://github.com/${opts.user}?tab=stars`,
      fetchedAt: today,
      total: repos.length,
    },
    categories: summary,
    repos: repos.map((r) => ({
      ...r,
      category: categorize(r),
    })),
  };

  const content = JSON.stringify(payload, null, 2) + "\n";
  const filepath = join(opts.outputDir, `${opts.filename}.json`);
  await mkdir(dirname(filepath), { recursive: true });
  await writeFile(filepath, content, "utf8");
  return filepath;
}
