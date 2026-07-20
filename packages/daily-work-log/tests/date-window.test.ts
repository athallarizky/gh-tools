import { describe, expect, it } from "vitest";
import { getUtcDateWindow } from "../src/date-window.js";

describe("getUtcDateWindow", () => {
  it("converts an Asia/Jakarta local date to UTC boundaries", () => {
    const result = getUtcDateWindow("2026-05-25", "Asia/Jakarta");

    expect(result).toEqual({
      localDate: "2026-05-25",
      timezone: "Asia/Jakarta",
      fromIso: "2026-05-24T17:00:00.000Z",
      toIso: "2026-05-25T17:00:00.000Z"
    });
  });

  it("throws for an invalid date", () => {
    expect(() => getUtcDateWindow("25-05-2026", "Asia/Jakarta")).toThrow("Date must use YYYY-MM-DD format");
  });

  it("throws for an invalid timezone", () => {
    expect(() => getUtcDateWindow("2026-05-25", "Invalid/Zone")).toThrow("Invalid timezone");
  });
});
