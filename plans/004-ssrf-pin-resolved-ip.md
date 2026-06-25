# Plan 004: Close the SSRF DNS-rebinding window in paper ingestion

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. **Part A (tests) is low-risk and must be completed; Part B (the
> network change) is higher-risk — honor its STOP conditions and do not improvise
> a large rewrite.** When done, update the status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 7672494..HEAD -- server/src/lib/ssrf.ts server/src/lib/paper-ingest.ts`
> If either file changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (network I/O path; see Part B)
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `7672494`, 2026-06-25

## Why this matters

The Orientador ingests papers by fetching arbitrary URLs returned by web search
(`server/src/lib/paper-ingest.ts`). Before fetching, `resolvePublicUrl`
(`server/src/lib/ssrf.ts`) resolves the hostname and rejects the URL if any
resolved address is private/loopback/link-local — good. But the actual fetch is
then issued **by hostname** (`fetch(safe.toString(), ...)`), which performs its
**own** DNS lookup. Between our validating lookup and the fetch's lookup, a
hostname under attacker control (short TTL, or a round-robin mixing public and
private answers) can resolve to a private IP — a classic DNS-rebinding TOCTOU,
letting a crafted source URL reach internal services. Redirect-based SSRF is
already handled (`redirect: "manual"` re-validates each hop), and the IPv4-mapped
-IPv6 literal bypass is already closed — this plan addresses only the
validate-by-hostname / fetch-by-hostname gap.

There is currently **no test** exercising `ssrf.ts` at all; Part A adds that
safety net before Part B touches the fetch path.

## Current state

- `server/src/lib/ssrf.ts` — `ipBlocked(ip)` classifies private/loopback/link-local
  ranges (IPv4, IPv6, and `::ffff:` mapped forms); `resolvePublicUrl(raw)` parses
  the URL, rejects non-http(s), and for a hostname does
  `lookup(host, { all: true })` then returns the URL only if **no** resolved
  address is blocked. `ipBlocked` is **not exported** today.

  ```ts
  // server/src/lib/ssrf.ts (current, abridged)
  function ipBlocked(ip: string): boolean { /* ranges */ }
  export async function resolvePublicUrl(raw: string): Promise<URL | null> {
    // ...parse, protocol check...
    if (isIP(host)) return ipBlocked(host) ? null : url;
    const addrs = await lookup(host, { all: true });
    if (addrs.length === 0 || addrs.some((a) => ipBlocked(a.address))) return null;
    return url;
  }
  ```

- `server/src/lib/paper-ingest.ts:35-58` — `safeFetch` loops over redirects,
  calls `resolvePublicUrl(current)`, then **fetches by hostname**:

  ```ts
  async function safeFetch(start: string): Promise<Response | null> {
    let current = start;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const safe = await resolvePublicUrl(current);
      if (!safe) return null;
      const res = await fetch(safe.toString(), {        // <-- re-resolves DNS here
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0 SkywriteBot" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return null;
        current = new URL(location, safe).toString();
        continue;
      }
      return res;
    }
    return null;
  }
  ```
  Constants: `MAX_BYTES = 20*1024*1024`, `FETCH_TIMEOUT_MS = 40_000`, `MAX_REDIRECTS = 5`.

- **Caller surface that must be preserved** — `safeFetch`'s returned `Response` is
  consumed via `.status`, `.ok`, `.headers.get("location"|"content-type"|"content-length")`,
  `.text()`, `.arrayBuffer()`, and **`.body.getReader()`** (streaming byte cap in
  `readCapped`). Any replacement must expose all of these.

- Runtime: server dev is `tsx` (Node), `start` is `bun src/index.ts` (Bun). The
  pinning technique in Part B must work under whatever runs in production — verify
  before relying on it (see STOP conditions).

## Commands you will need

| Purpose          | Command                                      | Expected on success |
|------------------|----------------------------------------------|---------------------|
| Server typecheck | `cd server && bun run typecheck`             | exit 0 |
| SSRF unit test   | `cd server && bun test test/ssrf.test.ts`    | all pass |
| Full server test | `cd server && bun test`                      | all pass |

## Scope

**In scope**:
- `server/src/lib/ssrf.ts` (export `ipBlocked`; add a pinned-resolve helper)
- `server/src/lib/paper-ingest.ts` (use the pinned resolution in `safeFetch`)
- `server/test/ssrf.test.ts` (create)
- `plans/README.md` (status row)

**Out of scope**:
- The redirect loop structure, the `User-Agent`, timeout, and `MAX_*` constants — keep them.
- `robots.txt` handling and the rest of `paper-ingest.ts` (the cache, `readCapped`, parsing).
- Do NOT relax any existing range in `ipBlocked` — only export it and add validation.

## Git workflow

- Branch: `advisor/004-ssrf-pin`.
- Commit suggestion: `fix(security): pin validated IP for paper fetch to close DNS-rebinding window`.
- Do NOT push or open a PR unless instructed.

## Steps

### Part A — Characterization tests (do this fully first; low risk)

### Step 1: Export `ipBlocked` and test it

In `server/src/lib/ssrf.ts`, change `function ipBlocked` to `export function ipBlocked`.
(No behavior change.)

Create `server/test/ssrf.test.ts` (plain `bun:test`, no DB), modelled on
`server/test/citation-integrity.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { ipBlocked, resolvePublicUrl } from "../src/lib/ssrf.js";

