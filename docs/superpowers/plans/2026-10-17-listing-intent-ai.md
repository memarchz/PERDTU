# Listing Intent and Local AI Matching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, using the preserved Native method. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Wishlist from the product, expose per-listing exchange conditions and rank genuine reciprocal exchanges with local multilingual AI.

**Architecture:** Extend Item with exchange intent, persist content-addressed embeddings and isolate local ONNX inference from the Express event loop. One deterministic item-specific evaluator produces suggestions and validates submitted cycles; serializable transactions verify current fingerprints before recording immutable proposals. The existing Next.js UI consumes a versioned matching envelope with explicit strong/alternative labels.

**Tech Stack:** Existing Node20.16, Express4, TypeScript/CommonJS, Prisma5/PostgreSQL16, Next15/React19. Proposed exact runtime @huggingface/transformers3.8.1 (metadata checked), quantized Xenova/multilingual-e5-small at revision761b726dd34fb83930e26aab4e9ac3899aa1fa78. Recheck native support/license/audit before install; do not upgrade the framework or downgrade existing Sharp.

**Spec:** `docs/superpowers/specs/2026-10-17-listing-intent-ai-design.md` (user approved including Wishlist removal on2026-10-17).

## Global Constraints

- Wishlist is removed from live UI and matching; preserve historical Wish rows/table without destructive migration.
- exchangeWanted is nullable text, maximum500characters; new listings require a specific description (3–500characters) or selected wanted category.
- exchangeOpenToAlternatives defaultsfalse. Similarity is not consent, value or an acceptance probability.
- Preserve existing accounts, media, snapshots/events, saved items, auth and atomic reservation/receipt behavior; no reset, volume deletion, broad cleanup, deployment or Git initialization.
- Initial download uses public package/model hosts; subsequent inference is local without paid API or outgoing listing text.
- Model work stays outside serializable transactions and outside the Express event loop; never label keyword fallback as AI.
- Existing English UI accepts Thai/English descriptions. Legacy missing-intent listings remain visible but do not become inferred AI matches.
- Keep 2–4-person exchange support with per-item terms checked at each receiving edge, distinct owners/items and exact directed cycles.
- Non-Git checkout: preserve this plan's ignored baseline/ledger, config hashes and counts; do not use Git-dependent cleanup/commit scripts.

## Review Focus

- Two items owned by the same person can have different return terms: switching their outgoing item must not borrow another item's preference (Tasks3–5).
- Cold model loads, cancelled polling and simultaneous requests must not spawn unbounded workers/jobs or block unrelated API traffic (Task2/4).
- Stale AI results after intent/availability edits must fail proposal validation without rewriting historical snapshots or partially reserving items (Task4/6).
- An uninterested partner, category-only distractor or negated/exclusive wanted text must not become a confident bilateral match just because cosine is high (Tasks2–3).
- Retiring Wishlist must not recreate an already-published pending draft, leak an old user's state or leave a dead interested-item/bookmark link (Tasks1/5).

## File responsibility map

- `apps/api/src/exchange-intent.ts`: validation, normalized content and stable fingerprints.
- `apps/api/src/embedding-service.ts`, `apps/api/src/embedding-worker.ts`: bounded worker lifecycle, persistent vectors; no HTTP routes or trade writes.
- `apps/api/src/matching.ts`: pure per-item pair/cycle scoring, eligibility and ordering.
- `apps/api/src/match-service.ts`, `apps/api/src/match-routes.ts`: DB candidate pool, preparation jobs, versioned DTOs.
- Existing listing routes/trade-proposal/index: consume these helpers, retain transaction boundaries.
- Shared web exchange-fields and exchange-preference components: input/display only; matches page handles selection/loading/proposals.
- Existing services/matching-worker Python prototype is not the running Express matcher; preserve it and document that fact, without creating a second live algorithm.

### Task1: Listing intent and non-destructive Wishlist retirement

**Files:** Modify `apps/api/prisma/schema.prisma`, create forward `apps/api/prisma/migrations/<timestamp>_listing_intent_ai/migration.sql`, create `apps/api/src/exchange-intent.ts`, modify `apps/api/src/listing-routes.ts`, `apps/api/src/index.ts`; create `apps/api/scripts/intent.test.mjs`, `apps/api/scripts/intent-smoke.mjs`; update API package explicit test scripts.

