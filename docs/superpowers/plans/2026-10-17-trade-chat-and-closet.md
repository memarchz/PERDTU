# Trade Chat and Closet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add private chat after unanimous trade acceptance, hide completed inventory and give sidebar labels a raised hover effect.

**Architecture:** Use the existing trade as the conversation boundary, with a new persisted TradeMessage table and authenticated Express router. A focused client conversation component polls bounded message pages while preserving drafts; inventory filtering and sidebar CSS remain small independent changes.

**Tech Stack:** Existing Next.js/React/TypeScript, Express, Prisma 5 and PostgreSQL; no new product dependencies.

**Spec:** `docs/superpowers/specs/2026-10-17-trade-chat-and-closet-design.md`

## Global Constraints

- Extend the existing application; preserve existing data and the green/cream visual style.
- Use approximately three-second polling; no WebSocket service.
- Plain text of 1–2000 characters; initially return the latest 50 in chronological order.
- Anonymous requests return 401; authenticated nonmembers return 404.
- Sending is permitted only in CONFIRMED or EXCHANGING; COMPLETED is read-only.
- Hide EXCHANGED inventory only; unanimous acceptance reserves items and must not hide them.
- Apply an additive migration without resets; preserve environment files and storage.
- Preserve existing uncommitted motion.css/layout changes; do not push to GitHub.
- Native execution remains selected: implement in this session, then one fresh independent final review.

## Review Focus

- An uncertain POST retried with the same identifier must not create duplicate messages; different text must conflict (Task 1).
- Concurrent receipt completion must not permit messages after the trade becomes completed (Task 1).
- Equal message timestamps must not lose or repeat messages across cursor boundaries (Task 1).
- Account changes and hidden tabs must stop stale message updates and avoid leaking the prior conversation (Task 2).
- A trade status refresh must preserve a typed draft and previously loaded history (Task 2).

## Task 1: Persist and authorize trade conversations

**Files:** Create `backend/src/trade-chat.ts`, `backend/src/chat-routes.ts`, `backend/scripts/chat.test.mjs`, `backend/scripts/chat-smoke.mjs`, and a timestamped `backend/prisma/migrations/*_trade_messages/migration.sql`. Modify `backend/prisma/schema.prisma`, `backend/src/index.ts`, `backend/package.json`.

**Interfaces:**
- `createChatRouter(db: PrismaClient, auth: RequestHandler): Router` mounts at `/trades` before the existing trade detail handlers.
- `GET /trades/:id/messages?before=<cursor>` returns latest/older pages; `?after=<cursor>` returns oldest next messages after that cursor. Reject combined cursors. Cursors encode `{createdAt: ISO string, id: string}` and must resolve to an existing message in that trade.
- Response: `{opened:boolean, canSend:boolean, messages: ChatMessage[], olderCursor:string|null, nextCursor:string|null, hasMore:boolean}`. `hasMore` means additional results in the requested direction; `nextCursor` is the newest returned message, or the input after cursor on an empty after page. `olderCursor` identifies the oldest returned message. Use 51 queried rows to detect continuation with a 50-row response limit.
- `ChatMessage = {id:string, sender:{id:string,displayName:string}, body:string, createdAt:string, clientMessageId:string}`.
- `POST /trades/:id/messages` accepts `{body:string,clientMessageId:string}`; returns `{message:ChatMessage}` with 201 for insertion or 200 for an identical retry. Use UUID client identifiers. An already persisted identical retry can return its message after completion; a new message must be rejected with 409.
- `chatAccess(status: TradeStatus): {opened:boolean,canSend:boolean}`: opened is false only for PROPOSED; membership still required for every state. Closed states return only existing messages and no send permission.

- [ ] Write `chat.test.mjs` assertions for status policy, whitespace normalization, 0/2001 character rejection, invalid UUID/cursor and combined cursors. Run `npm test` in backend and confirm the new test fails before implementation.
- [ ] Add TradeMessage with UUID id, tradeId/senderId foreign keys, body, createdAt default now, clientMessageId; unique `[tradeId,senderId,clientMessageId]` and index `[tradeId,createdAt,id]`. Add User/Trade relations and generate an additive SQL migration; inspect for no destructive statements, apply with migrate deploy, generate Prisma client.
- [ ] Implement validation/policy helpers and router. Use public sender selection, strict cursor scope, deterministic createdAt/id sorting, and transaction-bound membership/status checks for writes. Retry Prisma serialization conflicts only with the existing serializable pattern; handle duplicate inserts by fetching and comparing the persisted body without exposing unrelated messages.
- [ ] Register router and extend explicit Windows-compatible test script; add `smoke:chat` script.
- [ ] Write actual-DB smoke cases using uniquely named fixture users/trades: anonymous 401, outsider 404, partially accepted locked access, all accepted unlock, 2/3/4-member access, plain-text round-trip, validation failures, same retry count=1, changed-body conflict, 52 equal-timestamp rows paginated in both directions without loss, wrong-trade cursor rejection, completed read-only, closed-history reads and concurrent receipt/send consistency. Preserve existing fixtures and report counts, not credentials.
- [ ] Run backend tests and `npm run smoke:chat` against the local API; require every assertion to pass. Commit only Task 1 source/migration/test changes.

