# Trade chat, completed inventory and sidebar motion

## Intent and approved approach

The user wants sidebar labels to lift with a raised 3D appearance on hover, completed exchange items to disappear from My closet, and a private group conversation once all participants accept a trade. The conversational design was approved on 2026-10-17. Extend the existing Next.js/Express/Prisma/PostgreSQL application and preserve existing data and the green/cream visual style.

Use persisted text messages with approximately three-second polling. This fits the current local/pilot application without adding a WebSocket service. WebSocket delivery is an alternative for a later scale or latency requirement. A separate external chat provider is unnecessary for this scope.

## Sidebar

Wrap the navigation label in a dedicated span. On hover or keyboard focus, lift and slightly offset the label, using restrained layered text shadows and perspective to create depth without moving surrounding layout. Preserve current icons, active indicators and mobile navigation. Respect prefers-reduced-motion by disabling label movement and animation. Extend the existing motion.css rather than introducing an animation dependency.

## My closet

Hide items with status EXCHANGED from the My closet cards, count and empty-state calculation. Keep AVAILABLE and RESERVED visible, preserving existing archived-item behavior. Completion means every participant has confirmed receipt; unanimous acceptance only reserves items and must not hide them.

Retain item rows, trade snapshots, photos and completed trade history. Do not delete records or change the inventory API contract used by other screens. Refresh inventory on page entry and return to the browser tab so completed exchanges become visible without signing in again. Cancel stale refresh work when the account changes or the page unmounts.

## Chat lifecycle and permissions

Each trade is its own conversation, shared by its existing participants, including two-person trades and three- or four-person circles. No separate room-creation step is needed: availability follows the authoritative trade state.

- PROPOSED: show a locked notice explaining that every participant must accept; no messages may be read or sent.
- CONFIRMED or EXCHANGING: members can read and send messages.
- COMPLETED: members can read the conversation; sending is disabled.
- DECLINED, EXPIRED, CANCELLED or DISPUTED: sending is disabled. Members may read existing messages from a previously opened conversation; a trade that never opened has no messages.

Anonymous requests return 401. Requests by authenticated nonmembers return 404. Check membership and trade state on the server for every read and write; frontend visibility is not authorization. Never expose participant emails or authentication data.

## Persistence and API

Add a TradeMessage model related to Trade and sender User through an additive Prisma migration. Store an identifier, trade ID, sender ID, plain-text body, creation time and a client-generated message identifier. Enforce uniqueness of the client identifier per sender and trade so retrying an uncertain send does not duplicate a message. Index messages for trade/time/identifier ordering.

Provide authenticated GET and POST endpoints under /trades/:id/messages. GET returns conversation availability, whether sending is allowed, and a bounded page of messages with public sender IDs/display names. Initially return the latest 50 in chronological order; support loading earlier pages with a stable creation-time/identifier cursor. New polling requests obtain messages after the newest cursor with bounded batches, following further pages when required. Validate cursor structure and trade scope.

POST accepts trimmed plain text of 1–2000 characters and a bounded client message identifier. Validate the request, membership and writable state and insert atomically with serializable retry using existing backend conventions. A retry with the same identifier and body returns the saved message; reuse with different content returns a conflict. A receipt racing with a send must result in either a valid message committed before completion or a rejected write after completion. Never render message text as HTML.

## Frontend behavior

Add a focused conversation component to the trade detail page. Display sender, message text, time, loading/empty/error states, a labeled composer and sending feedback. Preserve the draft when polling or trade refreshes occur. Clear conversation state on trade/account changes, ignore stale responses, and stop polling on unmount. Pause polling while the tab is hidden and refresh on return.

Poll the conversation status while locked so the final acceptance opens chat for other members without a manual reload. While writable, poll new messages approximately every three seconds. Avoid overlapping requests. Preserve history pagination and deduplicate messages by server ID. Keep the viewport stable when loading older messages; scroll to new messages when already near the bottom or after the current user sends.

Disable sending while a request is pending. Preserve the draft and retry identifier on uncertain errors; clear it only after a successful response. Do not claim delivery until the server acknowledges persistence. Read receipts, attachments, typing indicators, notifications and WebSockets are outside this change.

## Verification and rollout

Test chat authorization, unanimous acceptance gating, completed read-only behavior, validation, pagination boundaries, idempotent retries and the receipt/send race against the actual database. Test frontend session changes, polling cleanup and draft retention where the existing test harness supports them. Verify closet filtering with AVAILABLE, RESERVED and EXCHANGED fixtures. Run backend/frontend tests and production builds; inspect hover/focus/reduced-motion and multi-user chat in a browser if a browser is available, otherwise disclose that limitation.

Apply the additive migration without resets. Preserve local environment files and storage. Update team documentation and regenerate the existing team ZIP after verified implementation. Do not push changes to GitHub as part of this task without a new request.