**Interfaces:**
- Item adds `exchangeWanted String?`, `exchangeCategory String?`, `exchangeOpenToAlternatives Boolean @default(false)`.
- EmbeddingCache adds `key String @id`, `modelKey String`, `role String`, `contentHash String`, `vector Json`, `createdAt DateTime @default(now())`, unique[modelKey,role,contentHash]. No deletion of Wish relations or rows.
- `parseIntent(data,{creating:boolean}):{exchangeWanted?:string|null,exchangeCategory?:string|null,exchangeOpenToAlternatives?:boolean}` trims strings, enforces lengths/category enum, requires intent on new create; partial edits preserve omitted fields, and cannot erase all intent from an already-configured listing.
- `itemFingerprint(item):string` SHA256 covers id/owner/status/updatedAt/title/description/category and exchange intent. `embeddingText(item,role:'offer'|'wanted'):string` uses only relevant public text, with model query/passage prefixes; no account email/private fields.
- Existing listingDto naturally exposes new Item fields without internal embeddings. Authenticated obsolete `/wishlist` and `/wishlist/:id` routes return410 `{error:'Wishlist has been retired. Set exchange preferences on each listing.'}`; anonymous401. No Wish read/write.

- [ ] Create this plan's baseline/ledger before product changes. Capture config fingerprints/counts without secrets; run baseline API/web suites. Inspect all live Wishlist references, excluding dependencies/dated historical docs.
- [ ] Write tests asserting blank/oversize intent400, trimmed text/category intent accepted, category-only valid, explicit openness alone invalid, partial legacy edit allowed, fingerprint changes when either offer/intent/status changes. Run compiled tests RED before helper implementation.
- [ ] Add schema fields/cache model, inspect additive SQL then apply/generate without reset. Compare preexisting table counts immediately. Implement helpers and listing create/PATCH validation through existing ownership/serializable paths.
- [ ] Add API smoke create→read→PATCH intent persistence, nonowner404, reserved409 and legacy missing-intent read. Add retired routes401/410 and unchanged Wish-count assertions. Observe failure before replacing live Wishlist handlers.
- [ ] Run API build, intent tests/smoke and migration status. Expected: all pass, original rows/config preserved. Existing old smoke creates need explicit intent updates in Task6; do not claim old scripts remain green until updated.

### Task2: Real local embeddings, setup and measured calibration

**Files:** Create `apps/api/src/embedding-worker.ts`, `apps/api/src/embedding-service.ts`, `apps/api/src/ai-model.ts`, `apps/api/scripts/setup-matching-model.mjs`, `apps/api/scripts/embedding.test.mjs`, `apps/api/scripts/evaluate-matching-ai.mjs`, `apps/api/fixtures/semantic-matching.json`, `apps/api/fixtures/matching-calibration.json`; modify API package/lock, `.gitignore`, `.env.example` only.

**Interfaces:**
- `MODEL={id,revision,dtype:'q8'}` with modelKey including all3 plus preprocessing version. Model directory fixed workspace-owned `apps/api/storage/models`, excluded from media routes and existing ignored storage. Runtime remote loading disabled; only explicit setup enables model download at pinned revision.
- `EmbeddingService.status():{state:'loading'|'ready'|'unavailable';error?:string}`, `prepare(texts:{role,contentHash,text}[]):Promise<Map<string,number[]>>`, `close():Promise<void>`; persistent cache hit skips inference, vectors normalized and finite, key/model/dimension checked.
- One worker_threads Worker, singleton initialization, one inference batch at a time, batch size8, queue cap2 jobs (bounded pending text arrays), per-job30second timeout and cold initialization120second timeout. Reject overflow503 rather than adding workers. Worker failure clears pending requests and permits one clean retry. Timeout must terminate/reset a stuck worker, not just discard the response while CPU work accumulates.
- Setup command `npm.cmd run ai:setup` downloads assets then runs a real probe; `npm.cmd run ai:evaluate` writes measured score/ranking/latency report. No download merely from editing a listing.
- Calibration JSON stores modelKey, preprocessing/scoring version, strong and alternative cutoffs plus labeled evaluation metadata; never portray values as acceptance percentages.

