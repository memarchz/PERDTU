> Current listing-intent/local-AI contracts supersede the historical Wishlist/keyword descriptions below. See the final section and AI_MATCHING_VERIFICATION.md.

﻿# PERDTU API — local exchange journey

Base: `http://localhost:4000/api/v1`. Authentication: `Authorization: Bearer <token>`.

## Accounts and items

- `POST /auth/register {email,password,displayName}`: 201; password minimum 10 characters.
- `POST /auth/login {email,password}`: accessToken (2 hours) and user identity.
- `GET /users/me`: authenticated profile; no password hash.
- `GET /items?q=...&category=...`: available items, up to 40, newest first; public owners expose id/displayName only.
- `GET /items/:id`: public detail, 404 for missing/draft/archived items. Reserved/exchanged items can still be viewed.
- `POST /items {title,description,category,condition,area?,imageUrl?}`: authenticated creation, 201.
- `GET /me/items`: all listings owned by the authenticated user.

## Wishlist

- `POST /wishlist {description,category?}`: create a user-level preference, 201.
- `GET /wishlist`: current user's preferences.
- `DELETE /wishlist/:id`: 204 with no JSON body when owned; 404 for missing/another user's wish, 401 without authentication.

Wishes apply across the account, not to one specific listing. Creating a listing and saving a wish are separate requests. Frontend retry retains the created item id and retries only the wish request.

## Matches

`GET /matches` requires authentication. It returns an array of:

```text
{
  edges: [{from, to, itemId, score}],
  score,
  items: [{id, ownerId, title, description, category, condition, area, imageUrl, status, owner:{id,displayName}, ...}],
  participants: [{id, displayName}]
}
```

Matching uses keyword overlap and category similarity, not semantic AI. Search is anchored to the requesting owner so unrelated cycles do not consume the 30-result limit. The current candidate pool remains bounded to 500 available items / 1000 wishes and 20 outgoing edges per owner. Cycles contain 2–4 distinct owners. Display summaries are additive to the original edges/score response; never submit display data as proof of eligibility.

## Trades

- `POST /trades {edges:[{from,to,itemId},...]}`: 201. The caller must participate; available ownership and cycle eligibility are revalidated in the same serializable transaction as snapshot insertion. Every participant begins PENDING, including the proposer.
- `GET /trades`: only trades containing the current user, newest first.
- `GET /trades/:id`: rich detail for a participant; 404 for missing/nonparticipant, 401 without authentication.
- `POST /trades/:id/respond {accept:boolean}`: pending participants answer once. A decline makes the trade DECLINED. Everyone accepting atomically reserves all items and makes it CONFIRMED.
- `POST /trades/:id/receipt {}`: active participants confirm their incoming item once. Partial receipts make EXCHANGING; all receipts make COMPLETED and every item EXCHANGED. Returns `{completed:boolean}`.

Rich trade list/detail/create responses retain original properties and add:

```text
participants: [{id, tradeId, userId, decision, ready, received, user:{id,displayName}}]
items: [{id, tradeId, itemId, fromUserId, toUserId, snapshot:{...agreed item data}}]
events: [{id, tradeId, actorId, eventType, createdAt}]
```

Events are ordered by createdAt then id for stable ties. No participant email/password hash is included. Current snapshots contain agreed item details including title and imageUrl. Incompatible actions, unavailable items and stale state return 409; refresh before retrying. Serialization conflicts retry the entire transaction at most three times, and database diagnostics are not exposed to clients. Competing proposed trades may exist, but final acceptance prevents double reservation. Full request idempotency is not implemented.

## Uploads and remaining services

`POST /uploads/presign {contentType:'image/jpeg'|'image/png'|'image/webp'}` returns an OBS private-bucket presigned PUT URL/key when configured; otherwise 503. This legacy adapter is not the web upload feature. Local uploads, editing/archive and saved items are implemented below. Trade chat and notifications remain subsequent work.

Errors generally return `{error:string}`; validation errors also include field details. `/health` (outside `/api/v1`) confirms only the process, not database readiness. Frontend status updates use explicit refresh, not realtime delivery. This API is a development/pilot baseline.

