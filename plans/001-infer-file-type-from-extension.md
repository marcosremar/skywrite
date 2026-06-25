# Plan 001: Infer `FileType` from the file extension at write time

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 7672494..HEAD -- server/src/routes/files.ts server/src/lib server/test/api.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `7672494`, 2026-06-25

## Why this matters

When a file is created through `POST /api/projects/:id/files` without an explicit
`type` field, the server stores it as `FileType.OTHER`. Several feature routes
fetch project files filtered **by `type`** (`MARKDOWN`/`BIBTEX`), so an
`OTHER`-typed markdown or `.bib` file becomes **invisible** to those features:
analysis, the submission-readiness checklist, the feedback report, the writing
assistant, and originality all silently skip it. A user who adds a chapter and
sees "submission ready" may be getting a checklist computed over a subset of
their real document — a correctness/data-integrity bug, not just a cosmetic one.
The PDF build is unaffected because it has an extension fallback; the other
routes do not. Fixing the type at the write boundary (infer it from the path
extension) makes every type-filtering route see the file correctly, with no
change to any caller.

## Current state

- `server/src/routes/files.ts` — the file CRUD router. The create handler defaults `type` to `OTHER`:

  `server/src/routes/files.ts:25-54` (POST `/`):
  ```ts
  filesRouter.post("/", async (req, res) => {
    try {
      const { id } = req.params as { id: string };
      const { path, content, type } = req.body ?? {};

      if (!isSafeRelPath(path)) {
        return res.status(400).json({ error: "Caminho de arquivo invalido" });
      }
      // ...ownership check...
      const name = path.split("/").pop() || path;

      const file = await db.projectFile.create({
        data: {
          projectId: id,
          path,
          name,
          content: content || "",
          type: type || "OTHER",          // <-- BUG: silent OTHER
          sizeBytes: Buffer.byteLength(content || "", "utf8"),
        },
      });
      return res.json({ file });
    } // ...
  ```

  The rename handler (`server/src/routes/files.ts:62-91`) changes `path`/`name`
  but never recomputes `type`, so renaming `notes.txt` → `notes.md` leaves it
  `OTHER`. The PUT handler (`server/src/routes/files.ts:144-174`) updates
  `content` only and does not touch `type` (correct — path is unchanged there).

- The routes that filter by `type` and are therefore affected:
  - `server/src/routes/analyze.ts:22` — `include: { files: { where: { type: "MARKDOWN" } } }`
  - `server/src/routes/report.ts:66` — same MARKDOWN-only filter
  - `server/src/routes/writing.ts:14` — same MARKDOWN-only filter
  - `server/src/routes/originality.ts:16` — same MARKDOWN-only filter
  - `server/src/routes/citations.ts:53,93` — `where: { type: { in: ["MARKDOWN", "BIBTEX"] } }`; `:122` — `type: "BIBTEX"`
  - `server/src/routes/build.ts:194,203,205` — already has an extension fallback
    (`f.type === "MARKDOWN" || f.path.endsWith(".md")`), so build is NOT broken;
    **do not change build.ts.**

- The canonical `FileType` enum (`server/prisma/schema.prisma`):
  ```prisma
  enum FileType { MARKDOWN  YAML  BIBTEX  LATEX  IMAGE  PDF  OTHER }
  ```

- Repo convention for the type literal — scaffolding sets it as a const literal,
  e.g. `server/src/lib/default-files.ts`: `type: "MARKDOWN" as const`. The Prisma
  client accepts these string literals for the `FileType` column.

- Path-safety convention: request paths are validated by `isSafeRelPath` from
  `server/src/lib/safe-path.ts` before any use — keep that call exactly where it
  is. The new helper is **only** a type classifier; it does no path validation.

## Commands you will need

| Purpose   | Command                                            | Expected on success     |
|-----------|----------------------------------------------------|-------------------------|
| Typecheck | `cd server && bun run typecheck`                   | exit 0, no errors       |
| Tests     | `cd server && bun test test/file-type.test.ts`     | all pass                |
| Full tests| `cd server && bun test`                            | all pass (275+ existing)|

(The server test suite needs a running PostgreSQL with `DATABASE_URL` set and the
schema migrated/seeded — the same environment `bun test` already uses in CI. If
the DB is unavailable, the integration tests cannot run; see STOP conditions.)

