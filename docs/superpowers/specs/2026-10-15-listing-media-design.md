# PERDTU subproject 2: listing media, management and saved items

## Intent and existing context

Continue the user's approved marketplace-completion request after the implemented exchange journey. Add actual photos, safe owner editing/archiving and persisted saved-item favourites to the existing local application. Keep the same frontend, API, database, visual system and accounts. Chat and in-app notifications are subproject 3, not removed from the overall request.

The existing OBS adapter has no configured cloud credentials. This subproject must work locally without an external account, paid service or publishing. The media implementation is new; existing imageUrl data and trade snapshots must keep working.

## Selected approach

Use a local, ignored API storage directory plus PostgreSQL metadata. Add an upload/decode pipeline and serve only validated, attached images through an explicit media route. This enables real local upload immediately. Preserve the OBS adapter separately for later cloud migration; do not switch storage based on a missing credential or claim an unconfigured cloud upload succeeded.

Alternatives considered: requiring OBS setup would block this local phase on external credentials; storing base64 image blobs in listing rows would bloat API/database responses and bypass the intended upload lifecycle. Neither is selected.

## Photos

- An authenticated owner can upload JPEG, PNG or WebP, at most 5 MiB per source file and at most four photos per listing.
- Validate actual decoded content, not only filename/MIME. Reject SVG, animated content, malformed files and excessive decoded dimensions; limit input to 25 million pixels. Re-encode to a static WebP, maximum 1600px longest side, preserving aspect ratio and stripping source metadata. Choose a maintained Node-20-compatible multipart/decoder dependency during implementation planning after checking engines/advisories.
- Use cryptographically random server-generated identifiers/filenames. Never use a client filename as a filesystem path. The storage root defaults inside `apps/api/storage/`, is ignored, and stays within this workspace for local execution.
- A new `Photo` row records owner, generated filename, MIME, byte size, dimensions, createdAt and nullable item association/position. An unattached upload is private and can be attached only by its owner. Upload response returns an id and metadata, not filesystem paths.
- Add authenticated `POST /uploads/images` (multipart single file) and `DELETE /uploads/images/:id` for an owned unattached upload. Foreign/missing media return 404; oversize input returns 413; unsupported/invalid content returns 400. Failed decoding must not leave a public file or usable photo row.
- Listing create/update accepts up to four owned photo ids in display order, attaches them atomically, and adds an `images` array to item DTOs. Retain imageUrl as the primary image for old consumers; existing external image URLs remain readable.
- Public `GET /media/:id` serves decoded WebP only when attached to a publicly visible item, with correct Content-Type and nosniff. Random ids do not grant access to unattached uploads. No directory listing or arbitrary file-path endpoint is exposed. Archived listings are not publicly visible.
- Post/edit screens support file selection, previews, remove/reorder, clear validation errors and pending states. Preview URLs are released on removal/unmount. Rejected uploads do not erase text input or create a listing.
- Keep the existing two-step listing/wish recovery. Attach already-uploaded photos when creating the item; a failed wish save must never duplicate the item or re-upload its photos on retry.

## Owner editing and archiving

- Add authenticated `PATCH /items/:id` for owned AVAILABLE items; update title, description, category, condition, area and photo order/selection using the existing validation limits. Ownership is checked server-side.
- Add authenticated `DELETE /items/:id` as soft archive, never hard delete a listing with history. Inventory exposes an explicit archive confirmation and shows archived state; public browse/detail exclude archived listings.
- RESERVED and EXCHANGED items cannot be edited/archived through these actions (409). The UI explains the state rather than providing a misleading active button.
- Editing or archiving an AVAILABLE item invalidates any still-PROPOSED trades containing it in the same serializable transaction. Mark those proposals CANCELLED and append an `ITEM_UPDATED` or `ITEM_ARCHIVED` event with the owner as actor. Do not reserve/unreserve items in other trades or change a confirmed/completed trade.
- Concurrent final acceptance vs editing/archiving must result in one consistent outcome: either reservation wins and the edit is rejected, or the edit/archive cancels the pending proposal and acceptance is rejected. Retry P2034 only within the existing bounded helper.
- Preserve existing snapshots/events; never silently rewrite a previously agreed snapshot. Teach the timeline meaningful wording for the two new invalidation events and show terminal cancellation without mutation buttons.
- Use `/my-items` to reach `/items/:id/edit`; preserve the public item detail route and hide editing from other owners. All ownership checks remain authoritative in the API.

## Saved items

- Add `SavedItem` with userId/itemId unique pair and createdAt. Saved-item favourites are distinct from wishlist preferences: saving an item does not alter matching preferences or create a proposal.
- Add authenticated `GET /saved-items`, `PUT /saved-items/:itemId` (idempotent save), and `DELETE /saved-items/:itemId` (idempotent removal). Missing/inaccessible items cannot be newly saved. Other users cannot read or change someone else's collection.
- Add a working Saved items navigation destination, card/detail save toggles and `/saved-items`. Do not nest a button inside an item-card navigation link; use separate accessible sibling actions.
- Saved collections display current availability. An archived/missing item is represented as unavailable without a dead detail link; do not delete unrelated user data as cleanup. Unavailable saved items cannot be proposed as available.
- Anonymous save actions return through login to a safe local destination; perform the actual save deliberately after authentication. No fake favourite counts or optimistic success before the API confirms.

## Data and migration

Add only Photo and SavedItem models with their user/item relations and indexes. Apply a forward migration to the existing development database, preserving all accounts/items/trades and the initial migration. Do not reset, drop volumes or rewrite historical snapshots. Record file storage separately from database backups; local files must survive API restart. Storage cleanup of unrelated or historical media is not an implicit permission to delete it.

## Verification and acceptance

1. A user can upload real supported photos, publish an item and view the resulting gallery after a page/API restart. Legacy imageUrl-only items still render.
2. Oversize, unsupported, malformed and excessive-pixel inputs are rejected; foreign/unattached media is not publicly served or attachable by another user; path-like filenames cannot escape storage.
3. Four-photo order is retained; a fifth is rejected clearly. Removing a draft preview does not publish or duplicate an item.
4. Only the owner can edit/archive; reserved/exchanged items reject it. Pending-proposal invalidation and concurrent acceptance are atomic and tested against PostgreSQL.
5. Item/wish partial-success retries retain the original item/photo association.
6. Save/remove is persistent and idempotent; collections are private; saving never creates a wish or proposal. Unavailable saved items have an honest state.
7. Existing frontend/API tests, exchange smoke and builds still pass. Add real multipart/file-decoding, authorization, persistence and concurrency checks; do not replace database/media handling with fake success.
8. Verify browser upload/gallery/actions at mobile/desktop widths when a browser is connected. If unavailable, record that limitation separately from HTTP/file/API results.

## Self-review

The design preserves old DTO fields, protects the existing trade state machine, specifies the effect of editing proposed items, separates favourites from matching wishes, and does not assume OBS credentials. Forward migration and local-file persistence are explicit. No deployment, chat service or unrelated production redesign is included. A separate implementation plan follows user review of this written design.
