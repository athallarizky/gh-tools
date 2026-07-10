# starred-collector

> Collect GitHub users' starred repos into knowledge-base files (markdown + CSV) and merge multiple users' collections into a deduplicated catalog. Fully flag-based — agent-driven, zero prompts.

Part of the [`gh-tools`](../..) monorepo. For the LLM-readable manifest, see [`SKILLS.md`](SKILLS.md).

## Requirements

- **Node.js >= 20**
- **GitHub auth** — either:
  - [GitHub CLI](https://cli.github.com) authenticated (`gh auth login`), or
  - `GITHUB_TOKEN` environment variable (PAT with `public_repo` + `read:user` scope).

## Install

From the repo root:

```bash
npm install
npm run build
```

## Folder layout

```
collections/
├── fiqryq/
│   ├── starred.md      ← human-readable knowledge base
│   └── data.csv        ← machine-readable (for combine / RAG)
├── torvalds/
│   ├── starred.md
│   └── data.csv
└── _combined/          ← output of combine
    ├── combined.csv    ← deduplicated tool catalog
    └── combined.md     ← human-readable merged view
```

## Usage — `collect`

Fetches one user's starred repos, writes **both** `starred.md` + `data.csv`.

```bash
# Collect your own stars -> collections/<self>/
npx starred-collector collect

# Collect another user -> collections/fiqryq/
npx starred-collector collect --user fiqryq

# Only TypeScript repos, sorted by last updated
npx starred-collector collect --user fiqryq --language TypeScript --sort updated

# Flat list (no categories)
npx starred-collector collect --user fiqryq --no-categories
```

### `collect` options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--user <login>` | string | authenticated user | Whose stars to collect. Any public user. |
| `--output <dir>` | string | `./collections` | Collections root dir. |
| `--language <lang>` | string | *(all)* | Filter by primary language. |
| `--category <cat>` | string | *(all)* | Markdown only: emit just this category. |
| `--no-categories` | flag | off | Emit a flat list. |
| `--sort <order>` | `stars` \| `name` \| `updated` | `stars` | Sort order. |
| `--debug` | flag | off | Verbose logging to stderr. |

## Usage — `combine`

Merges per-user `data.csv` files into one deduplicated catalog. Same repo
starred by multiple users collapses to one row (highest-star version wins).

```bash
# Combine ALL collections -> collections/_combined/
npx starred-collector combine

# Combine specific users only
npx starred-collector combine --user fiqryq,torvalds

# Output to a custom dir (e.g. for RAG)
npx starred-collector combine --output ./rag-data
```

### `combine` options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--user <logins>` | string | *(all)* | Comma-separated users to merge. |
| `--input <dir>` | string | `./collections` | Collections root to scan. |
| `--output <dir>` | string | `./collections/_combined` | Output dir. |
| `--debug` | flag | off | Verbose logging. |

## Output files

- **`starred.md`** (per-user) — Rich Obsidian detail blocks: description, topics, license, stars/forks/issues, maintenance recency, homepage. Badges for ARCHIVED/TEMPLATE.
- **`data.csv`** (per-user) — Flat CSV: `full_name,url,description,language,stars,forks,open_issues,license,topics,category,is_archived,pushed_at,created_at,homepage`. RFC 4180 escaped.
- **`combined.csv`** (merged) — Same columns, deduplicated by `full_name`. RAG-ready.
- **`combined.md`** (merged) — Same rich detail blocks over the merged set.

## Categorization

Repos are sorted into 22 categories via a baked-in regex ruleset in
[`src/categorize.ts`](src/categorize.ts). Rules match on name + description +
topics. Specific categories checked before the broad AI catch-all. To tweak,
edit that file's `CATEGORIES` array.

## Development

```bash
npm run build       # tsc
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run test:watch  # vitest
npm run dev --workspace starred-collector -- collect --debug   # via tsx (no build)
```

Tests cover: per-category routing, pagination, schema validation, all output
writers, CSV round-trip parsing, and the combine merge/dedup engine.

## License

Private — personal tooling.
