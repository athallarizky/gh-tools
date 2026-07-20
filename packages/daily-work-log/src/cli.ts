#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { parseCliConfig } from "./config.js";
import { buildAgentInputMarkdown } from "./context/agent-input.js";
import { getUtcDateWindow } from "./date-window.js";
import { createGitHubClient } from "./github/client.js";
import { discoverRepositories, getViewerLogin } from "./github/discovery.js";
import { enrichCommit, listPullRequestCommitsForDay, listRepoCommitsForDay } from "./github/enrichment.js";
import { searchIssuesAndPrs } from "./github/search.js";
import { createLogger } from "./logger.js";
import type { NormalizedDay } from "./model.js";
import { writeContextBundle } from "./output.js";
import { deduplicateSearchResults, pickBestCategory } from "./search/deduplicate.js";
import { normalizeSearchItem } from "./search/normalize.js";

const program = new Command();

program
  .name("daily-work-log")
  .description("Build agent-ready daily GitHub work context bundles.");

program
  .command("collect")
  .description("Collect GitHub work data and write an agent context bundle.")
  .requiredOption("--date <yyyy-mm-dd>", "Local date to collect")
  .option("--timezone <iana>", "IANA timezone", "Asia/Jakarta")
  .option("--user <login>", "GitHub login to collect; defaults to authenticated viewer")
  .option("--author-email <email>", "Specific git author email to filter commits by")
  .option("--output <dir>", "Output directory", ".")
  .option("--orgs-only", "Exclude personal repos; only include organization repos", false)
  .option("--orgs <names>", "Only include repos from these orgs (comma-separated)")
  .option("--debug", "Print debug information", false)
  .action(async (options) => {
    const config = parseCliConfig({
      date: options.date,
      timezone: options.timezone,
      user: options.user,
      authorEmail: options.authorEmail,
      output: options.output,
      orgs: options.orgs ? options.orgs.split(",").map((s: string) => s.trim()) : undefined,
      orgsOnly: Boolean(options.orgsOnly),
      debug: Boolean(options.debug)
    });

    const logger = createLogger(config.debug);
    const window = getUtcDateWindow(config.date, config.timezone);
    const github = createGitHubClient();
    const login = config.user ?? (await getViewerLogin(github));

    logger.info(`Collecting GitHub activity for ${login} on ${config.date} (${config.timezone})`);
    logger.debug(`UTC window: ${window.fromIso} to ${window.toIso}`);

    const [commitData, searchData] = await Promise.all([
      collectCommits(github, login, window, config, logger),
      collectIssuesAndPrs(github, login, config.date, logger)
    ]);

    const pullRequestCommitData = await collectPullRequestCommits(github, login, window, config, searchData.pullRequests, logger);
    const repositories = mergeRepositories(commitData.repositories, pullRequestCommitData.repositories);

    const raw: Record<string, unknown> = {
      discoveredRepos: commitData.discoveredRepos,
      searchResults: searchData.raw,
      dateWindow: window,
      orgs: config.orgs
    };

    const day: NormalizedDay = {
      date: window.localDate,
      timezone: window.timezone,
      fromIso: window.fromIso,
      toIso: window.toIso,
      user: login,
      issues: searchData.issues,
      pullRequests: searchData.pullRequests,
      repositories
    };

    const agentInput = buildAgentInputMarkdown(day);
    const paths = await writeContextBundle({
      outputDir: config.output,
      day,
      raw,
      agentInput
    });

    logger.info(`Wrote ${paths.agentInputPath}`);
    logger.info(`Wrote ${paths.manifestPath}`);
    logger.info(`Wrote ${paths.rawJsonPath}`);
    logger.info(`Wrote ${paths.normalizedJsonPath}`);
  });

