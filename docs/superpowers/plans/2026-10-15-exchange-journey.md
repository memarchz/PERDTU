# PERDTU Exchange Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Implement the reference-inspired website and the real wishlist-to-completed-exchange journey on the existing local backend.

**Architecture:** Preserve Next.js/Express/Prisma/PostgreSQL and existing API response properties. Add narrowly scoped read enrichment, wish deletion and verified transaction recovery; consume them through a shared authenticated frontend client and reusable navigation, cards and cycle/timeline components. No new database models are needed.

**Tech Stack:** Existing Node.js 20.16.0-compatible packages, TypeScript, React 19, Next.js 15, Tailwind 3, Express 4, Prisma 5, PostgreSQL 16; native Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-15-marketplace-completion-design.md`, **Subproject 1: Exchange journey and reference UI** (approved). Subprojects 2 and 3 remain subsequent work, not silently removed from the user's request.

## Global Constraints

- Continue in the supplied checkout with Next.js, React, Express, Prisma and PostgreSQL.
- Do not replace the project, publish a hosted Site, or reset existing data.
- Keep the main UI language English, matching both the supplied screens and existing application.
- Use cream background #faf8f2 and forest accents #0d5f4d; support 360px mobile and desktop widths.
- Use real API/database data. Do not invent member counts, carbon-savings figures, distances, user reviews or an AI capability to imitate the picture.
- Keep the existing keyword matcher and label it "Matches" or "Suggested swaps".
- Wishes are user-level preferences; creating a proposal is not acceptance.
- Keep sessionStorage tokens; preserve API contracts through additive enrichment.
- Preserve all rows and the existing migration; no new database models in this subproject.
- Preserve existing environment files and do not log secrets.
- Retain Tailwind 3; no silent major styling migration. Record existing dependency audit limitations.
- No Git initialization or deployment. Work in place and keep a file ledger; Git-dependent commit/worktree helper steps do not apply.
- No browser connection is assumed; distinguish browser interaction evidence from API/HTTP evidence.
- Local uploads, listing editing/archiving, saved items, chat and notifications belong to subsequent subprojects. Do not add dead controls for them here.

## Review Focus

- Expired sessions and hostile return URLs must neither leak credentials nor redirect to another site (Task 3).
- Publishing an item followed by a failed wishlist request must offer a wish-only retry, never duplicate the item (Task 5).
- Stale match candidates and concurrent accepts/receipts must not reserve an item twice or leave a partially completed trade (Tasks 1–2 and 6).
- A nonparticipant/other owner must not read trade details, act on a trade or delete another user's wish (Tasks 1–2).
- Empty data, API failures, long names/titles and a four-person cycle must remain understandable at 360px without fabricated success (Tasks 4–7).

---

### Task 1: Authorized rich match/trade reads and wish deletion

**Files:**
- Modify: `apps/api/src/index.ts`, `apps/api/package.json`, `docs/API.md`.
- Create: `apps/api/src/trade-view.ts`, `apps/api/scripts/exchange-smoke.mjs`.

**Interfaces:**
- Consume: existing JWT authentication, Prisma client, `findCycles`, seven current models.
- Produce: `publicUserSelect = {id:true,displayName:true}` and `tradeInclude` satisfying `Prisma.TradeInclude` in `trade-view.ts`.
- Keep `GET /matches` response an array of `{edges,score}`; add `items: MatchItemSummary[]` and `participants: PublicUser[]` per cycle. `PublicUser={id,displayName}`. `MatchItemSummary={id,title,description,category,condition,area,imageUrl,status,owner:PublicUser}`.
- Keep existing trade properties; enrich participants with `user:PublicUser`, include ordered `events`, retain trade items and their snapshots. Both list/detail expose only trades containing the authenticated user.
- Add `GET /api/v1/trades/:id`: 200 rich trade for a participant, 401 anonymous, 404 missing/nonparticipant.
- Add `DELETE /api/v1/wishlist/:id`: 204 on owned deletion, 401 anonymous, 404 missing/foreign wish. Ownership is part of the delete condition.
- Add `npm.cmd run smoke:exchange` -> `node scripts/exchange-smoke.mjs`; requires running loopback API/PostgreSQL, creates only uniquely labeled local records, retains them, logs no tokens/passwords.

- [x] Write initial exchange smoke assertions before route changes: create two users/listings/wishes with a shared random marker in item titles/wish text; GET matches must contain their cycle and exact item titles and public owner names; inspect JSON recursively to reject `passwordHash` and participant `email` leakage. Propose, then expect rich GET trade detail 200 for both users and 404 for an outsider/missing id; expect 401 anonymous.
- [x] Add wish assertions: owner-created wish is visible in their wishlist; outsider DELETE is 404 and leaves it present; owner DELETE is 204 and removes it; second deletion is 404; anonymous is 401. Parse 204 as no content.
- [x] Run against the current API: expect failure from absent enrichment/detail/deletion; record the first actual failure before adding routes.
- [x] Implement read-only enrichment and guarded deletion. Use minimal public user selections everywhere and stable chronological event ordering. Use the same rich include for trade list, detail and creation where compatible.
- [x] Rebuild/restart only the owned API service, rerun exchange smoke until these assertions pass, and run the existing foundation smoke to detect regressions. Record generated test ids without credentials. Commit step: not applicable (no Git repository).

### Task 2: Trade state transitions under decline, receipt and contention

**Files:**
- Modify: `apps/api/scripts/exchange-smoke.mjs`, `apps/api/src/index.ts` as reproduced failures require.
- Create if needed for transaction recovery: `apps/api/src/serializable.ts`.

**Interfaces:**
- Consume: Task 1 rich reads, existing POST `/trades`, `/trades/:id/respond`, `/trades/:id/receipt` contracts.
- Produce if needed: `runSerializable<T>(db: PrismaClient, operation:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T>`; retry only Prisma P2034 serialization conflicts, at most 3 total attempts, rerunning the complete transaction; never retry logical authorization/availability errors.
- Keep 409 for stale/invalid transitions and 401 for missing auth. A refreshed state is authoritative after a conflict.

- [x] Extend exchange smoke with named scenarios: unanimous acceptance reserves all items; proposer starts PENDING; decline prevents later confirmation; repeated response/receipt cannot change state twice; outsider respond/receipt changes nothing; first receipt leaves EXCHANGING and RESERVED; last receipt sets COMPLETED and EXCHANGED; public browse excludes exchanged items.
- [x] Add a competing-proposals scenario sharing one item: preaccept noncontending parties, race final accepts with `Promise.all`, assert exactly one confirmed trade and no partial reservation attributable to the losing trade. Reload the losing trade and its unrelated item to verify the rollback. Race receipts on a separately confirmed trade; refresh and retry only a documented conflict, then assert completed state and one receipt event per user.
- [x] Add three- and four-person literal edge fixtures using four distinct users/items and unique wish markers. Assert simple cycles contain each owner exactly once, incoming/outgoing summaries agree, and each accepted trade requires every participant's receipt. Keep fixtures small and isolate their text from previous smoke runs.
- [x] Run scenarios against existing transition logic, record failures, and fix only demonstrated defects. Retain serializable transactions/conditional item reservation; add bounded P2034 retries only if needed. Avoid exposing raw Prisma diagnostics to users.
- [x] Run full exchange smoke and API build; require all invariant assertions to pass. Record observed conflicts rather than treating a conflict response as successful completion. Commit step: not applicable.

### Task 3: Shared request client, session lifecycle and protected routes

**Files:**
- Modify: `apps/web/lib/api.mjs`, `apps/web/lib/api.d.mts`, `apps/web/tests/api.test.mjs`, `apps/web/package.json`, `apps/web/app/layout.tsx`, `apps/web/app/account/page.tsx`.
- Create: `apps/web/lib/session.mjs`, `apps/web/lib/session.d.mts`, `apps/web/lib/types.ts`, `apps/web/components/auth-provider.tsx`, `apps/web/components/require-auth.tsx`, `apps/web/tests/session.test.mjs`.

**Interfaces:**
- Preserve existing `getJson<T>(url,{signal}?)` and its five regression cases.
- Add `ApiError extends Error` with numeric `status`; add `apiRequest<T>(url, options?:{method?,body?,token?,signal?}):Promise<T>`. Send JSON only when body exists, attach bearer only when explicitly supplied, support empty 204, preserve abort errors, and expose safe API validation/conflict messages with status. Do not swallow non-JSON server failures as success.
- `safeReturnPath(value:string|null):string` returns a single-leading-slash local path, rejects protocol-relative URLs, backslashes and external schemes, defaults to `/explore`.
- `useAuth()` provides `{user,loading,signIn(token):Promise<void>,signOut():void,request<T>(path,options?):Promise<T>}`; request prepends the configured API origin and clears the session on authenticated 401. Public login failures do not trigger protected-route redirect loops.
- `RequireAuth` displays loading before anonymous redirect to `/account?next=<encoded-local-path>`. Do not read sessionStorage during server rendering. Profile user shape: id, email, displayName, role.
- Shared domain types in `types.ts` mirror Task 1 DTOs, including `TradeParticipant.user`, nullable imageUrl, typed decisions/receipts and events. Unknown trade statuses are safely displayable.

- [x] Add real HTTP-fixture tests for POST body/bearer headers, 204, 401 status exposure, conflict messages, 500/non-JSON error and abort. Keep the existing five tests intact. Add literal return-path cases: `/trades/123` accepted; `https://example.org`, `//example.org`, `/\\example.org`, empty/null rejected to `/explore`.
- [x] Run explicit Node test file paths before implementation and observe missing functions/behavior. Implement the client/session functions and provider with one source of signed-in state. Use updated npm test command listing both test files explicitly for Windows Node 20 compatibility.
- [x] Rework login/register form with labels, loading lock, errors, ten-character password guidance and safe post-login return. Load `/users/me` after signIn, clear a rejected token; signOut removes the token and user state. Add accessible navigation feedback without rendering protected data while loading.
- [x] Run the full frontend tests and build. With a browser connection, verify anonymous navigation, successful return and expired-session behavior; otherwise explicitly record these interaction checks as unverified. Commit step: not applicable.

### Task 4: Reference visual system, public home and real browse

**Files:**
- Modify: `apps/web/app/globals.css`, `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`, `apps/web/app/explore/page.tsx`.
- Create: `apps/web/components/brand.tsx`, `apps/web/components/app-shell.tsx`, `apps/web/components/item-card.tsx`, `apps/web/components/ui.tsx`, `apps/web/public/closet-illustration.svg`.

**Interfaces:**
- `AppShell({children})` supplies desktop sidebar and mobile navigation to implemented routes only: explore, post, my-items, wishlist, matches, trades, profile.
- `ItemCard({item:ItemSummary})` links to `/items/<id>`, shows title/category/condition/area with local designed placeholder when no image exists. Do not show fictitious distances.
- Shared `Button`, `StatusBadge`, `PageState` components handle pending/disabled, safe unknown statuses and loading/error/empty content with appropriate semantics; preserve keyboard focus.
- Browse consumes `GET /items?q=<query>&category=<category>` and synchronizes q/category with search params. Use Suspense if required by Next's search-param hooks during build.

- [x] Build code-native brand/closet SVG and reusable visual components around cream/forest, warm accents, rounded cards and generous spacing. This is original artwork, not a raster edit of the reference board. Keep assets local and decorative artwork separate from real listings.
- [x] Rebuild home with reference-inspired headline, illustration, working Get started/Explore links and four exchange steps. Use no fake counters, dead video or unavailable OAuth controls.
- [x] Rebuild explore dashboard/sidebar/header/category controls and real item grid. Use cancellable requests; URL changes and back navigation must restore filters. Clear failures on a new successful query and distinguish loading from empty data. Label newest items "Recent listings".
- [x] Run frontend tests/build; if browser available, inspect home/browse at 360px and desktop with empty results and long titles, keyboard focus, sidebar/mobile menu and URL filter persistence. Otherwise record limits; HTTP 200 is not visual verification. Commit step: not applicable.

### Task 5: Post, inventory, wishlist, interested action and profile

**Files:**
- Modify: `apps/web/app/post/page.tsx`, `apps/web/app/items/[id]/page.tsx`.
- Create: `apps/web/app/my-items/page.tsx`, `apps/web/app/wishlist/page.tsx`, `apps/web/app/profile/page.tsx`, `apps/web/lib/publish.mjs`, `apps/web/lib/publish.d.mts`, `apps/web/tests/publish.test.mjs`.
- Modify: `apps/web/package.json` to include the new explicit test file.

**Interfaces:**
- `publishListing(input:{item,createdItemId?:string,wish?:{description,category}},request):Promise<{itemId:string,wishSaved:boolean,wishError?:string}>` makes an item request only when createdItemId is absent. A wish failure preserves itemId for explicit retry; item-create failure throws. Do not automatically replay an indeterminate network failure for item creation.
- Wishlist reads existing GET/POST and Task 1 DELETE. `/wishlist?description=...&category=...` only prefills a form and never creates a wish on mount.
- Inventory consumes `/me/items` and exposes all actual item states. Profile uses useAuth user and signOut, without fake editing/save controls.

- [x] Write publish regression tests with controlled request boundary: listing success + wish failure yields the created id; wish-only retry with that id invokes no item creation; item failure never attempts a wish; empty wish produces no wish call. The boundary fixture tracks request effects, not private helper implementation. Run RED before adding the orchestrator.
- [x] Implement publish orchestration and post form with title/description/category/condition/area plus clearly user-level wanted description. Prevent duplicate submits, preserve created id on wish failure, show the created-item link and a deliberate wish retry. Do not clear recoverable user input on failure.
- [x] Build protected inventory/wishlist/profile pages using shared shell/states; wish deletion updates only after server success, with recoverable failure. Use existing category values consistently.
- [x] Rebuild item detail with reference-inspired layout and existing error handling. For an available foreign item, interested action navigates to a deliberate prefilled wishlist form; guests return there after sign-in. Owners navigate to inventory; unavailable items show state and no available offer action.
- [x] Run all frontend tests/build. Verify real API list/create/delete paths and ownership using exchange smoke. If browser is connected, verify the publish partial-success retry and interested flow interactively; otherwise record limitations. Commit step: not applicable.

### Task 6: Match cycles, proposal action and trade timeline

**Files:**
- Create: `apps/web/app/matches/page.tsx`, `apps/web/app/trades/page.tsx`, `apps/web/app/trades/[id]/page.tsx`, `apps/web/components/cycle-view.tsx`, `apps/web/components/trade-timeline.tsx`, `apps/web/lib/trade-actions.mjs`, `apps/web/lib/trade-actions.d.mts`, `apps/web/tests/trade-actions.test.mjs`.
- Modify: `apps/web/package.json` explicit test file list.

**Interfaces:**
- `availableTradeActions(trade,currentUserId):{canAccept:boolean,canDecline:boolean,canConfirmReceipt:boolean}` derives eligibility from actual membership/decision/received/state only.
- `CycleView({edges,items,participants,currentUserId})` renders a clear textual give/receive list and a decorative cycle layout; handles 2/3/4 distinct participants, long names, missing thumbnails and highlights the user's incoming/outgoing item.
- `TradeTimeline({events,participants})` shows actual timestamped events without inferred shipping or delivery milestones.
- Match proposal posts only `{edges:[{from,to,itemId}]}`; success navigates to rich `/trades/<id>`. Trade list filters current-user trades by actual status; detail uses Task 1 GET.

- [x] Write literal action eligibility tests before implementation: outsider never has actions; PROPOSED pending participant can accept/decline; already answered participant cannot; proposer is not autoaccepted; CONFIRMED/EXCHANGING participant with received=false can confirm; received=true, COMPLETED, DECLINED or unknown status cannot. Run RED, implement pure rules, run GREEN.
- [x] Build protected matches screen with true cycle contents and useful no-matches guidance linking to post/wishlist. Show pending state, propose success only after response, and refresh candidates on conflict without replaying a proposal automatically.
- [x] Build trade list/detail with exact incoming/outgoing item, participant decisions and actual event timeline. Keep a manual Refresh action so polling/realtime is not implied. Refresh after accept/decline/receipt, and on a conflict; preserve an actionable message when a refresh also fails.
- [x] Wire pending locks and eligibility helper into buttons. No chat, report-dispute, cancel or shipping button is shown until its later implementation. Retain unavailable-state data instead of falsely showing a completed step.
- [x] Run frontend suite/build and exchange smoke covering accepted/declined/competing proposals and receipts. If browser available, exercise two participants using independent sessions. If unavailable, describe API/logic proof accurately. Commit step: not applicable.

### Task 7: Final integration, review and local handoff

**Files:**
- Modify: `README.md`, `docs/API.md`, `docs/LOCAL_VERIFICATION.md`, this plan's execution ledger.

**Interfaces:**
- Consume all implemented routes and existing local API/database configuration; leave the verified local preview available if ports are still owned by this work.
- Produce dated evidence, real implemented screen list, retained test-record notes and explicit remaining subprojects.

- [x] Run API build, frontend full unit suite, frontend build, existing foundation smoke and exchange smoke. Check Prisma schema/migration status without creating a migration or resetting data. Read every result and fix demonstrated regressions.
- [x] Use the Browser skill to check connection availability. If connected, validate 360px/desktop, long data/4-person cycles, anonymous/expired auth, interested/wishlist, two-user propose/accept/receipt and error states. If unavailable, record the exact limitation and perform HTTP route plus live API checks without claiming interactive coverage.
- [x] Update API documentation with enriched shapes, DELETE wishlist semantics, participant-only trade detail, status/conflict behavior and the still-keyword matcher. Update README with actual navigation and test commands; keep media/chat/notifications clearly pending.
- [x] Obtain the single independent final review required by Native execution; provide the spec, this plan, ledger rulings, changed-file list and Review Focus verbatim. Grade findings by user impact; fix Important/Critical findings with regression evidence and rerun affected checks.
- [x] Record final build/test/API results, decisions and remaining audit/browser limits. Keep all existing env/data intact. No commits/merge menu apply because there is no Git repository; preserve the ledger. Handoff includes localhost URL and implemented behavior, not a claim that all three subprojects are finished.

## Self-review

All ten Subproject 1 acceptance criteria map to tasks: authorization/enrichment (1), state/concurrency/2–4 owners (2), auth/return path (3), reference UI/filter/state (4), publish retry and owner flows (5), cycle/trade actions (6), verification/handoff (7). Each Review Focus item has named assertions or an explicit browser verification step. No placeholder functions/types are referenced without definition. Changes preserve current schemas/contracts, isolate subsequent media/communication work, and avoid production/deployment claims.

## Execution handoff

Retain the already selected **Native** execution preference: implement these seven tasks in this session with one independent final review. User review of this written plan is the next workflow gate; do not ask the user to choose the execution method again.

## Execution outcome

All seven task checklists executed, using the explicitly allowed unavailable-browser fallback. Final frontend suite38/38, API matching regressions2/2, full exchange smoke151 requests, foundation smoke15, both builds passed. Independent review Important findings fixed with observed regressions; two Minor findings remain recorded in docs/EXCHANGE_VERIFICATION.md. No browser/hydration/visual completion claim. No Git initialization, reset, schema change or dependency expansion.