- [ ] Inspect exact resolved engines/license/native Windows support and upstream model license, including base model card if ONNX card omits it. Install pinned compatible runtime only after these checks, retain locks and audit. Document transitive Sharp changes separately; keep application Sharp0.35.5.
- [ ] Write injected-worker tests: concurrent initialization shares one worker, cache survives new service instance, wrong model/hash cannot reuse vector, nonfinite/dimension-invalid data rejected, queue cap, timeout/reset, cancellation isolation, missing model has useful error. Run RED, then implement service and worker. Keep dynamic ESM import in worker compatible with existing CommonJS build; do not change the whole API to ESM.
- [ ] Implement setup with pinned revision, local cache and explicit runtime readiness probe. Run actual download/inference; record bytes/revision/license/CPU latency, no claims based solely on fake vectors.
- [ ] Build24labeled text comparisons across lamps/backpacks/books/keyboards/sports: exact matches, Thai paraphrases, Thai↔English, same-category wrong objects, unrelated objects and strict negation. Split calibration/evaluation before measuring. Include triples such as want 'กระเป๋าเป้ใส่โน้ตบุ๊ก' vs offered 'Laptop backpack' and unrelated 'Desk lamp'.
- [ ] Select cutoffs from measured calibration positives/negatives; require held-out intended offers outrank their unrelated distractors and no labeled unrelated pair qualifies as strong. Record failures honestly; adjust model/preprocessing when necessary, rerun all real fixtures, never delete a failing fixture simply to pass. Arbitrary exclusion semantics are guarded explicitly in Task3, not assumed solved by embeddings.
- [ ] Run API build, embedding tests and ai:evaluate. Expected: local inference works offline after setup, reproducible ranking evidence and bounded lifecycle tests pass. Store measured report in this plan's ledger and publish summary in docs, not raw private listing text.

### Task3: Item-specific reciprocal matching and ranked alternatives

**Files:** Replace active logic in `apps/api/src/matching.ts`; create `apps/api/src/match-policy.ts`; rewrite `apps/api/scripts/matching.test.mjs`; create policy tests as needed.

**Interfaces:**
- `MatchItem` contains existing public offer fields and exchange fields; no Wish input.
- `scoreDirection(offer:MatchItem,receiverGives:MatchItem,vectors,policy):Fit` returns `{score:number,semanticScore:number,kind:'strong'|'alternative'|'ineligible',reason:string}`. Description cosine plus category boost <=0.05; category boost cannot promote a below-strong semantic score to strong. Category-only intent can be strong only on exact requested category and must be labeled category-only.
- `evaluateCycle(items,edges,viewerId,policy,vectors):Evaluation` verifies explicit item per giver/receiver, unique owners/items, one give/receive, directed closed2–4cycle, no missing intent. Exclusions/strict language do not permit weak alternatives. Conservative unsupported negation returns ineligible/needs clarified terms instead of fabricating a reliable semantic exclusion parser.
- `findItemCycles(items,anchorItemId,{mode:'direct'|'circles',includeAlternatives,limit:30},vectors,policy):Evaluation[]` starts with selected outgoing item. Strong group first, then permitted alternative group; descending viewer incoming fit, partner/weakest fit, stable directed key for ties. Direct alternatives require strong partner fit for our offered item and our explicit alternatives opt-in. Every weak recipient in a longer cycle must opt in.
- Pure evaluator is reused for proposal validation without requiring a cycle to appear in an arbitrary top-N list. No I/O/model call from pure scorer.

- [ ] Write RED tests for reciprocal versus one-way, different outgoing items of the same owner, selected owner after many unrelated cycles, same-category distractors, no-intent/own-owner, ordering by viewer incoming fit, weaker alternatives blocked unless opted in, uninterested partner never direct alternative, negation/exclusivity, category-only honest labeling.
- [ ] Write RED 3/4person cycle tests, repeated user/item rejection, nonclosed/disconnected submission rejection and two opposite directed cycles using the same3items. Assert every displayed cycle independently passes evaluateCycle.
- [ ] Implement pure scorer/policy/cycle enumerator with bounded search and stable identity. Bound mode/candidate dimensions; return enough search metadata to distinguish no match from truncated search. Do not reuse old owner-level adjacency.
- [ ] Run matching unit suite with injected vectors, then real model fixture ordering tests from Task2. Expected: algorithm correctness and real AI quality both pass; neither substitutes for the other.

### Task4: Matching API, bounded preparation and safe proposal validation

**Files:** Create `apps/api/src/match-service.ts`, `apps/api/src/match-routes.ts`; modify `apps/api/src/index.ts`, `apps/api/src/trade-proposal.ts`; update `apps/api/scripts/trade-proposal.test.mjs`, `apps/api/scripts/proposal-race-smoke.mjs`; create `apps/api/scripts/ai-matching-smoke.mjs`.

