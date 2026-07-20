# daily-work-log

> Collect a day's GitHub activity — commits, issues, and pull requests — into an agent-ready context bundle, then summarize it. Fully flag-based — agent-driven, zero prompts.

Part of the [`gh-tools`](../..) monorepo. For the LLM-readable manifest, see [`SKILLS.md`](SKILLS.md).

## Requirements

- **Node.js >= 20**
- **GitHub CLI** installed and authenticated (`gh auth login`). This tool shells
  out to `gh` only — it does not read `GITHUB_TOKEN` directly.

## Install

From the repo root:

```bash
npm install
npm run build
```

## Usage

```bash
# Collect one day's activity -> ./tmp-journal/runs/<date>/
npx daily-work-log collect --date 2026-05-25 --timezone Asia/Jakarta --output ./tmp-journal
```

Then read `./tmp-journal/runs/<date>/agent-input.md` and write your summary to
`./tmp-journal/runs/<date>/summary.md`.

### `collect` options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--date <yyyy-mm-dd>` | string | *(required)* | Local date to collect. |
| `--timezone <iana>` | string | `Asia/Jakarta` | IANA timezone for date → UTC window conversion. |
| `--user <login>` | string | authenticated viewer | GitHub login to collect. |
| `--author-email <email>` | string | *(all)* | Filter commits by a specific git author email. |
| `--output <dir>` | string | `.` | Output directory (writes `<dir>/runs/<date>/`). |
| `--orgs <names>` | string | *(all)* | Only include repos from these orgs (comma-separated). |
| `--orgs-only` | flag | off | Exclude personal repos; org repos only. |
| `--debug` | flag | off | Verbose logging to stderr. |

### Examples

```bash
# Today's activity for an org
npx daily-work-log collect --date 2026-05-26 --timezone Asia/Jakarta --orgs my-org --output ./tmp-journal

# Filter commits to one git identity
npx daily-work-log collect --date 2026-05-26 --author-email you@example.com --output ./tmp-journal

# Run via tsx without building (from repo root)
npm run dev --workspace daily-work-log -- collect --date 2026-05-26 --orgs my-org --output ./tmp-journal
```

## Output files

Each run writes to `<output>/runs/<date>/`:

| File | Description |
|------|-------------|
| `agent-input.md` | All activity (issues, PRs, commits with file changes) as Markdown — the file to reason over. |
| `normalized.worklog.json` | Structured JSON of the normalized day. |
| `raw.github.json` | Raw GitHub API responses, for debugging. |
| `manifest.json` | Bundle metadata (schema version, files, timestamps). |
| `summary.md` | Your generated summary (you write this). |

## Development

```bash
npm run build --workspace daily-work-log       # tsc
npm run typecheck --workspace daily-work-log   # tsc --noEmit
npm test --workspace daily-work-log            # vitest run
npm run dev --workspace daily-work-log -- collect --debug   # via tsx (no build)
```

## License

Private — personal tooling.
