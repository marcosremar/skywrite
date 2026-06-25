import { describe, expect, test } from "vitest";
import { formatTime } from "./formatTime";

describe("formatTime", () => {
  const date = new Date("2026-06-25T14:30:00");

  test("formats with a valid locale", () => {
    expect(formatTime(date, "pt-BR")).toMatch(/\d{2}:\d{2}/);
  });

  test("falls back instead of throwing on a structurally invalid locale", () => {
    expect(() => formatTime(date, "!!!bad")).not.toThrow();
    expect(formatTime(date, "!!!bad")).toMatch(/\d{1,2}:\d{2}/);
  });
});
