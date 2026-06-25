# Plan 002: Add a repo-root `CLAUDE.md` agent guide

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 7672494..HEAD -- README.md SPEC.md package.json server/package.json client/package.json`
> If the build/test commands in those files changed since this plan was written,
> reconcile the "Commands" section below against the live scripts before writing
> the file.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `7672494`, 2026-06-25

## Why this matters

The repo has rich human docs (`SPEC.md`, `ROADMAP.md`) but no `CLAUDE.md` or
`AGENTS.md` at the root. Coding agents working here have to re-derive the build,
test, lint, and typecheck commands and the repo conventions every session — and
the most important convention (a strict no-comments / simplest-solution code
style) lives only in the operator's global config, not in the repo, so it isn't
visible to a fresh agent or a CI bot. A concise, accurate `CLAUDE.md` makes every
future agent task (including the other plans in this directory) faster and more
consistent. This is purely additive documentation; it changes no code.

## Current state

- No `CLAUDE.md` or `AGENTS.md` at the repo root (verified absent).
- Verified facts to encode (do not guess — these came from the actual config):
  - **Workspaces**: root `package.json` declares `"workspaces": ["client", "server"]`; package manager is **Bun**.
  - **Server** (`server/package.json` scripts): `dev` = `tsx watch src/index.ts`; `typecheck` = `tsc --noEmit`; `test` = `bun test`; `db:migrate`/`db:generate`/`db:seed` via Prisma; eval scripts `eval:citations`, `eval:verdicts`.
  - **Client** (`client/package.json` scripts): `dev` = `vite --port 5175`; `build` = `tsc -b && vite build`; `typecheck` = `tsc -b`; `test` = `vitest run`; `test:e2e` = `playwright test`.
  - **Stack**: client = Vite 6 + React 19 + Tailwind 4 + Radix + CodeMirror 6 (port 5175); server = Express 4 + Prisma 5 + PostgreSQL (port 4000); external `ai-gateway` (port 9012) for search + LLM; PDF via pandoc → tectonic; auth via JWT in an httpOnly cookie.
  - **CI** (`.github/workflows/ci.yml`): three jobs — server (typecheck + `bun test` against ephemeral Postgres), client (typecheck + vitest + build), e2e (Playwright).
  - **Gotchas already documented in `SPEC.md`**: use `127.0.0.1` not `localhost` for the gateway (Node resolves `localhost` to IPv6); `vite.config.ts` needs `resolve.dedupe` for `@codemirror/*` + `@lezer/*` or live preview breaks.
- **Operator code style** (must be encoded — it is the single highest-value
  convention and currently lives outside the repo): no comments except
  license/lint-pragma/shebang; simplest solution that works, no speculative
  abstraction; descriptive names + small functions + early returns; token-economical
  (smallest correct change). Source of truth that this should mirror.

## Commands you will need

| Purpose          | Command                          | Expected on success |
|------------------|----------------------------------|---------------------|
| Confirm absence  | `ls CLAUDE.md AGENTS.md`         | "No such file" for both, before you start |
| Server typecheck | `cd server && bun run typecheck` | exit 0 (sanity that the doc's commands are real) |
| Client typecheck | `cd client && bun run typecheck` | exit 0 |

## Scope

**In scope** (only file to create):
- `CLAUDE.md` (repo root, create)
- `plans/README.md` (status row)

**Out of scope**:
- Do NOT edit `SPEC.md`, `ROADMAP.md`, or `README.md` — `CLAUDE.md` links to them, it does not duplicate them.
- Do NOT add an `AGENTS.md` as well; a single `CLAUDE.md` is the target. (If the team later wants both, `AGENTS.md` can be a one-line pointer to `CLAUDE.md` — out of scope here.)
- No code, config, or CI changes.

## Git workflow

- Branch: `advisor/002-claude-md`.
- Commit message suggestion: `docs: add repo CLAUDE.md for agent onboarding`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Create `CLAUDE.md` at the repo root

Write the file with exactly this content (it is intentionally concise — agents
read it every session; keep it under ~60 lines):

```markdown
# Skywrite — Agent Guide

Academic thesis/article writing SaaS: Markdown live-preview editor, academic PDF
export, and an AI "Orientador" that searches the web and verifies claims against
source full-text. See `SPEC.md` for the system spec and `ROADMAP.md` for scope
decisions (the "Ainda fora de escopo" list is explicitly deferred — do not build
those without a decision).

## Layout (Bun workspaces: client, server)

- `client/` — Vite 6 + React 19 + Tailwind 4 + Radix + CodeMirror 6 (port 5175).
- `server/` — Express 4 + Prisma 5 + PostgreSQL (port 4000).
- External `ai-gateway` (port 9012) provides web search + LLM. PDF: pandoc → tectonic.

## Commands

Server (`cd server`):
- `bun run dev` — tsx watch (port 4000)
- `bun run typecheck` — tsc --noEmit
- `bun test` — integration + unit (needs PostgreSQL via DATABASE_URL; CI seeds it)
- `bun run db:migrate` / `db:generate` / `db:seed` — Prisma

Client (`cd client`):
- `bun run dev` — Vite (port 5175)
- `bun run typecheck` — tsc -b
- `bun run test` — vitest
- `bun run test:e2e` — Playwright (needs a running dev server)
- `bun run build` — tsc -b && vite build

Run both: `bun run dev` from the repo root.

## Before you call a change done

Match what CI gates (`.github/workflows/ci.yml`):
- server: `bun run typecheck` + `bun test`
- client: `bun run typecheck` + `bun run test` + `bun run build`
Run the relevant gate and report its result — never claim done without evidence.

## Code style (strict)

- No comments. Code self-explains via names and structure. Only allowed:
  license headers, lint pragmas, shebangs.
- Simplest solution that works. No speculative abstraction, no config for a
  value that never changes. Less code beats more code.
- Descriptive names, small focused functions, early returns over nesting, no
  dead code. Smallest correct change.

## Gotchas

- Use `127.0.0.1`, not `localhost`, for the ai-gateway — Node resolves
  `localhost` to IPv6 and the gateway listens on IPv4.
- `client/vite.config.ts` needs `resolve.dedupe` for `@codemirror/*` and
  `@lezer/*`; without it the editor's live preview silently breaks.
- Routes that read project files filter by `FileType` (MARKDOWN/BIBTEX) — a file
  must be stored with the right `type` or those features skip it.
- `server/.env` is gitignored; never commit secrets. See `server/.env.example`.
```

If any command in the draft no longer matches the live `package.json` scripts
(per the drift check), correct it to match the real script before saving — the
file must be accurate, not aspirational.

**Verify**: `ls CLAUDE.md` → file exists; open it and confirm the command table
matches `server/package.json` and `client/package.json` scripts verbatim.

### Step 2: Sanity-check the documented commands are real

Run the two typecheck commands the doc lists to confirm they exist and the doc
isn't pointing at a nonexistent script.

**Verify**: `cd server && bun run typecheck` → exit 0; `cd client && bun run typecheck` → exit 0.
(If a typecheck fails for reasons unrelated to this doc — i.e. pre-existing
errors — note it in your report but it does not block this docs-only plan.)

## Test plan

No automated tests (documentation only). Verification is: the file exists, its
command table matches the real `package.json` scripts, and the two typecheck
commands it documents actually run.

## Done criteria

ALL must hold:

- [ ] `CLAUDE.md` exists at the repo root
- [ ] Every command in `CLAUDE.md` matches a real script in `server/package.json` / `client/package.json` (no invented scripts)
- [ ] The file is the only non-plan file created (`git status` shows `CLAUDE.md` + `plans/README.md`)
- [ ] `plans/README.md` status row for 002 updated to DONE

## STOP conditions

Stop and report back if:

- A `CLAUDE.md` or `AGENTS.md` already exists at the root (the codebase drifted;
  reconcile rather than overwrite).
- The `package.json` scripts differ so much from the "Current state" facts that
  more than the command table would be wrong — report the mismatch instead of
  guessing.

## Maintenance notes

- Keep `CLAUDE.md` short and command-accurate. When a `package.json` script is
  renamed, update the table in the same change.
- Reviewer should check that no secrets or environment-specific paths leaked in,
  and that the code-style section still matches the operator's intent.
- Deferred: a separate `AGENTS.md` (other tools' convention) pointing to this
  file — add only if the team adopts a non-Claude agent.
