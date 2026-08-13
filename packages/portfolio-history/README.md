# portfolio-history

> Scan locally cloned Git repositories and build a CV-ready portfolio summary from git history. Fully flag-based — agent-driven, zero prompts.

Part of the [`gh-tools`](../..) monorepo. For the LLM-readable manifest, see [`SKILLS.md`](SKILLS.md).

## Requirements

- **Node.js >= 20**
- **git** installed
- Local repositories already cloned into a directory (see [`orgs-repo-cloner`](../orgs-repo-cloner/))

This tool runs `git log` only. It makes **no GitHub API calls**, so it is cheap
for long date ranges and does not consume GitHub rate limits.

## Usage

```bash
# Scan cloned repos for a two-year window
npx portfolio-history scan --since 2024-01-01 --until 2026-12-31 --repos-dir ./org-repos
```

### `scan` options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--since <yyyy-mm-dd>` | string | *(required)* | Start date, inclusive. |
| `--until <yyyy-mm-dd>` | string | *(required)* | End date, inclusive. |
| `--repos-dir <dir>` | string | `./org-repos` | Directory containing cloned repos. |
| `--author <name>` | string | *(all)* | Filter commits by git author name. |
| `--author-email <email>` | string | *(all)* | Filter commits by git author email. |
| `--output-dir <dir>` | string | `./output` | Root directory for versioned bundles. |
| `--org <name>` | string | *(none)* | Optional org label for documentation only. |
| `--debug` | flag | off | Verbose logging to stderr. |

### Output

`scan` writes a versioned bundle into `<output-dir>/portfolio-<timestamp>/`:

- `cv.md` — CV-ready narrative grouped by repository.
- `selected-commits.md` — raw commit list per repository with line stats.

Previous bundles are preserved so you can regenerate without overwriting older runs.

## Example workflow

```bash
# 1. Materialize the org's repos locally
npx orgs-repo-cloner clone --org your-org --dest ./org-repos

# 2. Generate a CV-ready portfolio bundle
npx portfolio-history scan --since 2024-01-01 --until 2026-12-31 --repos-dir ./org-repos --author-email you@example.com
```

## Development

```bash
npm run build --workspace portfolio-history       # tsc
npm run typecheck --workspace portfolio-history   # tsc --noEmit
npm test --workspace portfolio-history            # vitest run
npm run dev --workspace portfolio-history -- scan --since 2024-01-01 --until 2024-12-31
```

## License

Private — personal tooling.
