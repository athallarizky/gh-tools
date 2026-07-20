#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import { Command } from "commander";
import { execa } from "execa";
import { listOrgRepos } from "./github.js";

const program = new Command();

program
  .name("orgs-repo-cloner")
  .description("List and clone all repos from a GitHub organization")
  .version("0.1.0");

program
  .command("list")
  .description("List all clone URLs for an organization")
  .requiredOption("--org <org>", "GitHub organization name")
  .option("--protocol <protocol>", "ssh or https", "ssh")
  .option("--limit <n>", "Limit repos (useful for testing)", parseInt)
  .action(async (opts) => {
    console.error(`Fetching repos for org: ${opts.org}...`);
    const repos = await listOrgRepos(opts.org, opts.limit);

    const key = opts.protocol === "https" ? "clone_url" : "ssh_url";

    for (const repo of repos) {
      console.log(`${repo.full_name}\t${repo.archived ? "[archived]" : ""}\t${repo[key]}`);
    }

    console.error(`Done. Listed ${repos.length} repos (${repos.filter(r => r.archived).length} archived).`);
  });

program
  .command("clone")
  .description("Clone all repos from an organization")
  .requiredOption("--org <org>", "GitHub organization name")
  .option("--protocol <protocol>", "ssh or https", "ssh")
  .option("--dest <dir>", "Destination directory", "./org-repos")
  .option("--limit <n>", "Limit repos (useful for testing)", parseInt)
  .option("--skip-archived", "Skip archived repos", true)
  .action(async (opts) => {
    console.error(`Fetching repos for org: ${opts.org}...`);
    let repos = await listOrgRepos(opts.org, opts.limit);

    if (opts.skipArchived !== false) {
      repos = repos.filter((r) => !r.archived);
    }
    if (opts.limit && opts.limit > 0) {
      repos = repos.slice(0, opts.limit);
    }

    console.error(`Found ${repos.length} repos. Cloning into ${opts.dest}...`);

    await mkdir(opts.dest, { recursive: true });
    const key = opts.protocol === "https" ? "clone_url" : "ssh_url";

    let failed = 0;
    for (let i = 0; i < repos.length; i++) {
      const repo = repos[i];
      console.error(`[${i + 1}/${repos.length}] Cloning ${repo.full_name}...`);
      try {
        await execa("git", ["clone", repo[key]], {
          cwd: opts.dest,
          stdio: "inherit",
        });
      } catch (err) {
        failed++;
        console.error(`  Failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    console.error(`Done. Cloned ${repos.length - failed}/${repos.length} repos.`);
    if (failed > 0) {
      console.error(`${failed} repos failed. Re-run to retry — already-cloned repos will be skipped by git.`);
    }
  });

program.parse();
