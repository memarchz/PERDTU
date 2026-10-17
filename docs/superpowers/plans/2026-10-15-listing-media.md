# PERDTU Listing Media and Saved Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add actual local listing photos, safe owner editing/archiving and persistent saved-item favourites without breaking exchanges or existing data.

**Architecture:** Keep the current application and add focused Express routers, decoded local WebP storage and two Prisma models. Listing mutations and pending-proposal invalidation share the existing serializable transaction helper. The frontend consumes additive image/saved-state DTOs through the existing session-bound client, preserving item/wish partial-success recovery.

**Tech Stack:** Existing Node.js 20.16.0, Express 4, Prisma 5/PostgreSQL, Next.js 15/React 19/Tailwind 3; Multer 2.4.0, Sharp 0.35.5, @types/multer 2.3.0; native Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-15-listing-media-design.md` (approved); this is Subproject 2 of marketplace completion. Trade chat and in-app notifications remain Subproject 3.

## Global Constraints

- Keep the same frontend, API, database, visual system and accounts.
- This subproject must work locally without an external account, paid service or publishing.
- An authenticated owner can upload JPEG, PNG or WebP, at most 5 MiB per source file and at most four photos per listing.
- Reject SVG, animated content, malformed files and excessive decoded dimensions; limit input to 25 million pixels.
- Re-encode to a static WebP, maximum 1600px longest side, preserving aspect ratio and stripping source metadata.
- Never use a client filename as a filesystem path.
- An unattached upload is private and can be attached only by its owner.
- Preserve existing snapshots/events; never silently rewrite a previously agreed snapshot.
- RESERVED and EXCHANGED items cannot be edited/archived through these actions (409).
- No reset, dropped volume, unrelated data/media cleanup, Git initialization, cloud publishing or secret logging. Preserve existing .env files.
- Existing DTO fields/imageUrl-only records remain supported. Favourites do not create wishlist preferences or proposals.
- Use existing English UI, session-bound requests and green/cream responsive components. Browser verification is conditional on an actual connection.

## Review Focus

- Spoofed image MIME, decompression-size inputs, multipart aborts and path-like filenames must not publish unsafe content or leave usable orphan records (Tasks 1–2).
- A user must not attach/read/delete another user's private uploads or mutate/save on behalf of another account (Tasks 2–5).
- Editing/archiving racing final acceptance must atomically cancel only pending proposals or lose to reservation without partial mutation (Task 3).
- Reorder/removal and partial item/wish failure must preserve the original published id/photos across retries, refresh and reauthentication (Tasks 3–4).
- Legacy/exchanged/archived saved records, no-photo items and API failures must have usable states without broken action links or nested interactive elements (Tasks 4–6).

---

### Task 1: Forward schema, media dependencies and decoded-image storage

**Files:**
- Modify: `apps/api/prisma/schema.prisma`, `apps/api/package.json`, `apps/api/package-lock.json`, `.gitignore`, `apps/api/.env.example` (examples only).
- Create: `apps/api/prisma/migrations/<timestamp>_listing_media/migration.sql`, `apps/api/src/media-store.ts`, `apps/api/scripts/media-store.test.mjs`.

**Interfaces:**
- `Photo`: id UUID string primary key; ownerId/user relation; nullable itemId/item relation; unique generated filename; mime, bytes, width, height, nullable position, createdAt. Add `[ownerId,itemId]` index and `[itemId,position]` unique constraint. Add user/item reverse relations.
- `SavedItem`: id UUID string primary key; userId/itemId foreign keys, createdAt, unique `[userId,itemId]`, user/createdAt index. Add reverse relations. Do not change old model field semantics.
- `decodeImage(input:Buffer):Promise<{buffer:Buffer,mime:'image/webp',width:number,height:number}>`; `writePhoto(input:Buffer):Promise<{filename:string,bytes:number,mime:'image/webp',width:number,height:number}>`; `removePhotoFile(filename:string):Promise<void>` and `photoFilePath(filename:string):string` in media-store.ts.
- Storage root resolves to `apps/api/storage/uploads` from src or dist (__dirname/../storage/uploads), and is ignored. Filename is a fresh UUID plus `.webp`, checked before any path operation. No caller-supplied path or outside-root storage override.
- Optional `PUBLIC_API_URL` defaults to `http://localhost:<PORT or 4000>` for canonical media URLs. Add its explanation to the example, not the existing real environment file; never derive trusted media origins from an arbitrary Host header.

