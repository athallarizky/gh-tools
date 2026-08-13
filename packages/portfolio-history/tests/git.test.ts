import { describe, expect, it } from "vitest";
import { parseLogOutput } from "../src/git.js";

describe("parseLogOutput", () => {
  it("parses commit headers and numstat files", () => {
    const output = [
      "\u001fabc123\u001eAtha\u001eatha@example.com\u001e2024-01-15T10:00:00+07:00\u001eFix login",
      "20\t5\tsrc/login.ts",
      "1\t0\tREADME.md",
      "\u001fdef456\u001eAtha\u001eatha@example.com\u001e2024-01-16T10:00:00+07:00\u001eAdd tests",
      "10\t2\tsrc/login.test.ts",
      ""
    ].join("\n");

    const commits = parseLogOutput(output);

    expect(commits).toHaveLength(2);
    expect(commits[0]).toMatchObject({
      sha: "abc123",
      author: "Atha",
      email: "atha@example.com",
      subject: "Fix login"
    });
    expect(commits[0]?.files).toEqual([
      { path: "src/login.ts", additions: 20, deletions: 5 },
      { path: "README.md", additions: 1, deletions: 0 }
    ]);
  });

  it("returns an empty array for blank output", () => {
    expect(parseLogOutput("")).toEqual([]);
  });

  it("handles binary files with dash numstat values", () => {
    const output = [
      "\u001fabc123\u001eAtha\u001eatha@example.com\u001e2024-01-15T10:00:00+07:00\u001eAdd image",
      "-\t-\timage.png",
      ""
    ].join("\n");

    const commits = parseLogOutput(output);

    expect(commits[0]?.files).toEqual([
      { path: "image.png", additions: 0, deletions: 0 }
    ]);
  });
});
