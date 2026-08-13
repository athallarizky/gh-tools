import { execa } from "execa";

export type FileChange = {
  path: string;
  additions: number;
  deletions: number;
};

export type GitCommit = {
  sha: string;
  author: string;
  email: string;
  date: string;
  subject: string;
  files: FileChange[];
};

const RECORD_SEP = "\x1f";
const FIELD_SEP = "\x1e";

export async function listCommits(
  repoPath: string,
  input: { since: string; until: string; author?: string; authorEmail?: string }
): Promise<GitCommit[]> {
  const authorFilter = input.authorEmail ?? input.author;
  const untilInclusive = `${input.until} 23:59:59`;

  const args = [
    "log",
    "--no-merges",
    "--no-renames",
    `--since=${input.since}`,
    `--until=${untilInclusive}`,
    "--date=iso-strict",
    "--numstat",
    `--format=${RECORD_SEP}%H${FIELD_SEP}%an${FIELD_SEP}%ae${FIELD_SEP}%ad${FIELD_SEP}%s`
  ];

  if (authorFilter) {
    args.push(`--author=${authorFilter}`);
  }

  const result = await execa("git", args, { cwd: repoPath });
  return parseLogOutput(result.stdout);
}

export function parseLogOutput(output: string): GitCommit[] {
  if (!output.trim()) return [];

  const commits: GitCommit[] = [];
  const records = output.split(RECORD_SEP).slice(1);

  for (const record of records) {
    const [headerLine, ...bodyLines] = record.split("\n");
    const header = parseHeaderLine(headerLine ?? "");
    if (!header) continue;

    const files = bodyLines
      .map(parseNumstatLine)
      .filter((file): file is FileChange => file !== null);

    commits.push({ ...header, files });
  }

  return commits;
}

function parseHeaderLine(line: string): Omit<GitCommit, "files"> | null {
  const [sha, author, email, date, ...subjectParts] = line.split(FIELD_SEP);
  if (!sha || !author || !email || !date) return null;

  return {
    sha,
    author,
    email,
    date,
    subject: subjectParts.join(FIELD_SEP)
  };
}

function parseNumstatLine(line: string): FileChange | null {
  if (!line.trim()) return null;

  const [additionsRaw, deletionsRaw, ...pathParts] = line.split("\t");
  const path = pathParts.join("\t");
  if (!path) return null;

  return {
    path,
    additions: parseNumstatNumber(additionsRaw),
    deletions: parseNumstatNumber(deletionsRaw)
  };
}

function parseNumstatNumber(value: string | undefined): number {
  if (!value || value === "-") return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