## Task 2: Add the trade conversation UI

**Files:** Create `frontend/components/trade-chat.tsx`, `frontend/lib/chat-session.mjs`, `frontend/lib/chat-session.d.mts`, `frontend/tests/chat.test.mjs`. Modify `frontend/app/trades/[id]/page.tsx`, `frontend/lib/types.ts`, `frontend/app/globals.css`, `frontend/package.json`.

**Interfaces:**
- `TradeChat({tradeId}:{tradeId:string})` obtains the current request capability from AuthProvider; uses Task 1 endpoint contracts.
- `createChatSession({request,tradeId,onChange,schedule,cancel}): {start():void,stop():void,refresh():Promise<void>,loadOlder():Promise<void>,send(body:string):Promise<boolean>}` isolates request sequencing, cursor merging, retry IDs and teardown for native Node tests. `onChange` receives messages, opened/canSend, loading/sending, errors and older-history availability. Scheduling defaults to setTimeout/clearTimeout, polling interval 3000ms; injected scheduling makes tests deterministic. The component owns the draft and visibility listener; it starts/stops polling on visibility changes without discarding history and completely disposes the session on account/trade changes.

- [ ] Write failing session tests with deferred requests and fake scheduling: late old-session responses ignored, no overlapping polls, stop cancels scheduled work, same retry ID after failure, returned messages deduplicated, catch-up follows hasMore, older page merged chronologically, status refresh preserves loaded history. Run `node --test tests/chat.test.mjs` from frontend and confirm failure.
- [ ] Implement the session controller and types. Make start/stop idempotent; bounded history requests use Task 1 cursors. Prevent stale completions from scheduling new work after disposal. Treat auth/request replacement as a new session.
- [ ] Implement the component with a labeled textarea maxlength 2000, sender/time/plain text, locked/read-only notices, load-earlier control, retryable errors and acknowledged send state. Preserve draft on polling/failure; clear after successful send only. Keep scroll position when prepending; auto-scroll only near the bottom or after own send. Use stable message IDs as keys.
- [ ] Mount the conversation independently of trade refresh loading branches so refreshing trade details does not unmount it. Add responsive styling consistent with existing panels; keep keyboard focus visible and expose errors/status to assistive technology.
- [ ] Extend the explicit frontend test script; run all frontend tests and production build. Commit only Task 2 changes.

## Task 3: Completed closet visibility and sidebar depth

**Files:** Modify `frontend/app/my-items/page.tsx`, `frontend/lib/use-resource.ts`, `frontend/components/app-shell.tsx`, `frontend/app/motion.css`; create `frontend/lib/closet.mjs`, `frontend/lib/closet.d.mts`, `frontend/tests/closet.test.mjs`; modify `frontend/package.json`.

**Interfaces:** `visibleClosetItems<T extends {status:string}>(items:T[]):T[]` filters only EXCHANGED. Extend `useResource<T>(path:string, options?:{refreshOnVisible?:boolean})` with an opt-in abortable visibility refresh; existing callers retain current behavior.

- [ ] Write a failing closet test with AVAILABLE, RESERVED, EXCHANGED and ARCHIVED fixtures; assert visible IDs exclude only EXCHANGED and original data is unchanged. Verify an all-EXCHANGED array becomes empty.
- [ ] Implement filtering once before cards/count/empty-state rendering. Opt inventory into page-entry/tab-return refresh; cancel visibility requests on cleanup and capability changes. Keep inventory API and database untouched.
- [ ] Wrap sidebar label text in `.nav-link-label`; extend the existing motion stylesheet with restrained perspective/translate/text-shadow on fine-pointer hover and keyboard focus. Add reduced-motion overrides; preserve existing active styles and mobile behavior. Cosmetic CSS needs visual verification rather than implementation-mirroring tests.
- [ ] Run frontend tests and build. Inspect keyboard/hover/reduced-motion and inventory states in the available browser. Record browser unavailability explicitly if tooling cannot provide one. Commit Task 3 together with the pre-existing motion stylesheet/layout import, after inspecting the combined diff.

## Task 4: Verify the combined workflow and deliver

**Files:** Update `docs/TEAM_QUICKSTART.md` and this plan's checkboxes. Regenerate the existing outer `PERDTU-team.zip` with `scripts/package-team.py`.

- [ ] Run backend/frontend test suites and production builds after all edits; run `smoke:exchange` and `smoke:chat` against the updated API. Verify reserved items remain visible, final receipt produces EXCHANGED and closet excludes them, completed trade history and chat remain readable.
- [ ] Use the browser skill to inspect multi-user acceptance/chat and sidebar effects if available; do not substitute HTTP checks for claimed visual coverage.
- [ ] Request one independent final review of the whole diff against the spec, concentrating on authorization, completion/send races, cursor boundaries and stale frontend sessions. Resolve material findings and rerun affected checks.
- [ ] Document migration, chat access rules, polling and completed-inventory behavior for teammates. Regenerate team ZIP and inspect archive entries to exclude real .env files, storage, model weights and dependencies.
- [ ] Mark verified steps complete, commit final documentation, leave services running with the verified code, and report results plus any browser limitation. Do not push.
