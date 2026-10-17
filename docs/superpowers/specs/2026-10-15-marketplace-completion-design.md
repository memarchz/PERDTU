# PERDTU marketplace completion design

## Purpose and existing authorization

The user wants the missing parts of the existing barter website implemented, using `PERDTU_UXUI.png` as the visual reference. The local foundation is already installed and verified against PostgreSQL. Continue in the supplied checkout with Next.js, React, Express, Prisma and PostgreSQL. Do not replace the project, publish a hosted Site, or reset existing data.

Success means a person can offer an item, describe what they want, find an exchange, agree with the other participants and confirm receipt through the website. Photos, trade conversations and notifications should support that journey. Real user data must be persisted, and empty or unavailable states must be honest.

## Approach and alternatives

Recommended: incrementally extend the existing application in three focused subprojects, each with its own implementation plan and verification. This preserves existing accounts/listings and lets each deliverable run independently.

Alternative: redesign all screens before wiring functionality. This produces visual progress but delays validating the actual exchange journey.

Alternative: replace the backend or build a separate hosted application. This would duplicate working authentication, database and transaction logic and is not selected.

## Delivery decomposition

1. **Exchange journey and reference UI** — detailed specification below. Implement the visual foundation and connect wishlist, matching, proposals, responses and receipt confirmation through real APIs. Include account/profile basics and owner inventory needed to manage this flow.
2. **Listing media and saved items** — implement actual local uploads without requiring cloud credentials, photo selection/display, listing editing/archiving rules and saved-item persistence. The existing OBS signing endpoint has no configured endpoint/bucket/credentials; the local website must not depend on purchasing or configuring a cloud service.
3. **Trade conversations and in-app notifications** — participant-only persisted text conversations linked to a trade; notifications for proposals, responses, completion and new messages. Use polling for the first local release; show delivery/read state accurately. Do not call polling WebSocket real-time chat. No emails, SMS or browser push permissions are needed.

These are delivery boundaries, not a cancellation of the remaining work. Each later subproject must receive its own detailed spec and plan before implementation, following the active workflow requirements.

## Assumptions available for correction

- Primary use is the existing local development/pilot application; no deployment is requested.
- Keep the main UI language English, matching both the supplied screens and existing application; preserve the Thai PERDTU brand where an appropriate logo asset can be used.
- Preserve green/cream branding, rounded cards and the reference's desktop navigation/mobile layouts. The supplied image is a reference board, not a standalone library of production assets.
- Use real API/database data. Do not invent member counts, carbon-savings figures, distances, user reviews or an AI capability to imitate the picture.
- Keep the existing keyword matcher for the exchange journey and label it "Matches" or "Suggested swaps". A multilingual semantic model is a separate model/service decision with download, evaluation and runtime requirements; it is not silently substituted with keyword matching advertised as AI.
- Google/Apple login, radius maps, shipping tracking and video are not configured. Omit inactive controls rather than presenting them as working features. Basic area text remains available; do not show computed distance without coordinates and calculations.

---

# Subproject 1: Exchange journey and reference UI

## Functional scope

### Public home and browse

Rebuild `/` around the reference's forest-green logo area, spacious headline, closet/reuse illustration, clear get-started action and four understandable exchange steps. Provide a real browse entry point. Do not show fabricated impact counters.

Rework `/explore` as the main application dashboard/browse surface: desktop sidebar, top search, category controls, reusable item cards and a useful empty state. Existing public browse stays available without signing in. Newest available items are described as recent listings rather than personalized recommendations unless actual preference filtering is applied. The search query and selected category are reflected in URL search parameters and API requests.

Use a consistent navigation shell across explore, post, inventory, wishlist, matches, trades and profile. On mobile, replace the wide sidebar with a compact navigation pattern that exposes every implemented destination. Avoid dead navigation entries for later subprojects.

### Account and profile

Keep email/password registration and login. Add pending/error states, password length guidance, accessible form labels and prevention of duplicate submit clicks. After a successful login, direct the user to the requested protected destination or explore; validate return paths as local application paths.

Read signed-in user details through `/users/me`. Supply a profile screen with display name/email and logout. Display name editing is optional to later scope; do not show a non-working Save button. Keep the existing sessionStorage token strategy for this local phase; centralize token access rather than inventing an additional authentication system. Expired/rejected credentials clear local session state and return the user to sign-in, preserving a safe return destination.

### Post, inventory and wishlist

Rework the existing post form to include area text, existing category/condition fields and a separately labeled wanted-description field. Publishing a listing uses the existing item API; adding a nonempty wanted-description uses the wishlist API. The two requests are separate operations: if listing creation succeeds but wish creation fails, retain the created item id and offer a wish retry without publishing the item again.

Add `/my-items` using `/me/items`, including visible AVAILABLE/RESERVED/EXCHANGED state. Editing and uploads belong to subproject 2; links and status remain useful before then.

Add `/wishlist`: list, create and delete the current user's wishes. Extend API with authenticated `DELETE /wishlist/:id`, checking ownership. Do not expose another user's wishes for deletion. Wishes are user-level preferences, as in the current schema; the form and UI must not imply a wish belongs to one specific item.

### Item detail and interested action

Preserve `/items/[id]`; use a reference-inspired image area, metadata, description, owner and condition display. The initial phase displays existing imageUrl values with a designed placeholder when missing; actual upload is in subproject 2.

For another person's available item, "I'm interested" leads to the user's wishlist with an explicit prefilled description/category derived from that item. Saving the wish is a deliberate action, followed by a link to matches. Owners see a link to their inventory instead. A reserved/exchanged item cannot be offered as available.

