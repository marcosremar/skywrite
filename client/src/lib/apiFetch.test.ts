import { describe, expect, test, vi, afterEach } from "vitest";
import { encodePath, apiFetch, setUnauthorizedHandler } from "./apiFetch";

describe("encodePath", () => {
  test("encodes segments and keeps slashes", () => expect(encodePath("a b/c.md")).toBe("a%20b/c.md"));
  test("encodes each segment", () =>
    expect(encodePath("ç/d e")).toBe(`${encodeURIComponent("ç")}/${encodeURIComponent("d e")}`));
});

describe("apiFetch unauthorized handling", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    setUnauthorizedHandler(null);
  });

  test("invokes handler on 401 for protected path", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    await apiFetch("/api/projects");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test("skips handler for /api/auth/ paths", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    await apiFetch("/api/auth/me");
    expect(handler).not.toHaveBeenCalled();
  });

  test("does not invoke handler on 200", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    await apiFetch("/api/projects");
    expect(handler).not.toHaveBeenCalled();
  });
});