## Scope

**In scope** (the only files you should modify or create):
- `server/src/lib/file-type.ts` (create)
- `server/src/routes/files.ts` (use the helper in POST and rename)
- `server/test/file-type.test.ts` (create — unit test for the helper)
- `server/test/api.test.ts` (add 2 integration tests)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch, even though they look related):
- `server/src/routes/build.ts` — already resilient via extension fallback; changing it is needless risk.
- The MARKDOWN/BIBTEX `where` filters in analyze/report/writing/originality/citations — they become correct once stored types are right; do not weaken them to extension matching.
- Any Prisma schema/migration change — the enum already has every type we need.
- The PUT content-update handler — path doesn't change there, so type must not change.

## Git workflow

- Branch: `advisor/001-infer-file-type` (the repo commits directly to `main` with
  Conventional-Commit-style messages, e.g. `fix: ...` — see `git log --oneline -5`).
- Commit message suggestion: `fix(files): infer FileType from extension instead of defaulting to OTHER`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the extension→FileType helper

Create `server/src/lib/file-type.ts`:

```ts
import type { FileType } from "@prisma/client";

const EXTENSION_TYPE: Record<string, FileType> = {
  md: "MARKDOWN",
  markdown: "MARKDOWN",
  yaml: "YAML",
  yml: "YAML",
  bib: "BIBTEX",
  tex: "LATEX",
  png: "IMAGE",
  jpg: "IMAGE",
  jpeg: "IMAGE",
  gif: "IMAGE",
  webp: "IMAGE",
  svg: "IMAGE",
  pdf: "PDF",
};

export function fileTypeFromPath(path: string): FileType {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TYPE[ext] ?? "OTHER";
}
```

If `@prisma/client` does not export a `FileType` type in this repo, use a string
union instead: `type FileType = "MARKDOWN" | "YAML" | "BIBTEX" | "LATEX" | "IMAGE" | "PDF" | "OTHER";`
and return those literals. Confirm which works with the typecheck in Step 4.

**Verify**: `cd server && bun run typecheck` → exit 0.

### Step 2: Use the helper in the POST create handler

In `server/src/routes/files.ts`, import the helper at the top with the other
`../lib/*` imports:
```ts
import { fileTypeFromPath } from "../lib/file-type.js";
```
(Match the existing `.js` import-extension convention used throughout
`server/src/routes/files.ts`.)

Then in the POST `/` handler, replace:
```ts
        type: type || "OTHER",
```
with:
```ts
        type: type || fileTypeFromPath(path),
```
An explicit `type` in the request body still wins (callers that already pass a
type are unchanged); only the silent `OTHER` default changes.

**Verify**: `cd server && bun run typecheck` → exit 0.

### Step 3: Recompute type on rename (extension may change)

In the rename handler (`server/src/routes/files.ts:62-91`), the update currently
sets `path`, `name`, `updatedAt`. Add `type` so a rename that changes the
extension reclassifies the file. Find the `db.projectFile.update({ ... data: { path: newPath, name: newName, updatedAt: new Date() } })`
call and add `type: fileTypeFromPath(newPath)` to its `data`.

Do NOT change anything else in the rename handler (the reference-rewriting block stays as-is).

**Verify**: `cd server && bun run typecheck` → exit 0.

### Step 4: Unit-test the helper

Create `server/test/file-type.test.ts`, modelled on the structure of existing
unit tests like `server/test/citation-integrity.test.ts` (plain `bun:test`,
no DB):

```ts
import { describe, expect, test } from "bun:test";
import { fileTypeFromPath } from "../src/lib/file-type.js";

describe("fileTypeFromPath", () => {
  test("markdown", () => {
    expect(fileTypeFromPath("chapters/01-intro.md")).toBe("MARKDOWN");
    expect(fileTypeFromPath("notes.markdown")).toBe("MARKDOWN");
  });
  test("bibtex / yaml / latex", () => {
    expect(fileTypeFromPath("references.bib")).toBe("BIBTEX");
    expect(fileTypeFromPath("metadata.yaml")).toBe("YAML");
    expect(fileTypeFromPath("a.yml")).toBe("YAML");
    expect(fileTypeFromPath("preamble.tex")).toBe("LATEX");
  });
  test("image / pdf", () => {
    expect(fileTypeFromPath("media/fig.PNG")).toBe("IMAGE");
    expect(fileTypeFromPath("out.pdf")).toBe("PDF");
  });
  test("unknown and no extension default to OTHER", () => {
    expect(fileTypeFromPath("notes.txt")).toBe("OTHER");
    expect(fileTypeFromPath("Makefile")).toBe("OTHER");
  });
});
```

