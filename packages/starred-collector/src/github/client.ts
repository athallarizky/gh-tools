/**
 * GitHub API client — dual-mode auth, matching the gh-tools convention.
 *
 *  - If `GITHUB_TOKEN` is set → raw `fetch` against api.github.com with a
 *    Bearer header and explicit rate-limit handling.
 *  - Otherwise → shell out to the authenticated `gh` CLI via `execa`, which
 *    delegates auth to `gh auth login`.
 *
 * Exposes a narrow interface so callers stay transport-agnostic.
 */
import { execa } from "execa";
import { buildViewerPath } from "./queries.js";

const API_BASE = "https://api.github.com";

export type GitHubClient = {
  /** GET a REST path, returning parsed JSON. */
  rest<T>(path: string, options?: { previewAccept?: string }): Promise<T>;
  /** Resolve the authenticated viewer's login. Returns null if unavailable. */
  getViewerLogin(): Promise<string | null>;
};

export function createGitHubClient(env: NodeJS.ProcessEnv = process.env): GitHubClient {
  if (env.GITHUB_TOKEN) {
    return createTokenClient(env.GITHUB_TOKEN);
  }
  return createGhClient();
}

// ─── token mode ──────────────────────────────────────────────────────────────

function createTokenClient(token: string): GitHubClient {
  async function request(path: string, init?: RequestInit): Promise<Response> {
    const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        ...init?.headers,
      },
    });
    if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") {
      const resetEpoch = Number(res.headers.get("x-ratelimit-reset") ?? 0);
      const resetTime = resetEpoch ? new Date(resetEpoch * 1000).toISOString() : "unknown";
      throw new Error(
        `GitHub rate limit exceeded. Resets at ${resetTime}. Wait or use the gh CLI.`,
      );
    }
    if (!res.ok) {
      throw new Error(`GitHub API responded ${res.status} for ${path}`);
    }
    return res;
  }

  return {
    async rest<T>(path: string, options?: { previewAccept?: string }): Promise<T> {
      const headers: Record<string, string> = {};
      if (options?.previewAccept) headers.accept = options.previewAccept;
      const res = await request(path, { headers });
      return (await res.json()) as T;
    },
    async getViewerLogin() {
      try {
        const res = await request(buildViewerPath());
        const body = (await res.json()) as { login?: string };
        return body.login ?? null;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Could not resolve authenticated user: ${message}`);
      }
    },
  };
}

// ─── gh CLI mode ─────────────────────────────────────────────────────────────

function createGhClient(): GitHubClient {
  return {
    async rest<T>(path: string, options?: { previewAccept?: string }): Promise<T> {
      const args = ["api", path];
      if (options?.previewAccept) {
        args.push("-H", `Accept: ${options.previewAccept}`);
      }
      try {
        const result = await execa("gh", args);
        return JSON.parse(result.stdout) as T;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `GitHub CLI request failed. Run "gh auth status" to verify authentication. Details: ${message}`,
        );
      }
    },
    async getViewerLogin() {
      try {
        const client = createGhClient();
        const body = await client.rest<{ login?: string }>(buildViewerPath());
        return body.login ?? null;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Could not resolve authenticated user: ${message}`);
      }
    },
  };
}
