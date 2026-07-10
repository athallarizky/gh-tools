#!/usr/bin/env node
/**
 * starred-collector - collect a user's GitHub starred repos, categorize them,
 * and export to a knowledge-base markdown + machine-readable CSV. Also merges
 * multiple users' collections into one deduplicated catalog.
 *
 * Two subcommands:
 *   collect  - fetch a user's stars into collections/{user}/{starred.md, data.csv}
 *   combine  - merge all collections data.csv into collections/_combined/{combined.md, combined.csv}
 *
 * Agent-driven: fully flag-based, zero prompts. Every invocation works
 * non-interactively - called by an LLM, a script, or CI.
 */
import "dotenv/config";
import { Command } from "commander";
import { parseCollectConfig, parseCombineConfig, SORT_OPTIONS } from "./config.js";
import { createLogger } from "./logger.js";
import { createGitHubClient } from "./github/client.js";
import { fetchAllStarred } from "./fetch.js";
import { writeMarkdown } from "./output/markdown.js";
import { writeCsv } from "./output/csv.js";
import {
  discoverUserCollections,
  readCollectionCsv,
  mergeCollections,
  csvRowToRepo,
} from "./combine.js";
import type { Repo } from "./types.js";
import type { RepoCsvRow } from "./output/csv.js";
import { CSV_HEADER } from "./output/csv.js";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const DEFAULT_COLLECTIONS_DIR = "./collections";

const program = new Command();

program
  .name("starred-collector")
  .description("Collect GitHub starred repos into knowledge-base files and merge collections.");

// ─── collect ─────────────────────────────────────────────────────────────────

program
  .command("collect")
  .description("Collect a user's starred repos → collections/<user>/{starred.md, data.csv}.")
  .option("--user <login>", "GitHub username to collect (default: authenticated user)")
  .option("--output <dir>", "Collections root directory", DEFAULT_COLLECTIONS_DIR)
  .option("--language <lang>", "Filter results to a primary language (e.g. TypeScript)")
  .option("--category <cat>", "Emit only repos in this category (markdown only)")
  .option("--no-categories", "Skip categorization; emit a flat list")
  .option("--sort <order>", `Sort order: ${SORT_OPTIONS.join("/")}`, "stars")
  .option("--debug", "Print debug information", false)
  .action(async (options) => {
    const logger = createLogger(Boolean(options.debug));
    const client = createGitHubClient(process.env);

    // Resolve the effective username (viewer login if --user omitted).
    let user = options.user ?? "viewer";
    if (user === "viewer") {
      const login = await client.getViewerLogin();
      if (!login) {
        throw new Error(
          'Could not resolve the authenticated user. Run "gh auth status" or set GITHUB_TOKEN.',
        );
      }
      user = login;
      logger.debug(`Resolved authenticated viewer: ${user}`);
    }

    const config = parseCollectConfig({
      user,
      output: options.output,
      language: options.language,
      category: options.category,
      categories: Boolean(options.categories),
      sort: options.sort,
      debug: Boolean(options.debug),
    });

    // Collect.
    logger.info(`Collecting starred repos for @${config.user} ...`);
    let repos = await fetchAllStarred(client, config.user, logger);
    logger.info(`Collected ${repos.length} starred repo(s).`);

    // Filter by language.
    if (config.language) {
      const want = config.language.toLowerCase();
      repos = repos.filter((r) => (r.language ?? "").toLowerCase() === want);
      logger.info(`After language filter (${config.language}): ${repos.length} repo(s).`);
    }

    // Sort.
    repos = sortRepos(repos, config.sort);
    logger.debug(`Sorted by ${config.sort}.`);

    if (repos.length === 0) {
      logger.warn("No repos matched the filters. Nothing to write.");
      return;
    }

    // Always write both files to a per-user folder.
    const userDir = `${config.output}/${config.user}`;
    const csvPath = await writeCsv(repos, { outputDir: userDir, filename: "data" });
    const mdPath = await writeMarkdown(repos, {
      outputDir: userDir,
      filename: "starred",
      user: config.user,
      includeCategories: config.categories,
      onlyCategory: config.category,
    });

    logger.info(`Wrote ${csvPath} + ${mdPath}`);
  });

// ─── combine ─────────────────────────────────────────────────────────────────

