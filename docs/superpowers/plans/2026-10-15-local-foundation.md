# PERDTU Local Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Run and verify the existing frontend, API and local PostgreSQL together before visual redesign.

**Architecture:** Preserve the current Next.js frontend and Express API contracts. Keep per-application environment files so Prisma and application commands load configuration consistently. Use the existing Compose database and persistent volume.

**Tech Stack:** Windows PowerShell, Node.js, npm, Next.js, React, Tailwind, Express, TypeScript, Prisma 5, PostgreSQL 16, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-10-15-local-foundation-design.md` (approved).

## Global Constraints

- Keep Next.js, React, Tailwind, Express, TypeScript, Prisma and PostgreSQL.
- Preserve API contracts.
- Preserve any configuration subsequently found on disk.
- Do not delete volumes, reset an existing database, or take over occupied ports.
- Generate a random local JWT secret; never print or commit it.
- Never substitute fake data for a failed database connection or describe compilation as proof of successful end-to-end operation.
- Current Node.js is v20.16.0; verify package engine compatibility before choosing resolved versions. Check official package advisories before retaining a known vulnerable framework version.
- No repository exists: do not initialize Git or attempt commits/worktrees. Record changed files instead.
- Defer redesign, matching/trade UI, semantic AI, uploads and cloud deployment.

## Review Focus

- Existing local environment files must survive setup unchanged (Task 1).
- Dependencies must support the installed Node.js version, or the incompatibility must be reported (Task 1).
- Missing Docker or an occupied port must not trigger resets or replacement of another process (Task 2).
- Unauthorized listing creation and duplicate registration must return their existing defined errors (Task 3).
- HTTP errors and database unavailability must remain distinguishable from successful startup (Tasks 2–4).

---

### Task 1: Reproducible dependencies, configuration and compilation

**Files:**
- Modify if validation requires: `apps/api/prisma/schema.prisma`, `apps/api/package.json`, `apps/api/src/index.ts`, `apps/api/tsconfig.json`, `apps/web/package.json`.
- Create: `apps/api/package-lock.json`, `apps/web/package-lock.json`, `apps/api/.env.example`, `apps/web/.env.example`.
- Create locally only if absent: `apps/api/.env`, `apps/web/.env.local`.
- Modify: `.env.example`, `.gitignore`, `README.md` to document canonical per-app configuration.

**Interfaces:**
- Consumes: current package scripts and Prisma models.
- Produces: `apps/api/.env` loaded by dotenv and Prisma, with DATABASE_URL, JWT_SECRET, PORT and WEB_ORIGIN; `apps/web/.env.local` with NEXT_PUBLIC_API_URL. Existing `/api/v1` routes remain unchanged.

- [x] Recheck existing environment files without printing their contents. Preserve their hashes if present; create only missing files with a cryptographically random JWT secret. Example files contain placeholders only; ignore real environment variants while retaining examples.
- [x] Check package engine metadata and official advisories; install compatible versions with `npm.cmd install` separately in each application. Preserve lockfiles. Report restricted network access precisely instead of silently changing package sources.
- [x] Run `npx.cmd --no-install prisma validate` in `apps/api` and record the initial result. If invalid, correct only declaration formatting or demonstrated schema errors while preserving models, fields, relations and defaults.
- [x] Run `npx.cmd --no-install prisma generate`, then `npm.cmd run build` in the API; fix demonstrated compilation failures without changing route contracts. Both commands must exit 0.
- [x] Run `npm.cmd run build` in the web app. Fix demonstrated build errors within the existing pages; require exit 0. Do not introduce an unrelated redesign.
- [x] Confirm original environment hashes are unchanged, lockfiles exist, resolved dependency engine requirements are satisfied, and secret values do not appear in tracked examples or logs. Record modified files; no Git commit is available.

### Task 2: Local PostgreSQL and the initial migration

**Files:**
- Create: `apps/api/prisma/migrations/migration_lock.toml`, `apps/api/prisma/migrations/<timestamp>_init/migration.sql`.
- Modify only if required by an observed failure: `docker-compose.yml`.

**Interfaces:**
- Consumes: validated Prisma schema and local DATABASE_URL from Task 1.
- Produces: a running local database matching the existing seven Prisma models and a replayable initial SQL migration.

- [x] Check listeners on 3000, 4000 and 5432 and `docker info`. If the engine is unavailable, launch the installed Docker Desktop executable with `Start-Process -WindowStyle Hidden`; poll in short intervals, with progress updates. Record a persistent engine failure without modifying system configuration.
- [x] Confirm DATABASE_URL targets this local development database without logging credentials. Inspect existing Compose resources and database state before applying schema changes. If an unrelated listener or populated incompatible database exists, report it and continue unaffected checks; never reset it.
- [x] Run `docker compose up -d postgres` from the project root, then `docker compose exec -T postgres pg_isready -U perdtu -d perdtu`. Expected: accepting connections. Redis is optional and need not start.
- [x] Run `npx.cmd --no-install prisma migrate dev --name init` in the API only against the verified local development database. Decline any reset prompt. If PostgreSQL is unavailable, generate the initial SQL offline with Prisma migrate diff from empty to the schema and mark application unverified.
- [x] Run `npx.cmd --no-install prisma migrate status`. Expected: database schema up to date. Inspect migration SQL for the seven application tables and indexes. A failed database connection is a blocked runtime check, not a passing migration.

### Task 3: Integration checks for existing API behavior

**Files:**
- Create: `apps/api/scripts/smoke.mjs`.
- Modify: `apps/api/package.json` to add `smoke: node scripts/smoke.mjs`.
- Modify `apps/api/src/index.ts` only for failures reproduced by the checks.

**Interfaces:**
- Consumes: API at `http://localhost:4000` (optional PERDTU_SMOKE_API_URL override), schema from Task 2.
- Produces: a repeatable smoke script using built-in Node fetch/assert, with nonzero exit on failure. Creates uniquely named `PERDTU smoke` data only in the local development database; prints no passwords or tokens and performs no broad cleanup.