- [ ] Verify baseline tests/schema/env hashes and record table row counts without secrets. Read installed package metadata/advisories again if inputs changed; install exact `multer@2.4.0 sharp@0.35.5`, dev `@types/multer@2.3.0`, retain lock. Node engines were checked during planning: Multer >=10.16.0, Sharp >=20.9.0. Recheck audit after install; do not force a major framework upgrade to resolve unrelated existing findings.
- [ ] Add Photo/SavedItem relations, validate/generate Prisma, create/apply a forward migration only to the configured local development database. Inspect SQL before application; decline any reset. Compare previous table counts and run migration status.
- [ ] Write media-store tests using generated PNG/JPEG/WebP fixtures and actual Sharp decoding: static outputs decode as WebP, maximum side <=1600, aspect ratio retained within rounding, no EXIF; reject SVG disguised as PNG, GIF/animated WebP or APNG, truncated bytes, >5 MiB and >25M-pixel header dimensions. Test unsafe filenames such as `../outside.webp` reject before filesystem access. Run RED before implementing store functions.
- [ ] Implement a byte-signature allowlist before invoking the decoder (JPEG/PNG/WebP only), decoded format/pages/pixel checks and resize/autorotate/static WebP encoding. Use Sharp input pixel limits. Write with exclusive creation inside the storage root and clean up only a file created by the failed operation. Do not use recursive deletion.
- [ ] Build API and run store tests (compile then Node test on `dist/media-store.js`); require real output decoding assertions to pass. Document exact new files; no Git commit applies.

### Task 2: Authenticated multipart uploads and protected media serving

**Files:**
- Create: `apps/api/src/http.ts`, `apps/api/src/media-routes.ts`, `apps/api/scripts/media-smoke.mjs`.
- Modify: `apps/api/src/index.ts`, `apps/api/package.json`.

**Interfaces:**
- Move existing `AuthReq`, asyncRoute and auth construction into http.ts without changing contracts: `createAuth(secret:string):RequestHandler`, `asyncRoute(handler):RequestHandler` and exported AuthReq type. Validate protected upload auth before accepting the file.
- `createMediaRouter(db:PrismaClient,auth:RequestHandler):Router`, mounted at `/api/v1`. Public URL is `<PUBLIC_API_URL>/api/v1/media/<photoId>`; other new API paths below are relative to `/api/v1`.
- `POST /uploads/images`: exactly one multipart `file`, 201 `{id,mime,bytes,width,height}`; no generated disk path/filename exposed. Memory-backed multipart staging limited to 5 MiB, one file, bounded fields/parts; no disk write until validated decoding. Map size errors to 413 and malformed/unsupported input to 400.
- `DELETE /uploads/images/:id`: 204 only for an owned unattached Photo; foreign/missing/attached is 404. Delete only that tracked validated file after ownership-safe database handling; failed deletion is reported accurately, not broad cleanup.
- `GET /media/:id`: unauthenticated 404 for missing/unattached/draft/archived; otherwise serve decoded WebP with `Content-Type:image/webp`, `X-Content-Type-Options:nosniff`, private/no-store caching so archival is not defeated by a cached public response. Never expose directory listing or a filesystem path parameter.
- `npm.cmd run smoke:media` runs media-smoke.mjs against a loopback API, creates uniquely labeled local data only, and retains records/media unless a specific owned-unattached deletion is under test.

- [ ] Write initial real FormData smoke: authenticated supported upload201, decoded metadata correct, unattached GET404; anonymous upload401; spoofed SVG400; source >5MiB413; malformed multipart400; path-like client filename cannot determine the resulting disk location. Test owned unattached deletion204, repeated/foreign404. Run against old routes and observe failure.
- [ ] Implement router using Task 1 store with request-abort checks before committing a Photo. If file write succeeds but row creation fails or the request aborts before completion, remove only the new file and avoid a usable row. Keep the existing OBS presign endpoint unchanged and separate.
- [ ] Implement media read eligibility against the linked Item on every request; use stored generated filenames only. A filename/id traversal probe must return 404 and never read outside storage.
- [ ] Build/restart only the owned API process; run smoke upload/privacy/deletion and store tests. Full attachment/public-serving checks follow Task 3. No secret or real image contents are printed.

