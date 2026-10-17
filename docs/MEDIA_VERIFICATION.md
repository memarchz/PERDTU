> Current Wishlist retirement/local AI status: [AI_MATCHING_VERIFICATION.md](AI_MATCHING_VERIFICATION.md). Dated evidence below remains historical.

﻿# Listing media, owner management and saved items verification

Verified 2026-10-17, Windows / Node20.16.0 / PostgreSQL16. This supersedes the older documents for Subproject2 status.

Implemented: real single-file uploads and persistent ordered galleries (four photos), listing editing and soft archival, private persistent saved-item favourites, owner management UI, photo-aware publishing recovery, cancellation explanations and responsive layout constraints. Chat and in-app notifications remain Subproject3.

Evidence from final runs:

| Check | Result |
| --- | --- |
| API `npm.cmd test` | 11 passed: matching, decoded storage, transaction-bound proposal creation |
| Frontend `npm.cmd test` | 48 passed: actual HTTP/FormData, auth races, photo state, actual picker removal lifecycle, saved state and page refresh, publish recovery, trade actions |
| API / frontend production builds | Passed; frontend includes saved-items and owner edit routes |
| `npm.cmd run smoke` | 15 real HTTP assertions passed |
| `npm.cmd run smoke:exchange` | 151 real exchange requests passed, including2/3/4-person cycles and competing reservations |
| `npm.cmd run smoke:media` | 101 assertions passed, including aborted multipart, privacy, spoofed/oversize input, gallery order, ownership, tombstones and edit/archive versus acceptance |
| `npm.cmd run smoke:proposal-race` | Two deterministic PostgreSQL interleavings passed: pause proposal after item read, commit PATCH/DELETE, resume proposal. Edit retries with current snapshot; archive rejects409 |
| API restart persistence | Same listing metadata and SHA256-identical WebP bytes after stopping/restarting only the owned API |
| Production HTTP shells | 13 destinations returned200, including detail/edit/saved; this is not interactive verification |
| Migration status | Both forward migrations applied; no reset/drop |
| Data/config preservation | Pre-migration66users/58items/25trades unchanged immediately after migration; real API/frontend environment SHA256 unchanged at completion |
| Dependency audit | API0 advisories; frontend7 existing Tailwind3 build-tree advisories (2moderate/5high); no forced major upgrade |

Independent final review found three Important issues and no Critical findings. All three were reproduced and fixed: proposal creation now uses the same serializable protocol as listing edits; Saved refreshes authoritative state on entry and after owner changes; photo removal now blocks publishing/saving until DELETE settles. Actual-source regression tests observed failure before the frontend fixes; transaction regression and deterministic PostgreSQL tests cover the proposal fix. No Minor findings were deferred.

Interactive limitation: supported Browser selection returned `No browser is available`; discovery returned `[]`. Actual file-picker clicking, rendered desktop/mobile layout, hydration, thumbnail interactions and cross-navigation UI flows remain unverified. No substitute screenshots or browser claims were made. HTTP uploads and generated image fixtures were real.

Storage/setup: files are generated UUID `.webp` files in `backend/storage/uploads`, ignored by version control. Input allows static JPEG/PNG/WebP <=5MiB, <=25million decoded pixels; output is metadata-free WebP <=1600px longest side. Preserve this directory alongside database backups. Original filenames do not determine paths. Unattached uploads remain private; only owned unattached uploads can be explicitly deleted. Attached historical photos stay associated with their listing even after gallery removal. Every public read rechecks listing visibility and uses `private, no-store` plus `nosniff`; archived/draft media returns404.

Apply forward migrations with `npx.cmd prisma migrate deploy`, regenerate Prisma and build before starting the API. Optional PUBLIC_API_URL controls canonical media URLs (default localhost:4000/PORT). Existing real environment files were left unchanged.

Available listings can be edited/archived. Both cancel containing pending proposals with ITEM_UPDATED/ITEM_ARCHIVED events, preserving snapshots. Confirmed/reserved and exchanged items return409. Saved items are independent of matching wishes/proposals, and unavailable saved listings retain minimal tombstones.

Smoke checks intentionally retain uniquely labeled accounts, items, wishes, trades and photos. Only specific owned unattached photos created by tests are removed. No database/volume reset, broad media cleanup, Git initialization or public deployment occurred. The ignored `.superpowers/sdd/2026-10-15-listing-media/` ledger retains baseline copies, audit/build/test logs, nonsecret persistence identifiers and config fingerprints; it contains no copied environment secrets. Local preview: http://localhost:3000, API http://localhost:4000.
