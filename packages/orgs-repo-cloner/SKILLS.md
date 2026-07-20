# orgs-repo-cloner — Skills

> **For:** any LLM agent that needs to enumerate or bulk-clone a GitHub
> organization's repositories. Read this to know when and how to use this tool.

## Name

**orgs-repo-cloner** — list and/or clone all repositories from a GitHub
organization. `list` prints clone URLs; `clone` runs `git clone` for each repo.

Two subcommands: **`list`** and **`clone`**.

## When to use

Reach for **`list`** when the user asks to:

- "list all repos in <org>"
- "get the clone URLs for <org>'s repos"
- "how many repos does <org> have?" (count the output lines)

Reach for **`clone`** when the user asks to:

- "clone all of <org>'s repos"
- "mirror / back up an entire GitHub organization"
- "clone every non-archived repo in <org>"

## When NOT to use

- Cloning a **single known repo** → `git clone <url>` directly.
- **One user's** repos (not an org) → outside scope (this targets orgs).
- **Fetching repo content** (issues, PRs, commits) → use `daily-work-log` or `gh api`.
- **Read-only inspection without cloning** → use `list`, not `clone`.

## Prerequisites

- **GitHub CLI** authenticated (`gh auth login`) — listing uses `gh api`.
- **git** installed and authenticated (SSH key or HTTPS credential helper) —
  cloning runs `git clone`, so git must be able to auth to GitHub.
- **Node.js >= 20**.

> Auth is **gh-CLI + git** only. Listing does not read `GITHUB_TOKEN`; cloning
> uses git's own credentials. This differs from the monorepo's general dual-mode
> convention.

## Folder layout (`clone`)

```
<dest>/                 ← default ./org-repos
├── <repo-A>/           ← git clone of org/<repo-A>
├── <repo-B>/
└── ...
```

Each repo clones flat into `<dest>/<repo-name>/` (no per-org subdir).

---

## Subcommand: `list`

Prints one line per repo to stdout, tab-separated:
`<full_name>\t[archived]?\t<clone-url>`. Progress goes to stderr. Archived repos
are included and flagged `[archived]` (use `clone` to skip them).

### Inputs

```
orgs-repo-cloner list --org <name> [options]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--org <name>` | string | *(required)* | GitHub organization name. |
| `--protocol <p>` | `ssh` \| `https` | `ssh` | Which clone URL to print. |
| `--limit <n>` | int | *(all)* | Stop after N repos. |

### Examples

```bash
orgs-repo-cloner list --org my-org
orgs-repo-cloner list --org my-org --protocol https --limit 10
```

---

## Subcommand: `clone`

Clones every (non-archived) repo from an org into `<dest>/`. Re-runs are safe:
`git clone` skips repos that already exist locally; failed clones are counted and
can be retried by re-running.

### Inputs

```
orgs-repo-cloner clone --org <name> [options]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--org <name>` | string | *(required)* | GitHub organization name. |
| `--protocol <p>` | `ssh` \| `https` | `ssh` | Clone URL protocol. |
| `--dest <dir>` | string | `./org-repos` | Destination dir; clones into `<dest>/<repo>/`. |
| `--limit <n>` | int | *(all)* | Clone at most N repos. |
| `--skip-archived` | flag | on | Skip archived repos. Use `--no-skip-archived` to include. |

### Examples

```bash
# Clone all non-archived repos -> ./org-repos/<repo>/
orgs-repo-cloner clone --org my-org

# HTTPS, custom dest, include archived
orgs-repo-cloner clone --org my-org --protocol https --dest ./mirrors --no-skip-archived

# Just the 5 most-recently-pushed (smoke test)
orgs-repo-cloner clone --org my-org --limit 5 --dest ./tmp-clone
```

## Agent Workflow

This tool is **agent-driven**: fully flag-based, zero prompts.

```
1. LIST   -> orgs-repo-cloner list --org <org>           # inspect/count first
2. CLONE  -> orgs-repo-cloner clone --org <org> [--dest]  # materialize on disk
3. REASON -> operate on <dest>/<repo>/ as needed
```

Tip: run `list` first to gauge size; large orgs produce large clones.

## Exit Codes & Errors

| Code | Meaning |
|------|---------|
| `0` | Success. |
| `1` | Fatal error (auth, org not found, `gh` failure). Per-repo `clone` failures are reported and do **not** change the exit code. |

Common fixes:
- **Auth errors** -> `gh auth status` / `gh auth login`; ensure git can auth (SSH key or credential helper).
- **Org not found / no access** -> check `--org` spelling and org membership.
- **Clone failures** -> re-run; already-cloned repos are skipped.

## Source Map

| File | Role |
|------|------|
| `src/cli.ts` | Entry point: `list` + `clone` subcommands (commander). |
| `src/github.ts` | `listOrgRepos()` — paginated `gh api orgs/<org>/repos` (up to 20 pages, dedup by `full_name`, sorted by `pushed` desc). |