describe("ipBlocked", () => {
  test("blocks private/loopback/link-local IPv4", () => {
    for (const ip of ["127.0.0.1", "10.0.0.5", "169.254.169.254", "172.16.0.1", "192.168.1.1", "100.64.0.1"])
      expect(ipBlocked(ip)).toBe(true);
  });
  test("allows public IPv4", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1"]) expect(ipBlocked(ip)).toBe(false);
  });
  test("blocks IPv6 loopback/ULA/link-local and mapped forms", () => {
    for (const ip of ["::1", "fc00::1", "fd12::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:7f00:1"])
      expect(ipBlocked(ip)).toBe(true);
  });
});

describe("resolvePublicUrl", () => {
  test("rejects non-http protocols", async () => {
    expect(await resolvePublicUrl("file:///etc/passwd")).toBeNull();
    expect(await resolvePublicUrl("ftp://example.com")).toBeNull();
  });
  test("rejects a literal private IP host", async () => {
    expect(await resolvePublicUrl("http://127.0.0.1/x")).toBeNull();
    expect(await resolvePublicUrl("http://169.254.169.254/latest/meta-data")).toBeNull();
  });
});
```

**Verify**: `cd server && bun test test/ssrf.test.ts` → all pass; `cd server && bun run typecheck` → exit 0.

### Part B — Pin the validated IP at connection time (higher risk)

### Step 2: Decide the pinning mechanism for this runtime

The fix is to ensure the IP we **validated** is the IP we **connect to**, so no
second, unvalidated DNS lookup happens. Determine which is available in the
production runtime and pick the first that works:

- **Option B1 (preferred, Node/undici):** issue the request with a custom
  `lookup` that re-runs `ipBlocked` on the address being connected to and errors
  if blocked. With Node's global fetch (undici) this is done via a dispatcher
  `Agent({ connect: { lookup } })`. With `node:https`/`node:http`, pass `{ lookup }`
  to the request options. The `lookup` callback is the actual connection-time
  gate — this closes the TOCTOU because validation and connection use the same
  resolution.
- **Option B2 (portable):** in `resolvePublicUrl`, return both the URL and the
  validated address list; in `safeFetch`, perform the request through
  `node:https`/`node:http` `get(url, { lookup: pinnedLookup })`, where
  `pinnedLookup` returns one of the **pre-validated** addresses (and still calls
  `ipBlocked` defensively). Adapt the Node response to the `Response`-like surface
  the callers need (`status`, `ok`, `headers.get`, `text`, `arrayBuffer`, and a
  web `body` via `import { Readable } from "node:stream"; Readable.toWeb(res)`).

Write a tiny probe first to learn what the runtime supports — e.g. confirm
`node:https`’s `get` accepts a `lookup` option and that `Readable.toWeb` exists —
before committing to B2's adapter.

**STOP and report (do not force it)** if neither B1 nor B2 works cleanly in the
production runtime without a large rewrite of `readCapped`/the streaming path. In
that case, deliver Part A (the tests) plus a short written recommendation, and
leave `safeFetch` unchanged. A half-working fetch path is worse than the current
state.

### Step 3: Implement the chosen mechanism

Keep `safeFetch`'s redirect loop, `MAX_REDIRECTS`, `FETCH_TIMEOUT_MS`, headers, and
return contract identical. The only change is that each hop connects to a
pre-validated IP via the pinned `lookup`. Reuse the exported `ipBlocked` inside the
`lookup` so the connected address is re-checked. Do not change callers in
`paper-ingest.ts` beyond `safeFetch` (and `resolvePublicUrl` if B2 needs it to
return the address list).

**Verify**: `cd server && bun run typecheck` → exit 0; `cd server && bun test` → all pass.

### Step 4: Add a pinning regression test if feasible

If you can do it without external network flakiness, add a test that a hostname
resolving to a private address is refused at fetch time (e.g. point `safeFetch`
at a URL whose host resolves to loopback via the OS hosts file, or inject a stub
`lookup`). If a deterministic test is not feasible without network mocking
infrastructure that doesn't exist here, document why in your report and rely on
the Part A unit tests plus manual reasoning. Do not add a flaky network-dependent test.

**Verify**: `cd server && bun test` → all pass (no new flaky test introduced).

## Test plan

- `server/test/ssrf.test.ts` (Part A): `ipBlocked` range coverage (IPv4, IPv6,
  mapped) + `resolvePublicUrl` protocol and literal-private-host rejection. These
  are deterministic and must pass.
- Optional pinning regression (Part B, Step 4) only if it can be made deterministic.
- Structural pattern: `server/test/citation-integrity.test.ts`.
- Verification: `cd server && bun test` all pass.

## Done criteria

ALL must hold:

- [ ] `ipBlocked` is exported from `server/src/lib/ssrf.ts`
- [ ] `server/test/ssrf.test.ts` exists and passes
- [ ] `cd server && bun run typecheck` exits 0; `cd server && bun test` all pass
- [ ] EITHER `safeFetch` connects only to a pre-validated IP via a connection-time `lookup` that re-checks `ipBlocked` (Part B done), OR Part B is documented as STOPPED-for-review with Part A delivered
- [ ] No `MAX_*`/timeout/redirect/User-Agent behavior changed; no out-of-scope file modified (`git status`)
- [ ] `plans/README.md` status row for 004 updated (DONE if Part B landed; BLOCKED with the reason if Part B was stopped)

## STOP conditions

Stop and report back (do not improvise) if:

- `safeFetch` or `resolvePublicUrl` no longer matches the "Current state" excerpts (drift).
- The production runtime supports neither B1 nor B2 without rewriting the
  streaming byte-cap path (`readCapped` / `res.body.getReader()`) — deliver Part A
  and recommend, do not force a large rewrite.
- Any change would weaken an existing `ipBlocked` range or the `redirect: "manual"` revalidation.
- A verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Reviewer should confirm the connection-time `lookup` actually runs `ipBlocked`
  on the connected address (the whole point), and that redirects still re-validate.
- If the project later moves ingestion off `fetch` entirely (e.g. an HTTP client
  with built-in SSRF guards), this hand-rolled pinning can be retired.
- Defense-in-depth already present and unchanged: `redirect: "manual"` per-hop
  revalidation, 20 MB / 40 s caps, `categories=science` search scoping. This plan
  only closes the rebinding window.
