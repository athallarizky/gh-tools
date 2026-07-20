import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildManifest } from "./context/manifest.js";
import type { NormalizedDay } from "./model.js";

export type WriteContextBundleInput = {
  outputDir: string;
  day: NormalizedDay;
  raw: unknown;
  agentInput: string;
};

export type WriteContextBundleResult = {
  bundleDir: string;
  agentInputPath: string;
  manifestPath: string;
  rawJsonPath: string;
  normalizedJsonPath: string;
};

export async function writeContextBundle(input: WriteContextBundleInput): Promise<WriteContextBundleResult> {
  const bundleDir = join(input.outputDir, "runs", input.day.date);
  const agentInputPath = join(bundleDir, "agent-input.md");
  const manifestPath = join(bundleDir, "manifest.json");
  const rawJsonPath = join(bundleDir, "raw.github.json");
  const normalizedJsonPath = join(bundleDir, "normalized.worklog.json");
  const manifest = buildManifest({ day: input.day, bundleDir });

  await mkdir(bundleDir, { recursive: true });
  await writeFile(agentInputPath, ensureTrailingNewline(input.agentInput), "utf8");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(rawJsonPath, `${JSON.stringify(input.raw, null, 2)}\n`, "utf8");
  await writeFile(normalizedJsonPath, `${JSON.stringify(input.day, null, 2)}\n`, "utf8");

  return { bundleDir, agentInputPath, manifestPath, rawJsonPath, normalizedJsonPath };
}

function ensureTrailingNewline(value: string): string {
  return value.endsWith("\n") ? value : `${value}\n`;
}