### Task 3: Listing attachment, editing/archive and private saved collections

**Files:**
- Create: `apps/api/src/listing-routes.ts`, `apps/api/src/listing-data.ts`, `apps/api/src/saved-routes.ts`.
- Modify: `apps/api/src/index.ts`, `apps/api/src/serializable.ts` (safe messages only), `apps/api/scripts/media-smoke.mjs`.

**Interfaces:**
- `createListingRouter(db,auth):Router` takes over existing item read/create/inventory paths while preserving limits/contracts. Introduce DTO selection/serialization helpers in listing-data.ts shared with match summaries if needed.
- Add `photoIds?:string[]` to item creation and PATCH, maximum four distinct ids. Omitted photoIds preserves existing photos/imageUrl; supplied `[]` explicitly removes primary/gallery images; supplied nonempty ids set gallery order and first imageUrl. All ids must be owned, unattached or already associated with this same item. An upload can never move to another item.
- Add `images:[{id,url,width,height,position}]` to public/owner item DTOs, ordered by position, while retaining canonical imageUrl for old consumers. File owner/filename/private metadata is excluded.
- Removed gallery photos retain their immutable item association but get `position=null`; active gallery uses nonnull positions. This preserves historical snapshot URLs while the item remains publicly visible. Archived items still deny public media. Do not delete historical media. Reorder by nulling old positions before assigning new unique positions in one transaction.
- `PATCH /items/:id`: partial existing item fields plus photoIds; 200 enriched owned item, 404 foreign/missing, 409 not AVAILABLE. `DELETE /items/:id`: soft archive, 204; same ownership/state rules. Do not archive RESERVED/EXCHANGED.
- Edit/archive transaction cancels all PROPOSED trades containing that item and appends actor `ITEM_UPDATED`/`ITEM_ARCHIVED` events. It does not change confirmed/completed trades or snapshots. Reuse runSerializable; include safe edit-conflict messages.
- `GET /saved-items`: current-user collection of `{id,itemId,createdAt,available,item}`; visible item uses enriched public summary, archived entry uses minimal `{id,title,status}` tombstone with available=false (no private description/photo/details).
- `PUT /saved-items/:itemId`: idempotent owned collection insert for an existing publicly visible item, 200 entry; `DELETE /saved-items/:itemId`: idempotent204 regardless of whether the current user's entry exists. Both authenticated; no other user's collection is read/changed.

- [ ] Extend media smoke before route implementation: upload four photos then create/list/detail with exact ordering and primary URL; fifth/duplicate/foreign/already-other-item ids rejected atomically; legacy imageUrl-only create/read remains working; unattached media stays404 while attached becomes200 WebP/nosniff. Reload using a fresh HTTP client to prove persistent metadata/files.
- [ ] Add owner/nonowner PATCH/archive assertions, preserved snapshots, cancelled pending proposals with explanatory events, and unchanged confirmed trades. Race final acceptance vs PATCH/archive using Promise.all: either reservation wins with edit409 or cancellation wins with accept409; assert no partial edit/reservation and no duplicate events. Reserved/exchanged edits/archives must remain409.
- [ ] Add saved collection assertions: repeated PUT produces one entry, repeated DELETE remains204, a different user sees none, saved actions do not create Wish or Trade rows, archived saved entry remains unavailable with no live detail/photo link. Anonymous401 and inaccessible-save404.
- [ ] Implement attachment and mutation logic in focused routers; remove duplicate handlers from index.ts rather than leaving competing route registrations. Use database predicates and transactions, not preflight UI checks, as authorization/concurrency boundaries.
- [ ] Run API build, store/unit tests and full media smoke; then foundation/exchange smoke. Require old 2–4-person transitions/privacy/legacy records to remain passing. Verify no historical data was removed.

### Task 4: Real photo picker, gallery and resilient publishing

