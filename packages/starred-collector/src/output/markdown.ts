/**
 * Obsidian-flavored markdown writer. Produces a knowledge-base document rich
 * enough for an agent to recommend tools ("can this help me build X?") without
 * re-fetching from the API.
 *
 * Structure per repo (detail block, not a flat table row):
 *   - title (link) + badges (license, archived, template)
 *   - description (the one-liner — the primary recommendation signal)
 *   - topics (tags — the secondary recommendation signal)
 *   - metadata line: language · ⭐ stars · 🍴 forks · ⚠ issues · 📅 pushed
 *   - homepage link (if present)
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { CATEGORY_NAMES, categorize, groupByCategory } from "../categorize.js";
import type { Repo } from "../types.js";

const BAR_CHAR = "█";

export type MarkdownOptions = {
  outputDir: string;
  filename: string;
  user: string;
  includeCategories: boolean;
  /** When set, emit only this single category (others omitted). */
  onlyCategory?: string;
};

export async function writeMarkdown(repos: Repo[], opts: MarkdownOptions): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const filtered = applyFilters(repos, opts);

  const lines: string[] = [];
  lines.push("---");
  lines.push(`title: GitHub Starred Repos`);
  lines.push(`created: ${today}`);
  lines.push(`updated: ${today}`);
  lines.push(`source: https://github.com/${opts.user}?tab=stars`);
  lines.push(`total: ${filtered.length}`);
  lines.push(`tags: [github, starred, reference, index, mocs, knowledge-base]`);
  lines.push("---");
  lines.push("");
  lines.push("# GitHub Starred Repos");
  lines.push("");
  lines.push(
    `> [!info] Knowledge base of repos starred by **[@${opts.user}](https://github.com/${opts.user}?tab=stars)** — **${filtered.length} repos** per ${today}.`,
  );
  lines.push(
    "> Use this as a recommendation source: each entry includes description, topics, license, popularity signals, and maintenance recency — enough to judge whether a tool can help build something.",
  );
  lines.push("");

  // Table of contents
  if (opts.includeCategories) {
    lines.push("## Daftar Isi");
    lines.push("");
    const groups = groupByCategory(filtered);
    for (const name of CATEGORY_NAMES) {
      const list = groups.get(name) ?? [];
      if (list.length === 0) continue;
      if (opts.onlyCategory && name !== opts.onlyCategory) continue;
      lines.push(`- [[#${name}]] — ${list.length} repo`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");

  // Statistics
  appendStatistics(lines, filtered);
  lines.push("---");
  lines.push("");

  // Per-category detail blocks
  if (opts.includeCategories) {
    const groups = groupByCategory(filtered);
    for (const name of CATEGORY_NAMES) {
      const list = groups.get(name) ?? [];
      if (list.length === 0) continue;
      if (opts.onlyCategory && name !== opts.onlyCategory) continue;
      appendCategorySection(lines, name, list);
    }
  } else {
    appendCategorySection(lines, "All Repos", filtered);
  }

  const content = ensureTrailingNewline(lines.join("\n"));
  const filepath = join(opts.outputDir, `${opts.filename}.md`);
  await mkdir(dirname(filepath), { recursive: true });
  await writeFile(filepath, content, "utf8");
  return filepath;
}

// ─── statistics ──────────────────────────────────────────────────────────────

function appendStatistics(lines: string[], repos: Repo[]): void {
  lines.push("## Statistik Singkat");
  lines.push("");
  lines.push(`**Total repo:** ${repos.length}`);
  lines.push("");

  // Top languages
  const langCount = countLanguages(repos);
  const topLangs = [...langCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  lines.push("**Top bahasa utama:**");
  lines.push("");
  for (const [lang, count] of topLangs) {
    const bar = BAR_CHAR.repeat(Math.min(20, Math.floor(count / 4)));
    lines.push(`- \`${lang}\` — ${count}  ${bar}`);
  }
  lines.push("");

  // License distribution — useful for "can I use this?" reasoning
  const licenseCount = countLicenses(repos);
  const topLicenses = [...licenseCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (topLicenses.length > 0) {
    lines.push("**Top licenses:**");
    lines.push("");
    for (const [lic, count] of topLicenses) {
      lines.push(`- \`${lic}\` — ${count}`);
    }
    lines.push("");
  }

  // Maintenance signals — how many are archived vs. recently pushed
  const archived = repos.filter((r) => r.archived).length;
  const last30days = repos.filter((r) => isWithinDays(r.pushed_at, 30)).length;
  const last90days = repos.filter((r) => isWithinDays(r.pushed_at, 90)).length;
  lines.push("**Maintenance signals:**");
  lines.push("");
  lines.push(`- Recently pushed (≤30 days): **${last30days}** repo`);
  lines.push(`- Pushed within 90 days: **${last90days}** repo`);
  lines.push(`- Archived (read-only): **${archived}** repo`);
  lines.push("");
}

// ─── per-category sections ───────────────────────────────────────────────────

function appendCategorySection(lines: string[], name: string, repos: Repo[]): void {
  lines.push(`## ${name}`);
  lines.push("");
  lines.push(`> ${repos.length} repo`);
  lines.push("");
  for (const repo of repos) {
    appendRepoDetail(lines, repo);
  }
}

/**
 * A rich per-repo detail block — the core of the knowledge base. Every field
 * here is chosen to help an agent (or human) answer "can this tool help me
 * build X?" without a second API call.
 */
function appendRepoDetail(lines: string[], repo: Repo): void {
  // Title line with status badges
  const badges = formatBadges(repo);
  lines.push(`### [${repo.full_name}](${repo.html_url})${badges ? ` ${badges}` : ""}`);
  lines.push("");

  // Description — the primary recommendation signal
  const desc = repo.description?.trim() || "*(no description)*";
  lines.push(`> ${escapeInline(desc)}`);
  lines.push("");

  // Topics — the secondary recommendation signal (tags)
  if (repo.topics.length > 0) {
    const tags = repo.topics.map((t) => `\`#${t}\``).join(" ");
    lines.push(`**Topics:** ${tags}`);
    lines.push("");
  }

  // Metadata line — popularity + maintenance + license at a glance
  const meta = [
    `**Lang:** ${repo.language ?? "—"}`,
    `**⭐** ${formatStars(repo.stargazers_count)}`,
    `**🍴** ${formatStars(repo.forks_count)}`,
    `**⚠** ${repo.open_issues_count}`,
    `**License:** ${formatLicense(repo.license)}`,
    `**Pushed:** ${formatDate(repo.pushed_at)}`,
  ];
  lines.push(meta.join(" · "));
  lines.push("");

  // Homepage (if present — points to docs/demo)
  if (repo.homepage) {
    lines.push(`**Homepage:** ${escapeInline(repo.homepage)}`);
    lines.push("");
  }

  lines.push("---");
  lines.push("");
}

// ─── formatters ──────────────────────────────────────────────────────────────

function formatBadges(repo: Repo): string {
  const badges: string[] = [];
  if (repo.archived) badges.push("`ARCHIVED`");
  if (repo.is_template) badges.push("`TEMPLATE`");
  if (repo.fork) badges.push("`FORK`");
  if (repo.has_discussions) badges.push("`DISCUSSIONS`");
  return badges.join(" ");
}

function formatStars(count: number): string {
  return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
}

function formatLicense(
  license: { key: string; name: string; spdx_id: string | null } | null,
): string {
  if (!license) return "—";
  return license.spdx_id ?? license.name ?? "Other";
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

function escapeInline(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
}

// ─── aggregations ────────────────────────────────────────────────────────────

function countLanguages(repos: Repo[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const repo of repos) {
    const lang = repo.language ?? "Unknown";
    counts.set(lang, (counts.get(lang) ?? 0) + 1);
  }
  return counts;
}

function countLicenses(repos: Repo[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const repo of repos) {
    const lic = repo.license?.spdx_id ?? repo.license?.name ?? "None";
    counts.set(lic, (counts.get(lic) ?? 0) + 1);
  }
  return counts;
}

function isWithinDays(iso: string, days: number): boolean {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return false;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return then >= cutoff;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function applyFilters(repos: Repo[], opts: MarkdownOptions): Repo[] {
  if (opts.includeCategories && opts.onlyCategory) {
    return repos.filter((r) => categorize(r) === opts.onlyCategory);
  }
  return repos;
}

function ensureTrailingNewline(text: string): string {
  return text.endsWith("\n") ? text : `${text}\n`;
}
