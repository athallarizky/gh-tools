# portfolio-history — Skills

> **For:** any LLM agent that needs to build a CV-ready engineering portfolio
> from local Git history. Read this to know when and how to use this tool.

## Name

**portfolio-history** — scan locally cloned Git repositories and produce a
versioned portfolio bundle containing a CV-ready summary and a selected commit
list.

One subcommand: **`scan`**.

## When to use

Reach for **`scan`** when the user asks to:

- "build a portfolio from my git history"
- "summarize what I developed at <org> over the last 2 years"
- "generate a CV-ready summary from local repos"
- "scan cloned repos and show my commit activity"

## When NOT to use

- **Fetching GitHub activity from the API** → use `daily-work-log`.
- **Listing or cloning org repos** → use `orgs-repo-cloner`.
- **Collecting starred repos** → use `starred-collector`.
- **Non-GitHub work / calendars / docs** → outside scope.

## Prerequisites

- **Node.js >= 20**.
- **git** installed and local repos already cloned into a directory. This tool
  only runs `git log` locally; it makes **no GitHub API calls**.

## Inputs

```
portfolio-history scan --since <yyyy-mm-dd> --until <yyyy-mm-dd> [options]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--since <yyyy-mm-dd>` | string | *(required)* | Start date, inclusive. |
| `--until <yyyy-mm-dd>` | string | *(required)* | End date, inclusive. |
| `--repos-dir <dir>` | string | `./org-repos` | Directory containing cloned git repos. |
| `--author <name>` | string | *(all)* | Filter commits by git author name. |
| `--author-email <email>` | string | *(all)* | Filter commits by git author email. |
| `--output-dir <dir>` | string | `./output` | Root directory for versioned bundles. |
| `--org <name>` | string | *(none)* | Optional label for documentation only. |
| `--debug` | flag | off | Verbose logging to stderr. |

## Output

`scan` writes a versioned bundle into `<output-dir>/portfolio-<timestamp>/`:

- `cv.md` — CV-ready narrative grouped by repository.
- `selected-commits.md` — raw commit list per repository with line stats.

Previous bundles are preserved so you can regenerate without overwriting older runs.

## Examples

```bash
# Scan cloned org repos for the last two years
portfolio-history scan --since 2024-01-01 --until 2026-12-31 --repos-dir ./org-repos --author-email you@example.com

# Quick run against a single repo directory
portfolio-history scan --since 2025-01-01 --until 2025-12-31 --repos-dir ./one-repo-dir
```

## Agent Workflow

```
1. SCAN  -> portfolio-history scan --since <start> --until <end> --repos-dir <dir>
2. READ  -> <output-dir>/portfolio-<timestamp>/cv.md and selected-commits.md
3. REASON-> turn repo-level commit data into polished CV bullet points.
```

## Exit Codes & Errors

| Code | Meaning |
|------|---------|
| `0` | Success. |
| `1` | Fatal error. |

Per-repo `git log` failures are skipped and reported as warnings; the bundle is
still written with whatever repos succeeded.

## Source Map

| File | Role |
|------|------|
| `src/cli.ts` | Entry point: `scan` subcommand. |
| `src/config.ts` | Zod schema for `scan` options. |
| `src/git.ts` | `listCommits()` via `git log` + `parseLogOutput()`. |
| `src/repo-discovery.ts` | `discoverLocalRepos()` — find local git directories. |
| `src/summary.ts` | `summarizeRepo()` — aggregate commits and file stats. |
| `src/report.ts` | `computeStats()`, `buildCvMarkdown()`, `buildSelectedCommitsMarkdown()`. |
| `src/logger.ts` | `createLogger(debug)` factory. |