**Files:**
- Modify: `apps/web/lib/api.mjs`, `apps/web/lib/api.d.mts`, `apps/web/components/auth-provider.tsx`, `apps/web/lib/types.ts`, `apps/web/app/post/page.tsx`, `apps/web/app/items/[id]/page.tsx`, `apps/web/lib/publish.mjs`, its declaration/tests as needed.
- Create: `apps/web/components/photo-picker.tsx`, `apps/web/components/item-gallery.tsx`, `apps/web/lib/photos.mjs`, `apps/web/lib/photos.d.mts`, `apps/web/tests/photos.test.mjs`.
- Modify explicit Windows test-file list in `apps/web/package.json`.

**Interfaces:**
- Extend RequestOptions with `formData?:FormData`, mutually exclusive with JSON body. apiRequest sends the browser FormData unchanged without a manual Content-Type boundary. The existing provider request still binds mutations to the captured session generation/token.
- `PhotoDraft={id:string,previewUrl:string,width:number,height:number}`. `PhotoPicker({value:PhotoDraft[],onChange,disabled?})` uploads selected files sequentially using the authenticated request, displays local object-URL previews, supports accessible move-left/right/remove and maximum four selections. Track/release every created preview URL, including a failure or late completion after unmount/session change.
- `ItemGallery({images,imageUrl,title})` supports primary/thumbnail selection, legacy single-image and no-image placeholders; failed image loads show a usable fallback.
- Helpers in photos.mjs define selection/reorder/remove and upload-result retention using stable ids; errors never discard successful prior uploads or textual form data. No base64 photos in sessionStorage.

- [ ] Add HTTP-fixture test proving FormData includes a real boundary/file payload and authenticated token; JSON/204/session regressions must remain intact. Add photo helper tests for four/fifth, reorder/remove with stable ids, failed upload retaining prior successes, and cleanup of created preview URLs. Run RED before corresponding code changes.
- [ ] Implement client transport and picker/gallery. Reject unsupported/oversize files client-side for feedback, but keep server decode authoritative. Remove only an owned unattached upload when the user explicitly discards it; never delete a published/history image as draft cleanup.
- [ ] Include photoIds in the existing publish operation, preserving uploaded ids in the user-specific pending draft alongside createdItemId. Persist the current wish fields before each wish-only retry so reauthentication restores edits; no repeat item creation or photo upload after partial success.
- [ ] Update item DTO type with optional images; legacy snapshots continue to accept imageUrl-only shape. Wire gallery into detail and photo picker into post, with pending upload disabling Publish until all selected uploads settle.
- [ ] Run full frontend suite/build. If browser connected, verify actual file selection/preview/order, failure recovery, rerender/unmount cleanup and upload→publish→gallery at mobile/desktop widths; otherwise separate unverified browser behavior from real upload API evidence.

### Task 5: Owner edit/archive and saved-item screens

**Files:**
- Create: `apps/web/app/items/[id]/edit/page.tsx`, `apps/web/app/saved-items/page.tsx`, `apps/web/components/save-item-button.tsx`, `apps/web/components/saved-items-provider.tsx`.
- Modify: `apps/web/components/item-card.tsx`, `apps/web/components/app-shell.tsx`, `apps/web/components/auth-provider.tsx` only if integration requires, `apps/web/app/my-items/page.tsx`, `apps/web/app/items/[id]/page.tsx`, `apps/web/components/trade-timeline.tsx`, `apps/web/app/trades/[id]/page.tsx`, `apps/web/app/layout.tsx`, `apps/web/app/globals.css`, shared types.

**Interfaces:**
- Saved-items provider loads the signed-in user's collection once, exposes saved ids and awaited save/remove actions, clears on user/session changes and ignores stale previous-user results. No per-card list fetch and no cross-account optimistic state.
- SaveItemButton uses existing session guard/return-path behavior; guests navigate to sign-in then return, without auto-saving. Confirm saved state only after API success.
- ItemCard becomes an article with separate item link and sibling save/manage controls; no nested anchor/button interaction. Archived/unavailable saved tombstones have no dead detail link.
- Owner `/items/:id/edit` fetches authoritative owner data, reuses field validation/photo picker and PATCH. Legacy images remain unless explicitly removed/replaced. A stale reservation disables edit and shows refresh/navigation guidance.
- Inventory shows Edit/Archive only for AVAILABLE own items; archive has an explicit confirmation explaining pending-proposal cancellation. Success follows204; failures retain the item and useful message. Archived entries remain visible in owner inventory without a public-detail link.

