# PERDTU local foundation

## Intent

Make the existing barter application runnable locally before implementing the supplied PERDTU_UXUI.png design and completing the browser trade journey. The user approved this order on 2026-10-15.

## Scope of this phase

Keep Next.js, React, Tailwind, Express, TypeScript, Prisma and PostgreSQL. Restore reproducible installation, validate the schema, generate the Prisma client, create an initial migration, configure local environment loading, and verify the existing browser/API/database integration. Do not replace the application or add cloud infrastructure.

## Observed starting state

- Node.js v20.16.0 and npm 10.8.1 are installed.
- Docker CLI and Docker Desktop executable exist, but the desktop-linux engine is unavailable.
- No node_modules, lockfiles, local .env, migrations or seed script were found in the project.
- The current directory is not a Git repository; do not assume commits or worktrees are available.
- Root .env.example documents configuration, while commands run inside apps/api and apps/web. Make the configuration loading locations explicit and consistent.
- Prisma schema declarations use compact single-line blocks; validate with the actual Prisma CLI before deciding what needs correction.
- Python matching tests cannot currently run because pytest is absent. The Python prototype is not in the API request path.

## Proposed behavior

### Installation and configuration

Install dependencies for both existing applications and retain generated lockfiles. Check installed package engine requirements against the local Node version and select compatible maintained versions where necessary. Generate a random local JWT secret; never print or commit it. Supply safe examples and exact PowerShell startup instructions. Preserve any configuration subsequently found on disk.

### Database

Use the existing Docker Compose PostgreSQL service and persistent volume. Start Docker Desktop if possible, without opening an interactive terminal window. Do not delete volumes, reset an existing database, or take over occupied ports. Validate the Prisma schema, generate the client, create the initial migration, and apply it only to the configured local development database. Redis remains available in Compose but is not an application requirement in this phase.

### Existing application

Fix setup, schema and compilation errors required to run existing routes. Preserve API contracts. Check home, explore, account, post and item detail routes. Verify registration, login, authenticated listing creation and public retrieval against PostgreSQL using clearly labeled test data. Matching UI, trade UI, visual redesign, uploads, chat, location search and semantic AI are later phases.

### Failure behavior

Report unavailable Docker, network access or dependency downloads precisely. Never substitute fake data for a failed database connection or describe compilation as proof of successful end-to-end operation. Distinguish process health from database connectivity.

## Acceptance criteria

1. Both application dependency installations complete with lockfiles.
2. Prisma validation and client generation succeed.
3. Initial migration is present and applies to the local PostgreSQL instance.
4. Both application builds pass, or specific unresolved failures are recorded.
5. API registration, login, listing creation and retrieval succeed against the database.
6. The frontend serves its existing routes and can retrieve the created listing.
7. README contains accurate Windows setup commands and environment file locations.
8. Final handoff lists verified behavior, remaining blockers and local URLs without exposing secrets.

## Later phases

After local foundation is verified, implement the supplied green/cream visual design and navigation, then connect wishlist, cycle matches, proposals, responses and receipt confirmation. Preserve the distinction between keyword matching and semantic AI. Each phase gets a focused implementation design before changes.

## Alternatives considered

- Reuse and repair the existing stack (selected): retains working API logic and minimizes migration risk.
- Rebuild the application: adds unnecessary reimplementation before the current behavior is verified.
- Build a visual mock with local sample data first: helps visual review but does not establish that real exchanges can work.

## Review

Checked against existing files and the agreed phase order. No user-facing feature expansion is included in this phase. Git commits are unavailable unless a repository is separately initialized; initialization is not part of this scope.
