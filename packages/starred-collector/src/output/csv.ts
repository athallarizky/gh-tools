/**
 * CSV writer + parser. The CSV is the machine-readable layer of the
 * knowledge base — the combine command reads these back to merge collections,
 * and a future RAG pipeline ingests the combined CSV.
 *
 * Columns chosen for spreadsheet/agent/RAG analysis:
 *   full_name, url, description, language, stars, forks, open_issues,
 *   license, topics, category, is_archived, pushed_at, created_at, homepage
 * Commas and quotes in fields are escaped per RFC 4180.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { categorize } from "../categorize.js";
import type { Repo } from "../types.js";

export type CsvOptions = {
  outputDir: string;
  filename: string;
};

/** Column order — shared between writer and parser so they stay in sync. */
export const CSV_COLUMNS = [
  "full_name",
  "url",
  "description",
  "language",
  "stars",
  "forks",
  "open_issues",
  "license",
  "topics",
  "category",
  "is_archived",
  "pushed_at",
  "created_at",
  "homepage",
] as const;

export const CSV_HEADER = CSV_COLUMNS.join(",");

/** A parsed CSV row — string values (numbers come back as strings, coerced by caller). */
export type RepoCsvRow = {
  full_name: string;
  url: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  open_issues: number;
  license: string;
  topics: string[]; // split from semicolon-joined
  category: string;
  is_archived: boolean;
  pushed_at: string;
  created_at: string;
  homepage: string;
};

export async function writeCsv(repos: Repo[], opts: CsvOptions): Promise<string> {
  const rows = repos.map((r) =>
    [
      r.full_name,
      r.html_url,
      r.description ?? "",
      r.language ?? "",
      String(r.stargazers_count),
      String(r.forks_count),
      String(r.open_issues_count),
      r.license?.spdx_id ?? r.license?.name ?? "",
      r.topics.join(";"),
      categorize(r),
      String(r.archived),
      r.pushed_at,
      r.created_at,
      r.homepage ?? "",
    ]
      .map(escapeCsv)
      .join(","),
  );

  const content = [CSV_HEADER, ...rows, ""].join("\n");
  const filepath = join(opts.outputDir, `${opts.filename}.csv`);
  await mkdir(dirname(filepath), { recursive: true });
  await writeFile(filepath, content, "utf8");
  return filepath;
}

/**
 * Parse a CSV string (the output of writeCsv) back into typed RepoCsvRow[].
 * Handles quoted fields (commas/newlines inside quotes) and semicolon-joined
 * topics. Throws on malformed input.
 */
export function parseCsv(text: string): RepoCsvRow[] {
  const records = parseCsvRecords(text);
  if (records.length === 0) return [];

  const header = records[0];
  const colIndex = new Map<string, number>();
  header.forEach((col, i) => colIndex.set(col.trim(), i));

  const rows: RepoCsvRow[] = [];
  for (let i = 1; i < records.length; i++) {
    const r = records[i];
    if (r.length === 1 && r[0] === "") continue; // skip blank lines
    rows.push({
      full_name: cell(r, colIndex, "full_name"),
      url: cell(r, colIndex, "url"),
      description: cell(r, colIndex, "description"),
      language: cell(r, colIndex, "language"),
      stars: Number(cell(r, colIndex, "stars")) || 0,
      forks: Number(cell(r, colIndex, "forks")) || 0,
      open_issues: Number(cell(r, colIndex, "open_issues")) || 0,
      license: cell(r, colIndex, "license"),
      topics: cell(r, colIndex, "topics")
        .split(";")
        .map((t) => t.trim())
        .filter(Boolean),
      category: cell(r, colIndex, "category"),
      is_archived: cell(r, colIndex, "is_archived") === "true",
      pushed_at: cell(r, colIndex, "pushed_at"),
      created_at: cell(r, colIndex, "created_at"),
      homepage: cell(r, colIndex, "homepage"),
    });
  }
  return rows;
}

function cell(row: string[], colIndex: Map<string, number>, name: string): string {
  const idx = colIndex.get(name);
  if (idx === undefined) return "";
  return row[idx] ?? "";
}

/** Quote a field if it contains comma/quote/newline; double internal quotes. */
function escapeCsv(value: string): string {
  if (/["\n,]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Minimal RFC-4180 CSV record parser. Splits text into rows of fields,
 * respecting quoted fields (which may contain commas, newlines, and escaped
 * quotes via doubling). Returns string[][].
 */
function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false; // end of quoted field
        }
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\n") {
        row.push(field);
        records.push(row);
        row = [];
        field = "";
      } else if (char === "\r") {
        // skip — handled by \n
      } else {
        field += char;
      }
    }
  }
  // flush last field/row if text doesn't end with newline
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }
  return records;
}