- [ ] Add focused regression cases for stable saved-state mutation/session clearing and archive response handling before their implementation; use existing actual-source harness approach where useful, not source-text matching. Preserve the existing auth race tests.
- [ ] Implement saved provider, buttons and `/saved-items`, and add its working navigation entry. Show current status and a graceful unavailable state; saving is distinct from account wishes and never calls wishlist/trade writes.
- [ ] Implement edit form and inventory archive interaction using Task 3 APIs. Reuse gallery/picker, preserve text on failure, and display the pending-proposal invalidation explanation before destructive-looking actions.
- [ ] Add timeline wording for ITEM_UPDATED/ITEM_ARCHIVED and an honest CANCELLED state with no accept/receipt actions. Protect confirmed/completed history from edit flows.
- [ ] Add wrapping/min-width constraints to touched card/gallery/owner/cycle/timeline areas so long titles/names do not push narrow layouts sideways. Run frontend tests/build; browser checks remain conditional and explicitly reported.

### Task 6: Integration, restart persistence and independent review

**Files:**
- Modify: `README.md`, `docs/API.md`, `docs/LOCAL_VERIFICATION.md`, `docs/EXCHANGE_VERIFICATION.md` current-state pointers.
- Create: `docs/MEDIA_VERIFICATION.md` and this plan's ignored execution ledger/baseline.

- [ ] Run full API tests/build, frontend tests/build, foundation smoke, exchange smoke and media smoke. Validate/apply migration status without resets. Read all failures; fix demonstrated regressions before completion claims.
- [ ] Using a labeled uploaded listing, restart only the owned API process and reload media/metadata; both must persist. Exercise archive/no-store behavior with fresh GET requests; no directory listing or unattached-media access may appear. Keep test data/media and record its side effects.
- [ ] Verify all new page shells and actual media HTTP responses. Attempt supported Browser connection for interactive upload/edit/save/mobile checks; if absent, record the exact limitation and do not substitute fake screenshots or claim browser interaction passed.
- [ ] Inspect changes for secret leakage, unexpected schema/data deletion, raw-file publicity, manifest/lock consistency, Node engine compatibility and decoded-library audit results. Record existing unrelated advisories separately from new dependencies.
- [ ] Obtain one independent final review under the preserved Native workflow; give the approved spec, this plan, ledger/baseline and Review Focus verbatim. Fix Critical/Important findings with observed regressions and rerun affected suites; document remaining Minor findings honestly.
- [ ] Update setup docs with storage location, original-file limits, migration/start/test commands, source-file vs WebP behavior, pending-proposal cancellation rules and separate database/files backup requirement. Record implemented media/saved/edit functions; chat and notifications still remain.
- [ ] Leave the verified local preview available with no public deployment, no Git initialization and no unrelated cleanup. Retain ledger/baseline because no commit history exists.

## Dependency evidence checked during planning

- Official npm metadata: Multer 2.4.0 supports Node >=10.16.0; Sharp 0.35.5 supports Node >=20.9.0; installed Node is20.16.0. Exact versions are selected for reproducibility, not automatic major upgrades.
- [Multer advisory GHSA-3pph-fpjx-jg34](https://github.com/expressjs/multer/security/advisories/GHSA-3pph-fpjx-jg34) identifies2.4.0 as patched for aborted-upload orphan writes. Memory-backed limited staging also avoids raw diskStorage writes.
- [Sharp maintainer advisories](https://github.com/lovell/sharp/security/advisories) and the [librsvg advisory](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w) were inspected. Only permitted raster signatures reach the decoder; audit installed resolved native dependencies again during implementation. Do not infer a universal security guarantee from version selection.

## Self-review and handoff

All eight spec acceptance criteria map to tasks1–6: real persistent photos (1–4/6), unsafe/private input (1–3), four-photo order (3–4), ownership/concurrency (3/5), publish retry (4), private idempotent favourites (3/5), regressions/builds (6), conditional browser verification (4–6). Review Focus cases have concrete assertions. API paths are consistently relative to `/api/v1`; canonical media URLs do not depend on frontend origin. Historical files/snapshots and existing configuration are preserved. No cleanup/reset is hidden inside test setup.

Preserve **Native** execution: implement these tasks in this session with one independent final review. The next gate is user review of this written plan; the execution method does not need to be chosen again.