### Matches and proposals

Add `/matches`: show candidate 2–4-person cycles from the existing algorithm. Each candidate shows the participant names, item titles/photos, who gives what to whom and the current user's incoming/outgoing item. A circular diagram may supplement an accessible textual list. No matches state explains that available items and complementary wishes from multiple owners are needed.

The existing response returns ids and scores only. Extend the match response additively with minimal item and public owner summaries (id/displayName; never email/passwordHash). Keep the existing edges and score properties compatible.

Propose uses `POST /trades` with only the selected cycle's `{from,to,itemId}` edges. Revalidate item availability and cycle eligibility on the server; do not trust display data. Disable pending actions and refresh stale candidates when the API returns a conflict. The proposer must explicitly accept just like other participants unless the existing contract is intentionally changed and separately tested; creating a proposal alone is not acceptance.

### My trades and detail

Add `/trades` with current-user participation filtering and status filters; add `/trades/[id]` for the cycle, acceptance decisions, event timeline and receipt confirmation. Add authenticated `GET /trades/:id`, returning 404 for missing/nonparticipant trades to avoid disclosing membership.

Enrich trade responses additively with participant display names, item snapshots and ordered events. Expose only participant-relevant data. Snapshot images/titles preserve the agreed listing as far as the existing schema allows.

Actions follow the existing state machine:

- PROPOSED: a pending participant may accept or decline once.
- All participants accepted: reserve all items atomically and set CONFIRMED.
- CONFIRMED/EXCHANGING: an eligible participant may confirm their incoming item once.
- Some receipts: EXCHANGING; every receipt: COMPLETED and all traded items EXCHANGED.
- DECLINED: no further acceptance/receipt actions; retain the history.

Render disabled actions based on membership, decision, receipt and state; enforce all checks on the server too. Show a success message only after the server confirms success. Concurrent acceptance/receipt conflicts must be recoverable via refresh/retry without duplicate transitions or double reservation. The UI must not claim shipment, handover evidence or dispute management exists. Unknown statuses are displayed safely without suggesting unsupported actions.

## Architecture and data

- Keep existing `/api/v1` authentication, listing, wishlist, match and trade contracts; additions are backward compatible.
- Introduce shared frontend API/auth helpers and focused reusable UI components (navigation, form fields, buttons, item cards, statuses, cycle presentation, empty/loading/error states). Keep page components focused on their own flow.
- Extract backend trade handling into a focused module if required to test authorization/state transitions; do not perform unrelated wholesale restructuring.
- This subproject requires no new database models. Preserve all rows and the existing migration. New wish deletion and trade-detail APIs use current tables.
- No Redis/job service, external model, paid API or cloud upload is required for subproject 1.
- Every resource protected by ownership/participation checks is fetched using the active user identity, not ids supplied as proof of identity by the client.

## Visual and accessibility requirements

Use the supplied reference's cream background (#faf8f2), forest accents (#0d5f4d), warm secondary highlights, large editorial headlines, rounded image cards and restrained borders/shadows. Keep controls readable with keyboard focus indicators and visible labels. Do not remove outlines without a visible replacement.

Use original vector/code-native brand treatment or appropriately produced local assets; never present the entire reference board as the live UI. Decorative imagery must not imply it depicts a real listed item. Existing item photos remain data content.

Support 360px mobile and desktop widths without horizontal content overflow. Long item titles, names, empty listings and 4-person cycles must remain readable. Category controls, navigation and trade actions must remain usable with keyboard input. Loading, errors, success and empty results must be visually distinct; keep the earlier missing-item/API-error regression fix.

Retain Tailwind 3 for this focused flow unless a compatible dependency patch resolves findings without changing architecture. The previously reported Tailwind advisory backlog remains explicit; a major migration must not be silently combined with this subproject. Do not describe a local pilot as production-ready.

## Verification and acceptance

1. Existing foundation builds/tests/smoke still pass; protected routes handle anonymous and expired sessions.
2. Two fresh local users can create complementary listings and wishes, find a cycle and propose it from the UI/API contract.
3. Every participant can inspect the correct incoming/outgoing item, explicitly accept, and see reservation only after unanimous acceptance.
4. A declined proposal cannot become confirmed through later responses.
5. One receipt cannot complete a multi-person trade; all receipts complete it and remove exchanged items from public availability.
6. A nonparticipant cannot read/respond/confirm a trade. A user cannot delete another user's wish.
7. Concurrent competing confirmations cannot reserve one item twice; transaction conflicts do not create partial reservation.
8. The frontend displays real names/items/events and handles no matches, unavailable items, missing resources, API outages and expired sessions without crashes or false success.
9. Publish success followed by wish failure is recoverable without duplicating the published item.
10. Both builds and focused regression/integration tests pass. Browser visual/interactive checks are performed if a browser is connected; otherwise clearly record that limitation and distinguish API evidence from browser evidence.

Use clearly labeled local test accounts/items; preserve existing user data and environment files. Do not log secrets. No public deployment or Git initialization is included. Record implemented screens and the remaining media/communication subprojects accurately at handoff.

## Design self-review

Checked against the existing code, schema and reference image. API enrichment retains current fields; trade actions preserve current acceptance semantics; wishes are explicitly user-level. All core screens have working destinations and error behavior. Later upload/chat/notification work is separated rather than represented by inert controls. No cloud credentials or browser connection are assumed. There is no Git repository to commit this document to.
