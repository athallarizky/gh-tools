# orgs-repo-cloner

> List and clone all repositories from a GitHub organization. Two subcommands: `list` (print clone URLs) and `clone` (bulk `git clone`). Fully flag-based — agent-driven, zero prompts.

Part of the [`gh-tools`](../..) monorepo. For the LLM-readable manifest, see [`SKILLS.md`](SKILLS.md).

## Requirements

- **Node.js >= 20**
- **GitHub CLI** authenticated (`gh auth login`) — used to list org repos.
- **git** installed and authenticated (SSH key or HTTPS credential helper) — used to clone.

## Install

From the repo root:

```bash
npm install
npm run build
```

## Usage — `list`

Prints every repo's clone URL for an org (tab-separated: `full_name`, optional `[archived]`, URL).

```bash
npx orgs-repo-cloner list --org my-org
npx orgs-repo-cloner list --org my-org --protocol https --limit 10
```

### `list` options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--org <name>` | string | *(required)* | GitHub organization name. |
| `--protocol <p>` | `ssh` \| `https` | `ssh` | Which clone URL to print. |
| `--limit <n>` | int | *(all)* | Stop after N repos (handy for testing). |

## Usage — `clone`

Clones every (non-archived) repo from an org into a destination directory.

```bash
# Clone all non-archived repos -> ./org-repos/<repo>/
npx orgs-repo-cloner clone --org my-org

# HTTPS, into a custom dir, include archived
npx orgs-repo-cloner clone --org my-org --protocol https --dest ./mirrors --no-skip-archived
```

### `clone` options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--org <name>` | string | *(required)* | GitHub organization name. |
| `--protocol <p>` | `ssh` \| `https` | `ssh` | Clone URL protocol. |
| `--dest <dir>` | string | `./org-repos` | Destination directory; each repo clones into `<dest>/<repo>/`. |
| `--limit <n>` | int | *(all)* | Clone at most N repos. |
| `--skip-archived` | flag | on | Skip archived repos. Pass `--no-skip-archived` to include them. |

Already-cloned repos are skipped automatically by `git clone` on re-runs; failed clones are reported and can be retried by re-running.

## Development

```bash
npm run build --workspace orgs-repo-cloner       # tsc
npm run typecheck --workspace orgs-repo-cloner   # tsc --noEmit
npm test --workspace orgs-repo-cloner            # vitest (no tests yet)
npm run dev --workspace orgs-repo-cloner -- list --org my-org --limit 3   # via tsx
```

## License

Private — personal tooling.