program
  .command("combine")
  .description("Merge collections/*/data.csv → collections/_combined/{combined.csv, combined.md}.")
  .option("--user <logins>", "Comma-separated user logins to merge (default: all found)")
  .option("--input <dir>", "Collections root directory", DEFAULT_COLLECTIONS_DIR)
  .option("--output <dir>", "Output directory for combined files", `${DEFAULT_COLLECTIONS_DIR}/_combined`)
  .option("--debug", "Print debug information", false)
  .action(async (options) => {
    const config = parseCombineConfig({
      user: options.user,
      input: options.input,
      output: options.output,
      debug: Boolean(options.debug),
    });
    const logger = createLogger(config.debug);

    // Discover all user collections.
    let discovered = await discoverUserCollections(config.input);
    if (discovered.length === 0) {
      throw new Error(
        `No collections found under ${config.input}. Run "starred-collector collect" first.`,
      );
    }

    // Filter to --user list if provided.
    if (config.user) {
      const wanted = new Set(config.user.split(",").map((s) => s.trim()).filter(Boolean));
      discovered = discovered.filter((d) => wanted.has(d.user));
      if (discovered.length === 0) {
        throw new Error(
          `None of the specified users (--user ${config.user}) have collections under ${config.input}.`,
        );
      }
    }

    logger.info(
      `Combining ${discovered.length} collection(s): ${discovered.map((d) => d.user).join(", ")}`,
    );

    // Read all CSVs.
    const csvMap = new Map<string, RepoCsvRow[]>();
    for (const { user, csvPath } of discovered) {
      const rows = await readCollectionCsv(csvPath);
      csvMap.set(user, rows);
      logger.debug(`  ${user}: ${rows.length} repos`);
    }

    // Merge + dedup.
    const { merged, duplicatesRemoved, totalInputRows, starredByCounts } = mergeCollections(csvMap);
    logger.info(
      `Merged ${totalInputRows} repos → ${merged.length} unique (${duplicatesRemoved} duplicates removed).`,
    );

    // Write combined CSV (pure deduped catalog).
    const csvPath = await writeCsvRows(merged, { outputDir: config.output, filename: "combined" });

    // Write combined MD (rich knowledge base).
    const repos = merged.map(csvRowToRepo);
    const mdPath = await writeMarkdown(repos, {
      outputDir: config.output,
      filename: "combined",
      user: "_combined",
      includeCategories: true,
    });

    logger.info(`Wrote ${csvPath} + ${mdPath}`);

    // Show top cross-user popular repos.
    const multiStar = [...starredByCounts.entries()].filter(([, n]) => n > 1);
    if (multiStar.length > 0) {
      multiStar.sort((a, b) => b[1] - a[1]);
      logger.info(`\nRepos starred by multiple users (${multiStar.length}):`);
      for (const [name, count] of multiStar.slice(0, 10)) {
        logger.info(`  ${count}/${discovered.length} users  ${name}`);
      }
    }
  });

// ─── shared helpers ──────────────────────────────────────────────────────────

function sortRepos(repos: Repo[], order: string): Repo[] {
  const list = [...repos];
  switch (order) {
    case "name":
      return list.sort((a, b) => a.full_name.localeCompare(b.full_name));
    case "updated":
      return list.sort((a, b) => b.pushed_at.localeCompare(a.pushed_at));
    case "stars":
    default:
      return list.sort((a, b) => b.stargazers_count - a.stargazers_count);
  }
}

/** Write combined CSV rows directly (no Repo conversion — CSV in, CSV out). */
async function writeCsvRows(
  rows: RepoCsvRow[],
  opts: { outputDir: string; filename: string },
): Promise<string> {
  const escape = (value: string) => (/["\n,]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

  const lines = rows.map((r) =>
    [
      r.full_name,
      r.url,
      r.description,
      r.language,
      String(r.stars),
      String(r.forks),
      String(r.open_issues),
      r.license,
      r.topics.join(";"),
      r.category,
      String(r.is_archived),
      r.pushed_at,
      r.created_at,
      r.homepage,
    ]
      .map(escape)
      .join(","),
  );

  const content = [CSV_HEADER, ...lines, ""].join("\n");
  const filepath = join(opts.outputDir, `${opts.filename}.csv`);
  await mkdir(dirname(filepath), { recursive: true });
  await writeFile(filepath, content, "utf8");
  return filepath;
}

try {
  await program.parseAsync();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
}
