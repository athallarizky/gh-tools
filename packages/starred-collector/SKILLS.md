# starred-collector — Skills

> **For:** any LLM agent that needs to collect, categorize, or combine GitHub
> users' starred repositories. Read this to know when and how to use this tool.

## Name

**starred-collector** — collect a user's GitHub starred repos into a
knowledge-base markdown + machine-readable CSV, categorize them with a built-in
22-category ruleset, and merge multiple users' collections into one deduplicated
catalog (for RAG ingestion).

Two subcommands: **`collect`** (fetch one user) and **`combine`** (merge many).

## When to use

Reach for **`collect`** when the user asks to:

- "collect my GitHub stars" / "export my starred repos"
- "collect [another user]'s starred repos" / "what has testuser starred?"
- "back up starred repos"
- "collect testuser's starred repos and check if any help build [X]"

Reach for **`combine`** when the user asks to:

- "combine all collections" / "merge everyone's starred repos"
- "combine alice and bob's collections into one"
- "build a deduplicated tool catalog from all collections"
- "prepare the data for RAG"

## When NOT to use

- Listing a user's **own repositories** (not starred) → use `gh repo list` directly.
- **Starring or unstarring** a repo → this tool is read-only.
- Fetching **repo content** (issues, PRs, commits) → outside scope.
- **Searching all of GitHub** → this only reads starred sets.

## Prerequisites

- **GitHub CLI** authenticated (`gh auth login`), or `GITHUB_TOKEN` env var set.
- **Node.js >= 20**.

## Folder layout

```
collections/
├── <user>/
│   ├── starred.md      ← human-readable knowledge base (rich detail blocks)
│   └── data.csv        ← machine-readable (for combine / RAG)
├── <user2>/
│   ├── starred.md
│   └── data.csv
└── _combined/          ← output of combine
    ├── combined.csv    ← deduplicated tool catalog
    └── combined.md     ← human-readable merged view
```

---

## Subcommand: `collect`

Fetches one user's starred repos and writes **both** `starred.md` (human) and
`data.csv` (machine) into `collections/<user>/`.

### Inputs

```
starred-collector collect [options]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--user <login>` | string | authenticated user | Whose stars to collect. Any public user, or omit for the viewer. |
| `--output <dir>` | string | `./collections` | Collections root directory. Each user gets a subfolder. |
| `--language <lang>` | string | *(all)* | Filter to a primary language (case-insensitive). |
| `--category <cat>` | string | *(all)* | Markdown only: emit just this category. |
| `--no-categories` | flag | off | Emit a flat list (skip categorization). |
| `--sort <order>` | `stars` \| `name` \| `updated` | `stars` | Sort order. |
| `--debug` | flag | off | Verbose logging to stderr. |

### Examples

```bash
# Collect your own stars -> collections/<self>/starred.md + data.csv
starred-collector collect

# Collect another user -> collections/fiqryq/starred.md + data.csv
starred-collector collect --user fiqryq

# Only TypeScript repos, sorted by last updated
starred-collector collect --user fiqryq --language TypeScript --sort updated

# Collect multiple users (call N times)
starred-collector collect --user alice
starred-collector collect --user bob
```

---

## Subcommand: `combine`

Merges per-user `data.csv` files into one deduplicated catalog in
`collections/_combined/`. Deduplicates by `full_name` (same repo starred by
multiple users collapses to one row; highest-star version wins).

### Inputs

```
starred-collector combine [options]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--user <logins>` | string | *(all found)* | Comma-separated user logins to merge. Omit for all. |
| `--input <dir>` | string | `./collections` | Collections root to scan for `data.csv` files. |
| `--output <dir>` | string | `./collections/_combined` | Output dir for combined files. |
| `--debug` | flag | off | Verbose logging to stderr. |

### Examples

```bash
# Combine ALL collections -> collections/_combined/combined.csv + combined.md
starred-collector combine

# Combine specific users only
starred-collector combine --user alice,bob

# Output to a custom dir (e.g. for RAG ingestion)
starred-collector combine --output ./rag-data
```

---

## Agent Workflow (the primary use case)

This tool is **agent-driven**: fully flag-based, zero prompts. The standard
loops:

### Collect + analyze (single user)
```
1. COLLECT  -> starred-collector collect --user testuser
2. READ     -> collections/testuser/data.csv (or starred.md for rich detail)
3. REASON   -> "Based on testuser's starred repos, repo Y and Z help build [X]..."
```

### Collect many + combine + RAG (multi-user)
```
1. COLLECT each user  -> starred-collector collect --user alice
                         starred-collector collect --user bob
2. COMBINE            -> starred-collector combine
3. READ               -> collections/_combined/combined.csv (deduped catalog)
4. REASON / INGEST    -> feed to RAG pipeline or analyze for recommendations
```

## Outputs

### `starred.md` (per-user, human-readable)
Rich knowledge-base detail blocks: description, topics, license, popularity
signals (stars, forks, issues), maintenance recency, homepage. Each repo is a
`### heading` with badges (ARCHIVED, TEMPLATE, etc.).

### `data.csv` (per-user, machine-readable)
Flat CSV: `full_name,url,description,language,stars,forks,open_issues,license,topics,category,is_archived,pushed_at,created_at,homepage`. RFC 4180 escaped. Topics are semicolon-joined.

### `combined.csv` (combined, RAG-ready)
Same columns as `data.csv`, deduplicated by `full_name` across all merged users. Pure tool catalog — one row per unique repo.

### `combined.md` (combined, human-readable)
Same rich detail blocks as `starred.md`, covering the merged deduped set.

## Category Rules

Categorization uses a **baked-in 22-category regex ruleset** in
[`src/categorize.ts`](src/categorize.ts). Rules match against each repo's
name + description + topics (lowercased). Specific categories first; the broad
**AI / Agents / LLM** catch-all is last. Unmatched repos land in **Other**.

To tweak the rules: edit `src/categorize.ts` -> `CATEGORIES` array.

## Exit Codes & Errors

| Code | Meaning |
|------|---------|
| `0` | Success (or no repos matched filters — warning printed). |
| `1` | Failure. Error printed to stderr as `Error: <message>`. |

Common fixes:
- **Auth errors** -> `gh auth status` / `gh auth login`, or set `GITHUB_TOKEN`.
- **Rate limit** -> wait for reset time, or switch to `gh` CLI.
- **No collections found (combine)** -> run `collect` first.
- **User not found** -> check `--user` spelling.

## Source Map

| File | Role |
|------|------|
| `src/cli.ts` | Entry point: `collect` + `combine` subcommands, pipeline orchestration. |
| `src/config.ts` | Zod schemas for both subcommands' options. |
| `src/types.ts` | Zod schema for the GitHub repo shape -> `Repo` type. |
| `src/fetch.ts` | Paginated fetcher (`fetchAllStarred`). |
| `src/github/client.ts` | Dual-mode auth client (token `fetch` vs `gh` CLI). |
| `src/github/queries.ts` | Pure REST path builders. |
| `src/categorize.ts` | 22-category ruleset + `categorize()` + `groupByCategory()`. |
| `src/combine.ts` | Merge engine: discover, read CSV, dedup by full_name, sort. |
| `src/output/markdown.ts` | Obsidian markdown writer (rich detail blocks). |
| `src/output/csv.ts` | CSV writer + parser (`writeCsv`, `parseCsv`, `RepoCsvRow`). |
| `src/logger.ts` | `createLogger(debug)` factory. |