- [x] Write the integration smoke script before application fixes. Assert GET /health is 200 with status ok; POST /api/v1/auth/register returns 201 and id; repeating registration returns 409; wrong-password login returns 401; correct login returns 200 and accessToken; GET /api/v1/users/me returns the same id using the token.
- [x] Add assertions that POST /api/v1/items without authorization returns 401; authenticated creation with title `PERDTU smoke item`, description `Local integration smoke listing`, category `Books`, condition `GOOD` returns 201; GET /api/v1/items/:id and GET /api/v1/items?q=PERDTU return that item; GET /api/v1/me/items returns it only under the authenticated owner. Use a UUID in the test email and a fresh random password of at least 10 characters.
- [x] Run the smoke script before starting the API and verify it exits nonzero with a connection error, without dumping request credentials. Then start the API only if its port is free and run the script against PostgreSQL. Record actual failures before modifying code.
- [x] Fix only reproduced blockers and rerun affected checks; require all assertions to pass. Run the API build again only if application code changed. Preserve explicitly labeled smoke records and document this side effect.

### Task 4: Browser verification and Windows handoff

**Files:**
- Modify: `README.md`.
- Create: `docs/LOCAL_VERIFICATION.md` with dated commands, outcomes and blockers, excluding secrets.
- Modify existing `apps/web/app` pages only for reproduced failures that prevent the existing flow.

**Interfaces:**
- Consumes: API and test listing from Task 3; web app at http://localhost:3000.
- Produces: verified startup instructions and a clear distinction between build, HTTP and browser/database results.

- [x] Start the web app on a free port using its existing script. Verify HTTP responses for `/`, `/explore`, `/account`, `/post` and `/items/<created-id>`.
- [x] Use the available browser skill for browser testing. Verify account creation/login, publishing a distinctly labeled test listing, searching for it and opening its details. Confirm visible item data originates from the real API. If browser access is unavailable, record HTTP checks separately and mark interactive behavior unverified.
- [x] Check existing item-detail behavior for an unknown UUID and explore behavior with an unreachable API. Record errors; fix only crashes or misleading results that block these existing flows. If changing application behavior, write the focused regression check before the fix and rerun the affected build/browser check.
- [x] Update README with PowerShell commands from the project root, canonical env file locations, random-secret generation without logging, dependency install, Docker startup, migrations, both app startup commands, optional smoke command and known deferred features. Remove unsupported claims about an existing seed script.
- [x] Record exact pass/fail evidence in `docs/LOCAL_VERIFICATION.md`. Inspect changes for secrets and unintended scope. Report local URLs, running services, labeled test data, remaining blockers and that the supplied UX/UI redesign belongs to the next phase. Do not claim the full marketplace is complete.

## Plan self-review

All eight spec acceptance criteria map to Tasks 1–4. Review Focus cases have explicit checks. Commands use the existing API paths and package layout. No database reset, cloud deployment, Git initialization or redesign is included. Runtime blockers do not prevent completing independent dependency/build/documentation work.

## Execution choice

Recommended: **Native** execution in this session, because these four tasks share installation, environment and running-service state. Alternative: **Subagent-driven**, with isolated task implementation and independent reviews, at additional context and coordination cost. Obtain the user's plan review and execution choice before implementation, per writing-plans.

## Execution outcome ? 2026-10-15

All four task checklists executed, including their documented unavailable-browser fallback. Interactive browser verification remains unverified; do not infer browser correctness from HTTP checks. See docs/LOCAL_VERIFICATION.md for test results, retained records, audit findings, and the final review fix. No Git repository was initialized.
