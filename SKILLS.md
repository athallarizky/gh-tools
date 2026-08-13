# gh-tools — Skills Registry

> **For:** any LLM agent working in this repo in a fresh session.
> **Read this first** to discover what tools exist and when to reach for them.
>
> This is a monorepo of TypeScript CLI tools for GitHub. Each tool lives in
> `packages/<name>/` and ships its **own `SKILLS.md`** describing its
> capabilities, inputs, outputs, and examples in machine-digestible form.
>
> **Design principle:** every tool here is **agent-driven** — fully flag-based,
> zero interactive prompts. An LLM agent, a shell script, and a human in a
> terminal all invoke the tool the same way (with flags). The `SKILLS.md` files
> are the contract that teaches agents when and how to call each tool.

## Available Tools

| Tool | Purpose | When to use (triggers) | Run | Detail |
|------|---------|------------------------|-----|--------|
| **starred-collector** | Collect a user's starred repos into knowledge-base files (markdown + CSV) and merge multiple users' collections into a deduplicated catalog. Two subcommands: `collect` (one user) and `combine` (merge all/some). | "collect my GitHub stars", "collect testuser's starred repos", "combine all collections", "merge alice and bob's collections", "build a tool catalog for RAG" | `npx starred-collector collect --user <login>` | [`packages/starred-collector/SKILLS.md`](packages/starred-collector/SKILLS.md) |

| **daily-work-log** | Collect a day's GitHub activity (commits, issues, PRs) for a given date into an agent-ready context bundle, then summarize it into a daily work log. One subcommand: `collect`. | "summarize my work today", "what did I do yesterday?", "collect my commits/issues/PRs for <date>", "write a daily work log" | `npx daily-work-log collect --date <yyyy-mm-dd>` | [`packages/daily-work-log/SKILLS.md`](packages/daily-work-log/SKILLS.md) |

| **orgs-repo-cloner** | List and/or clone all repositories from a GitHub organization. Two subcommands: `list` (print clone URLs) and `clone` (bulk `git clone`). | "list all repos in <org>", "clone all of <org>'s repos", "mirror/backup an org", "get clone URLs for <org>" | `npx orgs-repo-cloner list --org <org>` | [`packages/orgs-repo-cloner/SKILLS.md`](packages/orgs-repo-cloner/SKILLS.md) |

| **portfolio-history** | Scan locally cloned Git repositories and build a CV-ready portfolio summary from commit activity. One subcommand: `scan`. | "build a portfolio from git history", "summarize what I developed at <org>", "generate a CV-ready summary from local repos" | `npx portfolio-history scan --since <yyyy-mm-dd> --until <yyyy-mm-dd>` | [`packages/portfolio-history/SKILLS.md`](packages/portfolio-history/SKILLS.md) |

> Adding a tool? Append a row here and write its `packages/<name>/SKILLS.md`.

## Shared Conventions

All tools in this monorepo follow the same architecture. When extending or
debugging any tool, assume these unless its `SKILLS.md` says otherwise.

- **Language & runtime:** TypeScript (strict), Node.js ≥ 20, ESM via `NodeNext`.
- **Package manager:** npm with workspaces (`"workspaces": ["packages/*"]`).
- **CLI framework:** [`commander`](https://github.com/tj/commander.js) for flags/subcommands.
- **Validation:** [`zod`](https://zod.dev) schemas as the single source of truth for all config and data types — domain types are `z.infer<typeof schema>`, never hand-written.
- **GitHub auth (dual-mode):**
  - If `GITHUB_TOKEN` is set → raw `fetch` against `https://api.github.com` with `Authorization: Bearer <token>` and rate-limit handling.
  - Otherwise → shell out to the authenticated `gh` CLI via [`execa`](https://github.com/sindresorhus/execa) (`gh api <path>`). Requires `gh auth login`.
- **Error handling idiom:**
  ```ts
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`...: ${message}`);
  ```
  Top-level CLI catch prints `Error: <message>` to stderr and sets `process.exitCode = 1` (never calls `process.exit()` directly).
- **Factories over classes:** `createLogger(debug)`, `createGitHubClient(env)`, etc. No `class` keywords.
- **File I/O:** `node:fs/promises` with `mkdir({ recursive: true })`; JSON written with `JSON.stringify(x, null, 2) + "\n"` (trailing newline).

## Build & Test (run from repo root)

```bash
npm install            # installs + links all workspaces
npm run build          # tsc build in every workspace
npm run typecheck      # tsc --noEmit in every workspace
npm test               # vitest in every workspace

# run a single tool without building:
npm run dev --workspace starred-collector -- collect --debug
```

## Adding a New Tool

1. `cp -r packages/starred-collector packages/<new-tool>` (use as template).
2. Edit `packages/<new-tool>/package.json` — change `name` and `bin`.
3. Rewrite `src/cli.ts` (entry) and add logic under `src/`.
4. Write **`packages/<new-tool>/SKILLS.md`** using the [per-tool template](packages/starred-collector/SKILLS.md) (Name · When to use · When NOT to use · Prerequisites · Inputs · Outputs · Examples · Exit codes).
5. Write `packages/<new-tool>/README.md` for human readers.
6. Register the tool in the table above **and** in this repo's [`README.md`](README.md).

## Agent Workflow (how tools are meant to be used)

Every tool in this monorepo follows the **collect → read → reason** loop. As an
agent, your job is to (1) invoke a tool to gather data, (2) read its output
file, (3) reason over it to answer the user's question:

```
1. COLLECT  — call the tool with flags to fetch/export data.
2. READ     — read the output file the tool wrote (its SKILLS.md says where).
3. REASON   — analyze the data and answer the user's question in natural language.
```

**Example** (starred-collector):
- User: *"collect testuser's starred repos and find ones for speech-to-text"*
- Agent: runs `starred-collector collect --user testuser --format json` →
  reads `./collections/testuser.json` → finds relevant repos → summarizes each.

Because tools never prompt, you can chain multiple `collect` calls (e.g. for
several users) and read all the output files in one reasoning pass.

## Tool Discovery Heuristic (for agents)

If a user asks for something GitHub-related (fetch data, summarize activity,
clone repos, export lists, audit a profile), first check the **Available Tools**
table above. If no existing tool matches, consider whether a new tool in this
monorepo is warranted (following the conventions above) before reaching for a
one-off script.
