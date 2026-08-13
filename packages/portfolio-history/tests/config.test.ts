import { describe, expect, it } from "vitest";
import { parseConfig } from "../src/config.js";

describe("parseConfig", () => {
  it("accepts valid options", () => {
    expect(
      parseConfig({
        reposDir: "./org-repos",
        outputDir: "./output",
        since: "2024-01-01",
        until: "2024-12-31",
        debug: false
      })
    ).toMatchObject({
      reposDir: "./org-repos",
      outputDir: "./output",
      since: "2024-01-01",
      until: "2024-12-31"
    });
  });

  it("rejects an invalid date", () => {
    expect(() =>
      parseConfig({
        reposDir: "./org-repos",
        outputDir: "./output",
        since: "01-01-2024",
        until: "2024-12-31",
        debug: false
      })
    ).toThrow();
  });
});
