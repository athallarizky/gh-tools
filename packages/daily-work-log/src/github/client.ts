import { execa } from "execa";

export type GitHubClient = {
  rest<T>(path: string, options?: { previewAccept?: string }): Promise<T>;
};

export function createGitHubClient(): GitHubClient {
  return {
    async rest<T>(path: string, options?: { previewAccept?: string }) {
      const args = ["api", path];
      if (options?.previewAccept) {
        args.push("-H", `Accept: ${options.previewAccept}`);
      }
      return runGhJson<T>(args);
    }
  };
}

async function runGhJson<T>(args: string[]): Promise<T> {
  try {
    const result = await execa("gh", args);
    return JSON.parse(result.stdout) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `GitHub CLI request failed. Run "gh auth status" to verify authentication. Details: ${message}`
    );
  }
}
