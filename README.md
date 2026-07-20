# gh-tools

> A monorepo of TypeScript CLI tools for GitHub.

## Tools

| Tool | Purpose | Docs |
|------|---------|------|
| [starred-collector](packages/starred-collector/) | Fetch + categorize a user's starred repos → markdown / json / csv | [SKILLS.md](packages/starred-collector/SKILLS.md) · [README](packages/starred-collector/README.md) |
| [daily-work-log](packages/daily-work-log/) | Collect a day's GitHub activity (commits, issues, PRs) into an agent-ready context bundle | [SKILLS.md](packages/daily-work-log/SKILLS.md) · [README](packages/daily-work-log/README.md) |
| [orgs-repo-cloner](packages/orgs-repo-cloner/) | List and clone all repositories from a GitHub organization | [SKILLS.md](packages/orgs-repo-cloner/SKILLS.md) · [README](packages/orgs-repo-cloner/README.md) |

## Requirements

- **Node.js ≥ 20**
- **GitHub authentication** — either:
  - [GitHub CLI](https://cli.github.com) installed and authenticated (`gh auth login`), **or**
  - a `GITHUB_TOKEN` environment variable (PAT with at least `public_repo` / `repo` + `read:user` scope)

## Quickstart

```bash
# from the repo root
npm install
npm run build

# each tool's bin is linked on install — run any of them:
npx starred-collector collect --user <login> --output ./out
npx daily-work-log collect --date <yyyy-mm-dd> --output ./tmp-journal
npx orgs-repo-cloner list --org <org>
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build all workspaces |
| `npm run test` | Run tests in all workspaces |
| `npm run typecheck` | Typecheck all workspaces |
| `npm run clean` | Remove `dist/` in all workspaces |
| `npm run dev --workspace <pkg>` | Run a tool's entry via `tsx` (no build needed) |

## Conventions

- **Stack:** TypeScript, Node ≥ 20, npm workspaces, ESM (NodeNext).
- **CLI pattern:** `commander` + `zod` (schemas are the source of truth for types) + `execa` for shelling out to `gh` when no `GITHUB_TOKEN` is set.
- **Auth:** dual-mode — `GITHUB_TOKEN` → raw `fetch` to `api.github.com`; otherwise delegate to the `gh` CLI.
- **Layout:** each tool is a self-contained package under `packages/<name>/` with its own `src/`, `tests/`, `SKILLS.md`, and `README.md`.
- **Shared code:** will live in `packages/common` once a second tool needs it (deferred until then).

## Adding a new tool

1. Copy the template: `cp -r packages/starred-collector packages/<new-tool>`.
2. Edit `packages/<new-tool>/package.json` (`name`, `bin`).
3. Rewrite `src/cli.ts` and add logic under `src/`.
4. Write `packages/<new-tool>/SKILLS.md` (agent-readable manifest) and `README.md` (human docs).
5. Register the tool in this file's table above and in [`SKILLS.md`](SKILLS.md).

## License

Private — personal tooling.