**Interfaces:**
- Auth `GET /matches?itemId=<owned>&targetItemId=<public optional>&mode=direct|circles&alternatives=true|false`. Without itemId choose newest owned AVAILABLE intent-configured listing; no valid listing returns ready empty response with a setup reason, not a Wish fallback.
- Versioned envelope `{status:'ready'|'preparing'|'unavailable',selectedItemId,model:{id,revision,scoringVersion},matches,candidatesConsidered,truncated,message?}`. Ready200; preparing202 with Retry-After3; unavailable503 safe error/envelope. Client must handle202 explicitly. Foreign selected404; missing/hidden target404; bad query400.
- Stable newest candidate pool: selected item always included, target included if public/available, up to500other available intent-configured items, take501 to detect truncation, deterministic createdAt/id ordering. Filter target requires it to participate, not just appear in candidate pool. Never claim global exhaustive search.
- `prepareEvaluation(edges,userId):Promise<{fingerprints:Record<id,string>;evaluation:Evaluation;modelKey:string}>` loads real selected items, prepares cached vectors outside transaction and evaluates exact cycle. Match preparation jobs keyed by content/model/request fingerprint, at most2jobs via Task2 queue,60second result TTL; HTTP requests return202 instead of awaiting long work. Repeated polls share preparation; new content fingerprint cannot reuse old result.
- `createProposal(db,userId,edges,prepared)` requires trusted server-generated evaluation. Within runSerializable reload selected items, verify status/ownership/fingerprint and exact cycle, then create snapshots. If content changed409; no model work inside transaction and no client score accepted. Existing final acceptance/receipt transaction stays unchanged.

- [ ] Write RED API/service tests for own-item inclusion past candidate cap, hidden/foreign target, target-filter correctness, preparing202/repeated polling/shared work, cache invalidation after edit,503 model failure and no fake ready results.
- [ ] Write RED actual proposal regression tests: stale intent/offer/status rejects409, no model call inside transaction, fingerprints retried on serialization, invalid disconnected cycle400, valid low-ranked cycle accepted independently of list topN.
- [ ] Implement service/router and replace /matches plus proposal validation call sites. Retire imports/reads of Wish from running paths, not just hide their output.
- [ ] Run real AI smoke with2users/reciprocal Thai-English listings, one-way distractor and permitted weaker alternative. Poll boundedly (3seconds, maximum120seconds) and assert sorted classification, actual returned give/receive ids and POST proposal snapshots.
- [ ] Adapt deterministic proposal read→PATCH/DELETE→insert gate test to fingerprints. Race latest proposal/final acceptance vs listing edit/archive; require one consistent outcome, no stale confirmable snapshot or partial reservation. Run API tests and real smoke. Expected: passing current-term validation, explicit cold/error states and privacy.

### Task5: Remove Wishlist UI and show useful exchange choices

**Files:** Modify `apps/web/lib/types.ts`, `apps/web/lib/publish.mjs` and declaration/tests, `apps/web/app/post/page.tsx`, `apps/web/app/items/[id]/edit/page.tsx`, `apps/web/components/item-card.tsx`, `apps/web/app/items/[id]/page.tsx`, `apps/web/app/my-items/page.tsx`, `apps/web/app/matches/page.tsx`, `apps/web/components/app-shell.tsx`, `apps/web/app/profile/page.tsx`, `apps/web/app/page.tsx`, `apps/web/app/globals.css`; replace `apps/web/app/wishlist/page.tsx` with redirect; create shared `exchange-fields.tsx`, `exchange-preference.tsx`, `lib/matches.mjs`/declaration/tests; update explicit test-file list.

**Interfaces:**
- ItemSummary gains nullable optional exchangeWanted/exchangeCategory and exchangeOpenToAlternatives for legacy snapshots. Match types use Task4 envelope/direction fits, not raw percentage confidence.
- Publish submits one item with intent/photoIds and never writes Wish. Helper returns itemId; onItemCreated persists it before navigation. Restore an old created-item draft to Edit with notice to set exchange intent, never POST again. Do not silently turn historical account-wish draft text into item-specific consent.
- Shared fields text/category/openness map exactly to API names; same validation Post/Edit. Preference component is display-only, used Explore/detail/inventory with missing-intent message and owner edit action.
- Interested detail link becomes `/matches?targetItemId=<id>` with existing sign-in return path. Matches offers owned-item selector, direct/circles selector and Include similar alternatives (effective only when selected listing permits them). No items→Post; missing intent→Edit; legacy /wishlist→/my-items via server redirect, preserving auth guard downstream.
- Client poll helper consumes202, aborts superseded selections/unmount, maintains one timer, caps120seconds and gives retry state; stale account/selection results cannot replace current results.503 shows model unavailable, never 'no matches'. Display readiness/progress without exposing setup implementation details to ordinary product users.

