# Plan 003: De-duplicate `thesis-analysis` into a shared workspace package

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. This is the **highest-risk plan in this set**
> (cross-toolchain module resolution). Read it fully before starting. When done,
> update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 7672494..HEAD -- client/src/lib/thesis-analysis.ts server/src/lib/thesis-analysis.ts client/src/types/thesis-analysis.ts server/src/types/thesis-analysis.ts`
> If either lib file changed since this plan was written, re-confirm they are
> still identical except for the import path (see "Current state") before moving them.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (cross-toolchain resolution; wide importer blast radius)
- **Depends on**: none (do 002 first only so the executor of this plan has the agent guide)
- **Category**: tech-debt
- **Planned at**: commit `7672494`, 2026-06-25

## Why this matters

`thesis-analysis.ts` (~942 lines of the core analysis/rules engine) and
`types/thesis-analysis.ts` (~383 lines) exist as **two hand-synced copies** — one
in `client/src/` and one in `server/src/`. Today they are identical except for a
single import-path line, but nothing enforces that: a fix applied to one tier can
silently miss the other, and the analysis logic is exactly the kind of code where
a one-sided fix produces a confusing client/server disagreement. The client copy
also ships its full ~942 lines in the Editor route bundle. Consolidating both into
one shared workspace package removes the drift risk entirely and gives a single
source of truth.

This plan has real cross-toolchain risk (Vite, tsc project-references on the
client; tsx/Bun, `tsc --noEmit` on the server must all resolve the new package).
If the wiring proves intractable in your environment, there is a documented
low-risk fallback in "STOP conditions" — take it rather than forcing a half-working
build.

## Current state

- The two lib copies are byte-identical **except the types import path**:
  - `client/src/lib/thesis-analysis.ts:19` → `} from "@/types/thesis-analysis";`
  - `server/src/lib/thesis-analysis.ts:19` → `} from "../types/thesis-analysis";`
  - (`diff client/src/lib/thesis-analysis.ts server/src/lib/thesis-analysis.ts` shows only that line differs.)
- `client/src/types/thesis-analysis.ts` and `server/src/types/thesis-analysis.ts`
  are **byte-identical** (`diff` is empty).
- Exported symbols (from `client/src/lib/thesis-analysis.ts`): `detectSectionType`,
  `extractSections`, `countCitations`, `extractCitationYears`, `countWords`,
  `createSectionChecklist`, `generateSectionFeedback`, `getAllRules`,
  `analyzeRules`, `saveUserRules`, `analyzeCitations`, `analyzeThesis`,
  `analyzeSection`.
- **Browser coupling (important)**: `getAllRules` (line ~627) and `saveUserRules`
  (line ~715) touch `localStorage`, but only **inside the function body**, guarded
  for "client-side only". The server never calls those two — it calls
  `analyzeThesis` / `extractSections`. So importing the module server-side is safe;
  the shared package may contain the localStorage functions as-is. **Verify this
  guard still holds** (no top-level `localStorage`/`window` access) before moving —
  if a `localStorage` reference exists at module top level, STOP (see conditions).
- Consumers that must be re-pointed:
  - Client:
    - `client/src/components/editor/AIAdvisor.tsx:35,41` (types), `:42` (`analyzeThesis, getAllRules, saveUserRules` from `@/lib/thesis-analysis`)
    - `client/src/components/editor/SectionChecklist.tsx:22,23` (types)
    - `client/src/lib/thesis-analysis.test.ts` (unit tests — must keep passing)
    - Any other file matching `@/types/thesis-analysis` or `@/lib/thesis-analysis` (grep in Step 4)
  - Server:
    - `server/src/lib/submission.ts:1` → `extractSections` from `./thesis-analysis.js`
    - `server/src/routes/analyze.ts:4` → `analyzeThesis` from `../lib/thesis-analysis.js`
    - `server/src/routes/report.ts:5,6` → `analyzeThesis` from `../lib/thesis-analysis.js`, type from `../types/thesis-analysis.js`
- Tooling facts:
  - Root `package.json`: `"workspaces": ["client", "server"]`, package manager Bun.
  - Client: `client/tsconfig.json` has `"baseUrl": "."`, `"paths": { "@/*": ["./src/*"] }`; build is `tsc -b && vite build`; `client/vite.config.ts` sets `resolve.alias { "@": src }` and a `resolve.dedupe` list for codemirror/lezer.
  - Server: `dev` = `tsx watch`, `typecheck` = `tsc --noEmit`, imports use explicit `.js` extensions.

## Commands you will need

| Purpose           | Command                                   | Expected on success |
|-------------------|-------------------------------------------|---------------------|
| Install / relink  | `bun install`                             | exit 0, links `@skywrite/shared` |
| Server typecheck  | `cd server && bun run typecheck`          | exit 0 |
| Server tests      | `cd server && bun test`                   | all pass |
| Client typecheck  | `cd client && bun run typecheck`          | exit 0 |
| Client unit tests | `cd client && bun run test`               | all pass (incl. thesis-analysis.test) |
| Client build      | `cd client && bun run build`              | exit 0, emits `client/dist/` |

## Scope

**In scope**:
- `shared/package.json` (create)
- `shared/tsconfig.json` (create, if needed for typecheck)
- `shared/src/thesis-analysis.ts` (move from client/server copies)
- `shared/src/types/thesis-analysis.ts` (move)
- Delete `client/src/lib/thesis-analysis.ts`, `server/src/lib/thesis-analysis.ts`, `client/src/types/thesis-analysis.ts`, `server/src/types/thesis-analysis.ts`
- Move `client/src/lib/thesis-analysis.test.ts` → `shared/src/thesis-analysis.test.ts` (or keep it in client importing the shared package)
- Import-path updates in the consumer files listed above
- `client/package.json`, `server/package.json` (add `@skywrite/shared` dependency)
- Root `package.json` (`"workspaces"` to include `"shared"`)
- `plans/README.md` (status row)

**Out of scope**:
- Do NOT change any analysis logic — this is a pure move + re-wire. The function
  bodies must be byte-for-byte what they were.
- Do NOT touch `vite.config.ts`'s `resolve.dedupe` list (codemirror/lezer) — leave it exactly as is.
- Do NOT split the localStorage functions out (keep the module whole; they are guarded).

## Git workflow

- Branch: `advisor/003-share-thesis-analysis`.
- Commit suggestion: `refactor: extract thesis-analysis into @skywrite/shared workspace`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Create the shared workspace package (TS source, no build step)

Create `shared/package.json`:
```json
{
  "name": "@skywrite/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/thesis-analysis.ts",
    "./types": "./src/types/thesis-analysis.ts"
  }
}
```
Exporting `.ts` directly avoids a build step; Vite, tsx, and Bun all consume TS
source. Add `"shared"` to the root `package.json` `"workspaces"` array
(→ `["client", "server", "shared"]`).

### Step 2: Move the files

- Move `server/src/lib/thesis-analysis.ts` → `shared/src/thesis-analysis.ts`
  (pick the server copy as the base; it differs from the client only by the import line).
- Move `server/src/types/thesis-analysis.ts` → `shared/src/types/thesis-analysis.ts`.
- In `shared/src/thesis-analysis.ts`, set the types import to the colocated path:
  `} from "./types/thesis-analysis";` (no `@/`, no `.js` — same-package relative import of a `.ts` sibling).
- Delete the now-duplicate `client/src/lib/thesis-analysis.ts`,
  `client/src/types/thesis-analysis.ts`, and the server originals you moved.

### Step 3: Add the dependency to both packages and relink

In `client/package.json` and `server/package.json`, add to `dependencies`:
```json
"@skywrite/shared": "workspace:*"
```
Then relink:

**Verify**: `bun install` → exit 0, and `ls node_modules/@skywrite/shared` resolves
to the `shared/` workspace (symlink).

### Step 4: Re-point all consumers

Client — replace import specifiers (the symbols are unchanged):
- `@/lib/thesis-analysis` → `@skywrite/shared`
- `@/types/thesis-analysis` → `@skywrite/shared/types`

Find every occurrence first:
```
grep -rn '@/lib/thesis-analysis\|@/types/thesis-analysis' client/src
```
Update each (at least `AIAdvisor.tsx`, `SectionChecklist.tsx`, and the test file).

Server — replace:
- `../lib/thesis-analysis.js` → `@skywrite/shared` (in `analyze.ts`, `report.ts`)
- `./thesis-analysis.js` → `@skywrite/shared` (in `submission.ts`)
- `../types/thesis-analysis.js` → `@skywrite/shared/types` (in `report.ts`)

Find every occurrence:
```
grep -rn 'thesis-analysis' server/src
```

Move the client unit test `client/src/lib/thesis-analysis.test.ts` to
`shared/src/thesis-analysis.test.ts` and update its import to `./thesis-analysis`
(it currently imports `analyzeThesis` etc. from the local lib). It will run under
whichever workspace's test runner picks it up; if neither does automatically,
leave it in `client/` importing `@skywrite/shared` so `vitest` keeps running it.

### Step 5: Typecheck both packages

The server uses `tsc --noEmit`; the client uses `tsc -b`. If TypeScript cannot
resolve `@skywrite/shared` (e.g. it complains it cannot find the module or refuses
a `.ts` extension in `exports`), you may need to either:
- set the consuming tsconfig `compilerOptions.moduleResolution` to `"bundler"`, or
- add a `paths` mapping (`"@skywrite/shared": ["../shared/src/thesis-analysis.ts"]`, `"@skywrite/shared/types": ["../shared/src/types/thesis-analysis.ts"]`) to the consuming tsconfig.

Make the **smallest** tsconfig change that resolves it; do not restructure project
references. If neither resolves cleanly after a reasonable attempt, STOP (see conditions).

**Verify**: `cd server && bun run typecheck` → exit 0; `cd client && bun run typecheck` → exit 0.

### Step 6: Run every gate

**Verify, all must pass**:
- `cd server && bun test` → all pass
- `cd client && bun run test` → all pass (the moved `thesis-analysis.test` included)
- `cd client && bun run build` → exit 0, emits `client/dist/index.html`

## Test plan

- No new tests. The **existing** `thesis-analysis` unit test must keep passing
  from its new location (it is the regression guard that the move preserved logic).
- The server integration suite (`analyze`, `report`, `submission` routes) exercises
  the server consumers and must stay green.
- Verification: the three gate commands in Step 6 all pass.

## Done criteria

ALL must hold:

- [ ] `shared/src/thesis-analysis.ts` and `shared/src/types/thesis-analysis.ts` exist; the four old copies are deleted
- [ ] `grep -rn 'thesis-analysis' client/src server/src` shows **no** local `@/lib`, `@/types`, `../lib`, or `../types` thesis-analysis imports — only `@skywrite/shared`
- [ ] `cd server && bun run typecheck && bun test` → exit 0, all pass
- [ ] `cd client && bun run typecheck && bun run test && bun run build` → exit 0, all pass
- [ ] No analysis logic changed (`git diff` of the moved file shows only the one types-import line vs the server original)
- [ ] `plans/README.md` status row for 003 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The two lib copies are **no longer** identical-except-import-line at drift-check
  time (they diverged after this plan was written — the merge needs a human decision).
- `thesis-analysis.ts` references `localStorage`/`window`/`document` at module top
  level (not inside a function) — moving it to a server-consumed package would then
  break the server at import time; report this and stop.
- After a reasonable attempt, TypeScript or Vite or tsx cannot resolve
  `@skywrite/shared` (the `.ts`-in-`exports` approach is rejected by a toolchain).
  **Fallback to report (do not implement silently):** instead of a shared package,
  add a tiny guard test that fails CI if the two copies drift — e.g. a `bun:test`
  that reads both files and asserts they are equal after stripping the line-19
  import. That removes the drift risk at near-zero toolchain risk. Recommend it and stop.
- `bun install` is not permitted in your environment (workspace relink impossible) —
  report; the fallback drift-guard test above needs no install.

## Maintenance notes

- After this lands, any change to the analysis engine is made once in
  `shared/src/thesis-analysis.ts`. Reviewer should confirm the move introduced
  **zero** logic changes (diff the moved file against the pre-move server copy).
- If a build step is later wanted for the shared package (e.g. to publish), add a
  `tsup`/`tsc` build and point `exports` at `dist` — out of scope here.
- Watch that the client bundle no longer contains two analysis modules; the move
  should slightly shrink the Editor chunk.
