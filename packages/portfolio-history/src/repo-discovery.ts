import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

export type LocalRepo = {
  name: string;
  path: string;
};

export async function discoverLocalRepos(root: string): Promise<LocalRepo[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const repos: LocalRepo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dirPath = join(root, entry.name);
    if (await isGitRepo(dirPath)) {
      repos.push({ name: entry.name, path: dirPath });
    }
  }

  return repos.sort((a, b) => a.name.localeCompare(b.name));
}

async function isGitRepo(dirPath: string): Promise<boolean> {
  try {
    const gitDir = await stat(join(dirPath, ".git"));
    return gitDir.isDirectory();
  } catch {
    return false;
  }
}