- [ ] Add RED tests for publish no-Wish writes, already-created legacy draft recovery/no duplicate POST, intent payload persistence, actual API202→ready helper cancellation/timeout and stale selection/session behavior. Preserve auth races/photo deletion busy tests and saved-item tests.
- [ ] Implement fields, intent display and publishing changes. Replace account-wish partial-failure UI/tests with single-listing recovery tests; never drop photo ids or text on failure. Keep archival/ownership restrictions.
- [ ] Remove live Wishlist links/copy from sidebar/profile/home/matches/detail. Implement legacy redirect and interested-target flow; scan rg references excluding historical docs/deps to verify no dead links. Saved items remains unchanged.
- [ ] Render each suggestion with exact You give/You receive, both wanted terms and explicit strong/alternative reasons. Group strong above alternatives and preserve server ordering. Longer cycles show every participant's terms plus CycleView. All proposals require explicit accept afterward.
- [ ] Run frontend tests/build. If supported Browser connects, verify Post→Explore→detail→selected-item matching→proposal, owner edits, alternatives, target flow, legacy redirect and mobile wrapping. Otherwise record interactive limitation separately from real API/model evidence.

### Task6: Full regressions, persistence, independent review and documentation

**Files:** Update `README.md`, `docs/API.md`, dated verification pointers, create `docs/AI_MATCHING_VERIFICATION.md`; modify smoke fixtures `smoke.mjs`, `exchange-smoke.mjs`, `media-smoke.mjs`, `proposal-race-smoke.mjs` and relevant tests; preserve this plan's ignored logs/baseline.

- [ ] Replace fixture Wish writes with explicit per-item wanted terms that preserve their original directed2/3/4cycles, competing reservations and snapshot scenarios. New create validation is enforced, not bypassed for tests. Retired Wishlist tests assert401/410 and existing Wish rows retained. Do not claim old exact request counts if assertions changed.
- [ ] Run API/frontend full tests and builds, intent/AI/media/foundation/exchange/proposal-race smokes, real ai:evaluate and migration status. Inspect every exit code; diagnose demonstrated failures before completion. Record modelKey/calibration and ranking results, not just unit success.
- [ ] Restart owned API, confirm intent and embedding cache persist and local inference works with downloads disabled; verify warm queries reuse vectors. Confirm unrelated /health/auth responsiveness while inference runs, queue limits, model unavailable state and no file publication.
- [ ] Verify old Wish records/config hashes/data survived, manifests match locks, model setup license/revision tracked, no secrets/raw personal text in logs, API runtime paths local and no network inference. Audit actual resolved dependency trees without unrelated forced upgrades.
- [ ] Obtain one independent fresh-context final review under preserved Native workflow, with this spec/plan/ledger and Review Focus verbatim. Fix verified Critical/Important findings with observed regressions and rerun affected suites; record deferred Minor findings. No implementation subagents required.
- [ ] Document setup/download size and latency measured here, cold/warm behavior, known semantic/exclusion/candidate-limit caveats, no acceptance-probability claims, legacy missing-intent migration path, Wishlist retirement and preserved data. Leave the local preview running; do not publish externally or delete the non-Git baseline.

## Self-review and execution handoff

All8spec acceptance criteria map to Tasks1–6. Review Focus has explicit tests in its owning tasks. Task2 embeddings/policy are consumed by3/4; Task1 fingerprint fields match4; Task4 envelope/202 behavior matches5. Lifecycle limits are pinned and real model quality is measured before claims; no arbitrary cosine value is specified as universally correct. Strict free-text exclusions are conservatively handled and documented rather than claimed solved by an embedding.

Spec approved. Native execution method is preserved from the existing session: implement inline with one final independent review, no new method selection. This written plan now awaits user review; after confirmation, execute all6tasks without intermediate approval pauses.
