# daily-work-log — Skills

> **For:** any LLM agent that needs to summarize a user's GitHub work on a given
> day. Read this to know when and how to use this tool.

## Name

**daily-work-log** — collect one day's GitHub activity (commits, issues, pull
requests) across a user's repositories and write an **agent-ready context
bundle** (`agent-input.md` + JSON) that an agent then reads and summarizes into a
daily work log.

One subcommand: **`collect`**.

## When to use

Reach for **`collect`** when the user asks to:

- "summarize my work today" / "what did I do yesterday?" / "summarize my work on 2026-05-20"
- "write a daily standup / work log from my GitHub activity"
- "collect my commits, issues, and PRs for <date>"

## When NOT to use

- Summarizing **non-GitHub** work (calendar, docs, Slack) → outside scope.
- **Long-range** activity (weeks/months) → this tool is per-day; call once per date.
- Listing a user's **starred repos** → use `starred-collector`.
- **Writing code or opening PRs** → this tool is read-only.

## Prerequisites

- **GitHub CLI** authenticated (`gh auth login`). **This tool shells out to `gh`
  only** — unlike the monorepo's general dual-mode convention, it does **not**
  read `GITHUB_TOKEN` directly. Ensure `gh auth status` is OK before running.
- **Node.js >= 20**.

## Folder layout

```
<output>/
└── runs/
    └── <YYYY-MM-DD>/
        ├── agent-input.md          ← activity as Markdown (REASON over this)
        ├── normalized.worklog.json ← structured normalized day
        ├── raw.github.json         ← raw API responses (debug)
        ├── manifest.json           ← bundle metadata
        └── summary.md              ← YOUR generated summary (you write this)
```

---

## Subcommand: `collect`

Collects commits, issues, and PRs for the given local date (converted to a UTC
window via `--timezone`) and writes the bundle to `<output>/runs/<date>/`.

### Inputs

```
daily-work-log collect --date <yyyy-mm-dd> [options]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--date <yyyy-mm-dd>` | string | *(required)* | Local date to collect. |
| `--timezone <iana>` | string | `Asia/Jakarta` | IANA timezone; defines the day's UTC window. |
| `--user <login>` | string | authenticated viewer | GitHub login to collect. |
| `--author-email <email>` | string | *(all)* | Filter commits to one git author email. |
| `--output <dir>` | string | `.` | Output directory. Writes `<dir>/runs/<date>/`. |
| `--orgs <names>` | string | *(all)* | Comma-separated org names to scan. |
| `--orgs-only` | flag | off | Exclude personal repos; org repos only. |
| `--debug` | flag | off | Verbose logging to stderr. |

### Examples

```bash
# Collect today's activity for an org -> <output>/runs/<date>/agent-input.md
daily-work-log collect --date 2026-05-26 --timezone Asia/Jakarta --orgs kitabisa --output ./tmp-journal

# Filter commits to one git identity
daily-work-log collect --date 2026-05-26 --author-email you@example.com --output ./tmp-journal

# Collect several days (call once per date)
daily-work-log collect --date 2026-05-25 --output ./tmp-journal
daily-work-log collect --date 2026-05-26 --output ./tmp-journal
```

---

## Agent Workflow (the primary use case)

This tool is **agent-driven**: fully flag-based, zero prompts. The standard loop:

```
1. COLLECT  -> daily-work-log collect --date <date> --orgs <org> --output ./tmp-journal
2. READ     -> ./tmp-journal/runs/<date>/agent-input.md
3. REASON   -> write a concise daily summary: issues, PRs, commits grouped by repo;
               highlight outcomes and follow-ups.
4. WRITE    -> ./tmp-journal/runs/<date>/summary.md
```

**Reasoning guidance:** group by repository; cover issues created/updated, PRs
created/updated/reviewed (with merge status), and commits (key file changes).
Keep it professional and concise; highlight outcomes over activity.

## Outputs

### `agent-input.md` (human/agent-readable)
All activity for the day as Markdown: issues, pull requests, and commits with
their file changes. This is the file to read and reason over.

### `normalized.worklog.json` (machine-readable)
Structured JSON of the normalized day: date, timezone, UTC window, user, issues,
pull requests, and repositories with commits. Stable shape for programmatic use.

### `raw.github.json` (debug)
Raw GitHub API responses (discovered repos, search results, date window, orgs).

### `manifest.json` (metadata)
Bundle metadata: schema version (`2.0`), bundle dir, date, timezone, user,
creation timestamp, and the fixed output filenames.

### `summary.md` (agent-written)
The daily summary — **you write this** after reasoning over `agent-input.md`.

## Exit Codes & Errors

| Code | Meaning |
|------|---------|
| `0` | Success. |
| `1` | Failure. Error printed to stderr as `Error: <message>`. |

Common fixes:
- **Auth errors** -> `gh auth status` / `gh auth login` (no `GITHUB_TOKEN` fallback in this tool).
- **Rate limit** -> wait for reset, then retry.
- **No activity** -> check `--date`, `--timezone`, `--user`, and `--orgs`.

## Source Map

| File | Role |
|------|------|
| `src/cli.ts` | Entry point: `collect` subcommand + pipeline orchestration. |
| `src/config.ts` | Zod schema for `collect` options -> `CliConfig`. |
| `src/date-window.ts` | Local date + timezone -> UTC window. |
| `src/model.ts` | Zod-derived domain types (`NormalizedDay`, issues, PRs, repos, commits). |
| `src/normalize.ts` | `normalizeCommit()` — commit detail + associated PRs -> `NormalizedCommit`. |
| `src/github/client.ts` | **gh-CLI-only** client (`rest(path)` via `execa("gh", ...)`). |
| `src/github/queries.ts` | Pure REST path builders (commits, associated pulls, repo/user/org listings). |
| `src/github/discovery.ts` | `getViewerLogin()` + `discoverRepositories()` (user & org repos). |
| `src/github/enrichment.ts` | Fetch + enrich commits (repo & PR) for the day. |
| `src/github/search.ts` | `searchIssuesAndPrs()` via the GitHub Search API + category types. |
| `src/search/deduplicate.ts` | Dedup search results + pick best category. |
| `src/search/normalize.ts` | `normalizeSearchItem()` — map a search item to an issue/PR. |
| `src/context/agent-input.ts` | `buildAgentInputMarkdown()` — renders `agent-input.md`. |
| `src/context/manifest.ts` | `buildManifest()` — renders `manifest.json`. |
| `src/output.ts` | `writeContextBundle()` — mkdir + write the 4 bundle files. |
| `src/logger.ts` | `createLogger(debug)` factory. |