## Local photos, owner mutations and saved collections

All paths below are relative to `/api/v1`.

- `POST /uploads/images`: authenticated multipart, exactly one `file`, 201 `{id,mime,bytes,width,height}`. JPEG/PNG/WebP <=5 MiB, static <=25M decoded pixels; stored as metadata-free static WebP <=1600px. Invalid/animated/malformed 400, oversize 413, anonymous 401. No client filename or storage path is exposed.
- `DELETE /uploads/images/:id`: 204 for an owned unattached upload; missing/foreign/attached 404.
- `GET /media/:id`: public only while attached to a visible item; otherwise 404. Returns image/webp, nosniff, private/no-store. Removed gallery entries retain historical attachment and remain readable while their listing is visible.
- `POST /items`: existing fields plus optional `photoIds` (0?4 distinct owned uploads). Explicit list sets gallery and first cover; ids attached elsewhere are rejected atomically. Legacy imageUrl-only creation remains supported.
- Listing detail/search/inventory include ordered `images:[{id,url,width,height,position}]`, retaining imageUrl. Internal photo filenames/owner metadata are excluded.
- `PATCH /items/:id`: authenticated owner partial fields plus photoIds; 200. Omitted photoIds preserves existing cover/gallery; [] clears; a supplied ordered list replaces active gallery without deleting history.
- `DELETE /items/:id`: authenticated owner soft archive; 204. Missing/foreign 404; not AVAILABLE 409. Both mutations cancel containing PROPOSED trades in the same serializable transaction, appending ITEM_UPDATED or ITEM_ARCHIVED. Snapshots and confirmed/completed trades remain intact.
- `GET /saved-items`: private current-user collection of `{id,itemId,createdAt,available,item,...}`. Visible items include listing details; archived/draft entries have only `{id,title,status}`.
- `PUT /saved-items/:itemId`: idempotent save of a publicly visible item, 200 entry; inaccessible 404.
- `DELETE /saved-items/:itemId`: idempotent unsave, 204. Saved actions never create wishes or exchange proposals. All saved routes require authentication.

## Listing intent and local AI (2026-10-17)

Item create/read/PATCH includes exchangeWanted (nullable3?500trimmed characters), exchangeCategory (nullable existing category) and exchangeOpenToAlternatives (defaultfalse). New create requires description or category. Omitted PATCH fields preserve intent; configured intent cannot be entirely erased. Legacy missing-intent listings remain readable and are excluded from matching.

Authenticated `/wishlist` and `/wishlist/:id` methods return410 guidance; anonymous401. No current route reads/writes Wish for matching/publication. Historical rows stay untouched.

`GET /matches?itemId=<owned available>&targetItemId=<optional public>&mode=direct|circles&alternatives=true|false` returns `{status,selectedItemId,model,matches,candidatesConsidered,truncated,message?}`. Without itemId the newest owned available intent-configured item is selected. Invalid query400, foreign selected404, unavailable target404. Ready200, preparing202 with Retry-After3, busy/unavailable503. Results include exact edges/items/participants, kind strong|alternative, viewerFit, per-receiver fits/reasons and content fingerprints. Scores are internal similarities, not acceptance probabilities. Direct alternatives still require a strong partner fit for our offered item.

Candidate search includes the selected item and requested target, up to500other available intent-configured items. Direct targeted searches examine that pair. Longer circles use a bounded search and report truncation conservatively. Model/content-keyed preparation is shared and cached; runtime model downloads are disabled.

POST /trades accepts existing edges and optional expectedFingerprints from suggestions. The server independently prepares semantic evaluation outside the transaction; inside the serializable transaction it re-reads current item ownership/availability/fingerprints and evaluates the exact directed cycle. Stale expected fingerprints409; incompatible current terms400; local AI busy/unavailable503. No model/network call runs inside the transaction. Snapshots contain listing-specific exchange terms. Editing still cancels pending proposals and final acceptance/receipts retain their existing protections.