**Verify**: `cd server && bun test test/file-type.test.ts` → all pass.

### Step 5: Integration test the regression

Add a test to `server/test/api.test.ts` inside the existing
`describe("projects and files", ...)` block (it already has helpers `api`,
`loginDemo`, and a `projectId`; the existing file CRUD test around
`server/src/routes/files.ts` usage POSTs to `/api/projects/${projectId}/files`).

Add a test that creates a markdown file **without** a `type` field and asserts
the stored type is `MARKDOWN` (this is the exact regression):

```ts
test("file created without type is classified by extension", async () => {
  const cookie = await loginDemo();
  const create = await api("POST", `/api/projects/${projectId}/files`, {
    cookie,
    body: { path: "chapters/99-extra.md", content: "# Extra\n\ntexto" },
  });
  expect(create.status).toBe(200);
  expect(create.json.file.type).toBe("MARKDOWN");

  const read = await api("GET", `/api/projects/${projectId}/files/chapters/99-extra.md`, { cookie });
  expect(read.json.type).toBe("MARKDOWN");
});
```

If the block does not expose a usable `projectId`/`cookie` in scope, create a
fresh project at the top of the test the same way the surrounding tests do, and
push its id into `createdProjectIds` for cleanup (follow the existing pattern in
the file).

**Verify**: `cd server && bun test test/api.test.ts` → all pass, including the new test.

### Step 6: Full suite

**Verify**: `cd server && bun test` → all pass (the existing 275+ tests plus the new ones; zero failures). `cd server && bun run typecheck` → exit 0.

## Test plan

- New unit test `server/test/file-type.test.ts`: every extension branch + the
  OTHER fallback (no extension, unknown extension, uppercase extension).
- New integration test in `server/test/api.test.ts`: POST a `.md` file with no
  `type` → stored as `MARKDOWN` (the regression). Optionally a second: POST a
  `.bib` with no type → `BIBTEX`.
- Structural pattern to follow: unit test like
  `server/test/citation-integrity.test.ts`; integration like the existing file
  CRUD tests in `server/test/api.test.ts`.
- Verification: `cd server && bun test` → all pass including the new tests.

## Done criteria

ALL must hold:

- [ ] `cd server && bun run typecheck` exits 0
- [ ] `cd server && bun test` exits 0; `test/file-type.test.ts` exists and passes; the new api.test.ts case passes
- [ ] `grep -n 'type || "OTHER"' server/src/routes/files.ts` returns **no matches**
- [ ] `grep -n 'fileTypeFromPath' server/src/routes/files.ts` shows it used in POST and rename
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 001 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The POST handler in `server/src/routes/files.ts` no longer contains
  `type: type || "OTHER"` (someone already changed it — the codebase drifted).
- `@prisma/client` exports neither a usable `FileType` type nor accepts the
  string literals at typecheck (the union-type fallback in Step 1 also fails).
- The server test suite cannot run because no PostgreSQL/`DATABASE_URL` is
  available — report that the integration test could not be executed (the unit
  test in Step 4 still must pass).
- Any verification fails twice after a reasonable fix attempt.

## Maintenance notes

- If a new `FileType` enum value is added later (e.g. `CSV`), add its extension
  to `EXTENSION_TYPE` in `server/src/lib/file-type.ts`.
- Reviewer should confirm the change is at the **write boundary** only and that
  no type-filtering `where` clause was loosened (those filters are correct once
  stored types are right; weakening them would re-hide the bug behind extension
  matching and lose the type as source of truth).
- Deferred out of scope: backfilling existing rows already stored as `OTHER`.
  If the production DB has mis-typed files from before this fix, a one-off
  `UPDATE`/script keyed on extension can be written separately; this plan only
  prevents new mis-typing.
