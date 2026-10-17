> Current Wishlist retirement/local AI status: [AI_MATCHING_VERIFICATION.md](AI_MATCHING_VERIFICATION.md). Dated evidence below remains historical.

> Current photo/edit/favourites results: [MEDIA_VERIFICATION.md](MEDIA_VERIFICATION.md). The dated evidence below is retained as history.

# Local verification — 2026-10-15 (Asia/Bangkok)

**Latest update:** the exchange journey and reference-inspired UI have since been implemented. See [EXCHANGE_VERIFICATION.md](EXCHANGE_VERIFICATION.md) for current routes, tests and remaining work. The foundation record below is historical evidence, not the current feature list.

Scope: the approved local foundation spec and plan under `docs/superpowers/`. The PERDTU_UXUI.png visual redesign is a later phase.

## Changes

- Installed both applications and retained their package locks. Next.js is pinned to 15.5.28, React / React DOM to 19.3.1, and the OBS AWS SDK adapters to 3.1152.0. The latter support Node >=20. PostCSS is pinned and overridden to 8.5.30 throughout the frontend tree.
- Corrected invalid single-line Prisma generator, datasource and enum blocks without changing model fields or relations. Initial validation failed with P1012 / 23 errors; corrected validation passed.
- Created API and frontend environment examples in their respective application directories; created missing local files with a random JWT secret without logging its value. Existing environment files were absent. Real files are ignored.
- Started installed Docker Desktop and the existing Compose PostgreSQL service. Verified an empty public schema before applying `20261015141542_init`. No volume deletion or database reset was performed.
- Added repeatable API smoke checks and frontend HTTP regression tests. Fixed missing-item / API-error rendering by rejecting unsuccessful HTTP responses before updating page data; added visible errors and canceled superseded requests.
- Updated Windows setup instructions and removed the unsupported seed-script claim.

## Verified evidence

| Check | Result |
| --- | --- |
| Node / npm | 20.16.0 / 10.8.1 |
| Locked package Node engine compatibility | 0 incompatible packages in either application |
| API and web dependency installation | Passed; lockfiles present |
| Prisma validate | Passed after declaration-format fix |
| Prisma generate | Passed, client 5.22.0 |
| PostgreSQL readiness | Accepting connections |
| Initial migration | Applied; `prisma migrate status` reports up to date |
| API build | Passed after dependency patches |
| Frontend build after error-handling change | Passed; all five application routes generated |
| API smoke | Passed 15 HTTP requests plus data / ownership assertions |
| Frontend regression tests | 5 passed, 0 failed; original fetch behavior failed the 404, 500 and network-message cases |
| Frontend helper against live API | Returned test item and rejected a missing UUID as `Not found.` |
| Frontend HTTP routes after final restart | `/`, `/explore`, `/account`, `/post`, and real `/items/<id>` all returned 200 |
| API browser-origin CORS | Items request from `http://localhost:3000` allowed; real test listing returned |
| Documented `prisma migrate deploy` | Passed; no pending migrations |

Smoke listing from the integration run: `6be8dddd-0a72-4cb5-ae4f-91fee66ab96e`. Two labeled test accounts and this listing were retained. No user data was deleted. HTTP 200 on client-rendered routes confirms serving the page shell, not successful interactive rendering.

## Browser limitation

The supplied browser runtime connected, but browser selection returned `No browser is available` and documented discovery returned `[]`. Interactive account creation, login, posting, search, item navigation, visual layout and responsiveness remain **unverified in a browser**. HTTP checks and loader regression tests are reported separately; no mock database was substituted.

## Dependency audit

- API install audit after patching: **0 vulnerabilities**.
- Frontend audit after PostCSS patching: **7 findings: 5 high, 2 moderate, 0 critical**, in the Tailwind 3 toolchain (`braces`, `chokidar`, `fast-glob`, `micromatch`, `tailwindcss`, `postcss-nested`, `postcss-selector-parser`). The suggested full fix upgrades Tailwind to major version 4. This is deferred to the UI phase to avoid changing the styling architecture during local setup. These findings are not evidence that a production security review has passed.
- Next.js patch selection checked against the [official advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw), which identifies 15.5.28 as a patched version. Audits are point-in-time results, not a guarantee against future advisories.

## Remaining work

- Interactive browser verification once a browser connection is available.
- Implement the supplied visual design and assets, followed by the wishlist / match / trade browser journey.
- Resolve the remaining build-tool dependency advisories during the styling upgrade.
- Python prototype tests remain unrun because pytest is not installed; that prototype is not used by the running API.
- Public deployment, OBS integration, semantic AI, chat, cancellation/disputes and full security review remain outside this phase.

## Local processes

Target URLs are http://localhost:3000 (web) and http://localhost:4000 (API), with PostgreSQL at localhost:5432. Process status and final rebuild results are recorded in the final verification section below. Restart commands are in README.

## Final verification

- Final production build after the HTTP-error fix: passed (Next.js 15.5.28).
- Final frontend test command: 5 passed / 0 failed.
- Final HTTP checks: all five application routes returned 200 after restarting the production preview; API `/health` returned 200 and the listing query confirmed live database connectivity.
- Web preview left running on port 3000; API on port 4000; Compose PostgreSQL running on loopback port 5432. No Redis process was needed.
- Configuration hashes stayed unchanged after initial creation; secrets were neither printed nor copied into documentation.
- Independent review found one important issue in README's setup commands: secret replacement could modify an existing `.env` containing the example marker. Fixed by generating the secret only when creating a missing file, with exclusive file creation. Executed the documented PowerShell commands in an isolated fixture: new files contain a generated secret and a repeated setup preserves an existing file byte for byte, even when a marker is present in a comment. The original command reproduced the failure in the same fixture.
- Reviewer reported no other blocking findings and independently verified all five loader tests, lockfile/manifest consistency, Node engine compatibility and migration/model consistency.
- Interactive browser checks remain deferred because no browser connection was available; no visual or full browser-journey completion is claimed.
- Work was performed in the supplied directory because no Git repository exists; changes are not committed and no commit-based rollback is available. The execution ledger is retained under the ignored `.superpowers/sdd/2026-10-15-local-foundation/` directory.
