import type { NormalizedDay } from "../model.js";

export type BundleManifest = {
  schemaVersion: "2.0";
  bundleDir: string;
  date: string;
  timezone: string;
  user: string;
  createdAt: string;
  files: {
    agentInput: "agent-input.md";
    rawGithub: "raw.github.json";
    normalizedWorklog: "normalized.worklog.json";
    summaryOutput: "summary.md";
  };
};

export function buildManifest(input: { day: NormalizedDay; bundleDir: string; now?: Date }): BundleManifest {
  return {
    schemaVersion: "2.0",
    bundleDir: input.bundleDir,
    date: input.day.date,
    timezone: input.day.timezone,
    user: input.day.user,
    createdAt: (input.now ?? new Date()).toISOString(),
    files: {
      agentInput: "agent-input.md",
      rawGithub: "raw.github.json",
      normalizedWorklog: "normalized.worklog.json",
      summaryOutput: "summary.md"
    }
  };
}
