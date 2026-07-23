/**
 * Categorization engine — maps each repo to one of 22 categories using
 * keyword regexes matched against the repo's name + description + topics.
 *
 * Design:
 *  - Specific categories are tried FIRST; the broad AI/LLM catch-all is LAST
 *    so it only claims repos that are genuinely about AI/LLM tooling.
 *  - Rules are baked-in defaults. To tweak, edit `CATEGORIES` below.
 *  - Any repo matching no rule lands in "Other / Miscellaneous".
 */
import type { Repo } from "./types.js";

export type Category = { name: string; patterns: RegExp[] };

/**
 * Ordered category ruleset. Order matters: earlier categories win on ties.
 */
export const CATEGORIES: Category[] = [
  {
    name: "Learning / Books / Resources",
    patterns: [
      /\b(free[- ]?programming[- ]?book|freely available programming|clean.?code|programming book|learn.{0,10}code|coding interview|roadmap to|cheatsheet|cheat.?sheet|free course|tutorial series|jargon, explained|dictionary-of)\b/,
    ],
  },
  {
    name: "Awesome Lists / Curated",
    patterns: [/\b(awesome[-/ ]|curated list)\b/],
  },
  {
    name: "Templates / Starters / Boilerplates",
    patterns: [/\b(template|starter kit|boilerplate|scaffold|\bseed repo\b)\b/],
  },
  {
    name: "Media / Downloaders / Content",
    patterns: [
      /\b(downloader|download video|youtube.?dl|spotify|music player|media server|podcast|media download|video editor|capcut)\b/,
    ],
  },
  {
    name: "Creative / Design Tools",
    patterns: [
      /\b(design platform|design tool|figma alternative|\b3d.{0,5}(architect|model|design|project)|photo editor|vector editor|penpot|parallax)\b/,
    ],
  },
  {
    name: "Maps / Visualization / Charts",
    patterns: [
      /\b(\bmap\b|map component|leaflet|mapbox|chart library|\bd3\b|\bplot\b|data visualization|graph visualization|touch slider|before-after comparison)\b/,
    ],
  },
  {
    name: "Editor / IDE / Coding Agents",
    patterns: [
      // Agent dev environments (ADEs) and multi-agent orchestration surfaces.
      // Checked BEFORE "OS / Desktop" so a repo that merely integrates with
      // ghostty (a terminal emulator) as one of many integrations — e.g. orca,
      // an ADE for a fleet of parallel agents — is not swallowed by the
      // desktop/OS bucket via the `ghostty` keyword.
      /\b(agent.?ide|\bade\b|parallel.?agent|fleet of agent|worktrees)\b/,
      /\b(\bneovim\b|\bvim\b|vscode|jetbrains|\bide\b|code editor|\bzed\b|coding agent|cursor|opencode)\b/,
    ],
  },
  {
    name: "OS / Desktop / Mac & Linux",
    patterns: [
      /\b(macos app|\bgnome\b|gtk theme|\blinux\b|\btouchpad\b|libinput|ghostty|keyboard shortcut|browser extension|browser start|customizing which browser|\.desktop)\b/,
    ],
  },
  {
    name: "Mobile / Desktop / Cross-Platform",
    patterns: [
      /\b(\bandroid\b|\bios\b|\bswift\b|\bflutter\b|react native|\btauri\b|\belectron\b|desktop app|cross-platform|mobile touch)\b/,
    ],
  },
  {
    name: "Security / Privacy / Networking",
    patterns: [
      /\b(\bsecurity\b|\bprivacy\b|\bvpn\b|\bproxy\b|\bfirewall\b|encryption|pentest|vulnerab|\bcve\b|password manager|2fa|\btls\b|dns server|bypass gfw|trojan|anti-detect|infosec|smtp server|view.?source.?protection)\b/,
    ],
  },
  {
    name: "Build / Deploy / DevOps / Cloud",
    patterns: [
      /\b(\bdocker\b|kubernetes|\bk8s\b|\bdeploy|ci\/cd|github actions|cloudflare|terraform|ansible|infrastructure|\bnginx\b|container|\bport\b.{0,15}(kill|free)|named local url|local.{0,5}url|localhost.{0,15}(url|public)|jamstack|http benchmarking|edge config|blob storage)\b/,
    ],
  },
  {
    name: "Data / Scraping / Automation",
    patterns: [
      /\b(scrap|crawl|\bspider\b|web automation|workflow automation|\bautomation\b|etl|\bdataset\b|ocr|text recognition|knowledge catalog)\b/,
    ],
  },
  {
    name: "DevTools / CLI / Terminal",
    patterns: [
      /\b(\bcli\b|command.?line|\bterminal\b|tmux|\bzsh\b|bash script|developer tool|devtool|\btui\b|prompt theme|dotfiles|fuzzy finder|package manager|ccusage|shell history|diff viewer|code sharing|signature pad|date picker)\b/,
    ],
  },
  {
    name: "Self-Hosted / Apps / Productivity",
    patterns: [
      /\b(self.?host|self-hosted|note.?taking|bookmark manager|\brss\b|personal dashboard|knowledge base|knowledge graph|\bwiki\b|read-it-later|personal finance|ecommerce|e-commerce|commerce platform|collaborative password|multitenant management|m365)\b/,
    ],
  },
  {
    name: "Backend / API / Database",
    patterns: [
      /\b(rest api|graphql|\bgrpc\b|database|\bpostgres|mysql|sqlite|redis|mongo|\borm\b|\bprisma\b|drizzle|backend framework|supabase|firebase|laravel|debugbar|roles and permission|openapi|http-friendly error|smtp|email server)\b/,
    ],
  },
  {
    name: "Auth / Identity",
    patterns: [
      /\b(\bauth\b|authentication|oauth|token-based|sign in with ethereum|\bsiwe\b|refresh.?token|\bjwt\b|openid|sso|identity)\b/,
    ],
  },
  {
    name: "Logging / Utilities / Libraries",
    patterns: [
      /\b(logger|logging|dotenv|environment variable|classnames|pattern matching|functional programming|functional javascript|immutable state|json log)\b/,
    ],
  },
  {
    name: "Frontend / UI / Design",
    patterns: [
      /\b(frontend|front-end|\breact\b|react router|\bvue\b|vuex|\bsvelte\b|angular|angularjs|nextjs|next-auth|next\.?js|\bastro\b|\bnuxt\b|\bui kit\b|\bcss\b|\btailwind\b|design system|\bsvg\b|component library|\bshadcn|radix ui|headless ui|gatsby plugin|anchor link)\b/,
    ],
  },
  {
    name: "Programming Languages / Runtimes",
    patterns: [
      /\b(programming language|the julia|nix,|purely functional package|\bruntime\b|\bdeno\b|\bbun\b|language server)\b/,
    ],
  },
  {
    name: "AI Coding / Agent Tooling",
    patterns: [
      /\b(agentic skill|skills framework|skills for agent|skills-best-practices|write.{0,10}skills|chrome devtools|coding agents|codebase.{0,10}(audit|plan)|improve.{0,10}codebase|agentic engineering|ai.?engineering.?coach|audit.{0,10}codebase|ai-generated code|tracking.{0,10}ai-generated|ai coding|semantic graph memory|register for services|protocol that lets agents)\b/,
    ],
  },
  {
    name: "AI / Agents / LLM",
    patterns: [
      /\b(\bllm\b|\bgpt\b|\bagent\b|agent framework|agent harness|manage agents|\bclaude\b|\bgemini\b|openai|anthropic|\brag\b|vector database|vector search|embedding model|\bprompt\b|\bcopilot\b|\bchatbot\b|inference engine|fine.?tun|transformer|huggingface|\bollama\b|llama|mcp server|model context protocol|ai framework|run.{0,5}ai locally|diffusion model|stable.?diffusion|text-to-image|foundation model|machine learning|deep learning|neural|\brai\b)\b/,
    ],
  },
];

export const OTHER_CATEGORY = "Other / Miscellaneous";

/** All category names in display order (used for the markdown TOC / JSON summary). */
export const CATEGORY_NAMES: string[] = [
  ...CATEGORIES.map((c) => c.name),
  OTHER_CATEGORY,
];

/**
 * Assign one category to a repo. Returns the first matching category name,
 * or `OTHER_CATEGORY` if nothing matches.
 */
export function categorize(repo: Repo): string {
  const text = [repo.name, repo.description ?? "", ...repo.topics].join(" ").toLowerCase();
  for (const cat of CATEGORIES) {
    for (const pattern of cat.patterns) {
      if (pattern.test(text)) return cat.name;
    }
  }
  return OTHER_CATEGORY;
}

/** Map of category name → repos, with repos sorted by stars desc within each. */
export function groupByCategory(repos: Repo[]): Map<string, Repo[]> {
  const groups = new Map<string, Repo[]>();
  for (const name of CATEGORY_NAMES) groups.set(name, []);
  for (const repo of repos) {
    const cat = categorize(repo);
    groups.get(cat)!.push(repo);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => b.stargazers_count - a.stargazers_count);
  }
  return groups;
}