async function collectCommits(
  github: ReturnType<typeof createGitHubClient>,
  login: string,
  window: { fromIso: string; toIso: string },
  config: { orgs?: string[]; orgsOnly: boolean; authorEmail?: string },
  logger: ReturnType<typeof createLogger>
) {
  logger.info("Discovering repositories via REST API");
  let discoveredRepos = await discoverRepositories(github, { orgs: config.orgs, pushedAfter: window.fromIso });

  logger.debug(`Discovered ${discoveredRepos.length} repo(s)`);

  if (config.orgsOnly) {
    discoveredRepos = discoveredRepos.filter((r) => r.repo.split("/")[0] !== login);
    logger.debug(`After --orgs-only filter: ${discoveredRepos.length} repo(s)`);
  }

  const repositories: NormalizedDay["repositories"] = [];

  for (const repo of discoveredRepos) {
    logger.info(`Collecting commits from ${repo.repo}`);
    const shas = await listRepoCommitsForDay(github, {
      repo: repo.repo,
      login,
      fromIso: window.fromIso,
      toIso: window.toIso,
      authorEmail: config.authorEmail
    });

    if (shas.length === 0) continue;

    const commits = await Promise.all(shas.map((sha) => enrichCommit(github, { repo: repo.repo, sha })));
    repositories.push({
      repo: repo.repo,
      isPrivate: repo.isPrivate,
      defaultBranch: repo.defaultBranch,
      commits
    });
    logger.debug(`Enriched ${commits.length} commit(s) in ${repo.repo}`);
  }

  return { discoveredRepos, repositories };
}

async function collectPullRequestCommits(
  github: ReturnType<typeof createGitHubClient>,
  login: string,
  window: { fromIso: string; toIso: string },
  config: { authorEmail?: string },
  pullRequests: NormalizedDay["pullRequests"],
  logger: ReturnType<typeof createLogger>
) {
  const repositories: NormalizedDay["repositories"] = [];

  for (const pr of pullRequests) {
    logger.info(`Collecting PR commits from ${pr.repo}#${pr.number}`);
    const shas = await listPullRequestCommitsForDay(github, {
      repo: pr.repo,
      number: pr.number,
      login,
      fromIso: window.fromIso,
      toIso: window.toIso,
      authorEmail: config.authorEmail
    });

    if (shas.length === 0) continue;

    const commits = await Promise.all(shas.map((sha) => enrichCommit(github, { repo: pr.repo, sha })));
    repositories.push({
      repo: pr.repo,
      commits
    });
    logger.debug(`Enriched ${commits.length} PR commit(s) in ${pr.repo}#${pr.number}`);
  }

  return { repositories };
}

function mergeRepositories(
  primary: NormalizedDay["repositories"],
  secondary: NormalizedDay["repositories"]
): NormalizedDay["repositories"] {
  const byRepo = new Map<string, NormalizedDay["repositories"][number]>();

  for (const repo of [...primary, ...secondary]) {
    const existing = byRepo.get(repo.repo);
    if (!existing) {
      byRepo.set(repo.repo, { ...repo, commits: [...repo.commits] });
      continue;
    }

    const seenShas = new Set(existing.commits.map((commit) => commit.sha));
    for (const commit of repo.commits) {
      if (!seenShas.has(commit.sha)) {
        seenShas.add(commit.sha);
        existing.commits.push(commit);
      }
    }
    existing.isPrivate = existing.isPrivate ?? repo.isPrivate;
    existing.defaultBranch = existing.defaultBranch ?? repo.defaultBranch;
  }

  return Array.from(byRepo.values());
}

async function collectIssuesAndPrs(
  github: ReturnType<typeof createGitHubClient>,
  login: string,
  date: string,
  logger: ReturnType<typeof createLogger>
) {
  logger.info("Searching issues and pull requests via GitHub Search API");
  const categorizedItems = await searchIssuesAndPrs(github, { login, date });
  const deduped = deduplicateSearchResults(categorizedItems);

  logger.debug(`Search returned ${categorizedItems.length} results, ${deduped.length} after deduplication`);

  const issues: NormalizedDay["issues"] = [];
  const pullRequests: NormalizedDay["pullRequests"] = [];

  for (const entry of deduped) {
    const category = pickBestCategory(entry.categories, entry.isPr);
    const normalized = normalizeSearchItem(entry.item, category, entry.isPr);
    if (entry.isPr) {
      pullRequests.push(normalized as NormalizedDay["pullRequests"][number]);
    } else {
      issues.push(normalized as NormalizedDay["issues"][number]);
    }
  }

  logger.debug(`Normalized: ${issues.length} issues, ${pullRequests.length} pull requests`);

  return {
    issues,
    pullRequests,
    raw: { totalResults: categorizedItems.length, afterDedup: deduped.length }
  };
}

try {
  await program.parseAsync();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
}
