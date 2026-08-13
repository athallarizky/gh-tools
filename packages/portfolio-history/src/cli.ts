#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Command } from "commander";
import { parseConfig } from "./config.js";
import { listCommits } from "./git.js";
import { createLogger } from "./logger.js";
import { discoverLocalRepos } from "./repo-discovery.js";
import { buildCvMarkdown, buildSelectedCommitsMarkdown } from "./report.js";
import { buildStoryCvMarkdown } from "./story.js";
import { summarizeRepo } from "./summary.js";
import type { RepoSummary } from "./summary.js";

const program = new Command();

program
  .name("portfolio-history")
  .description("Build a CV-ready portfolio summary from local Git repository history.")
  .version("0.1.0");

program
  .command("scan")
  .description("Scan local git repositories and write a versioned portfolio bundle.")
  .requiredOption("--since <yyyy-mm-dd>", "Start date (inclusive)")
  .requiredOption("--until <yyyy-mm-dd>", "End date (inclusive)")
  .option("--repos-dir <dir>", "Directory containing cloned repos", "./org-repos")
  .option("--author <name>", "Filter commits by git author name")
  .option("--author-email <email>", "Filter commits by git author email")
  .option("--output-dir <dir>", "Output root directory", "./output")
  .option("--org <name>", "Optional org label for documentation only")
  .option("--debug", "Verbose logging", false)
  .action(async (opts) => {
    const config = parseConfig({
      reposDir: opts.reposDir,
      outputDir: opts.outputDir,
      author: opts.author,
      authorEmail: opts.authorEmail,
      since: opts.since,
      until: opts.until,
      org: opts.org,
      debug: Boolean(opts.debug)
    });

    const logger = createLogger(config.debug);
    logger.info(`Discovering local repos in ${config.reposDir}`);
    const repos = await discoverLocalRepos(config.reposDir);
    logger.info(`Found ${repos.length} local repo(s)`);

    const summaries: RepoSummary[] = [];
    for (const repo of repos) {
      logger.info(`Scanning ${repo.name}`);
      try {
        const commits = await listCommits(repo.path, {
          since: config.since,
          until: config.until,
          author: config.author,
          authorEmail: config.authorEmail
        });
        summaries.push(summarizeRepo(repo, commits));
        logger.debug(`${repo.name}: ${commits.length} commit(s)`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(`Skipping ${repo.name}: ${message}`);
      }
    }

    const runId = buildRunId();
    const bundleDir = join(config.outputDir, `portfolio-${runId}`);

    await mkdir(bundleDir, { recursive: true });
    await writeFile(join(bundleDir, "cv.md"), buildCvMarkdown(config, summaries), "utf8");
    await writeFile(join(bundleDir, "selected-commits.md"), buildSelectedCommitsMarkdown(config, summaries), "utf8");
    await writeFile(join(bundleDir, "cv-story.md"), buildStoryCvMarkdown(config, summaries), "utf8");

    logger.info(`Wrote ${join(bundleDir, "cv.md")}`);
    logger.info(`Wrote ${join(bundleDir, "selected-commits.md")}`);
    logger.info(`Wrote ${join(bundleDir, "cv-story.md")}`);
  });

function buildRunId(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}-${hh}${min}${ss}`;
}

try {
  await program.parseAsync();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
}
