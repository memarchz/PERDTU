# Trade chat and closet verification — 2026-10-18

Implemented on local branch `feat/trade-chat-closet`; no GitHub push performed.

## Delivered behavior

- Sidebar navigation labels lift with layered shadows on fine-pointer hover and keyboard focus. Reduced-motion preferences disable the effect.
- My closet excludes EXCHANGED items from cards, counts and empty-state calculations. RESERVED items remain visible. Returning to the page/tab refreshes inventory; item rows and trade history are retained.
- Each trade has a private persisted text conversation, writable only in CONFIRMED/EXCHANGING after unanimous acceptance. Completed exchanges retain read-only chat. Messages poll approximately every three seconds while the tab is visible; older pages are available, retry identifiers prevent duplicate sends and account changes discard the old client conversation.
- Additive migration `20261018000000_trade_messages` was applied to the local PostgreSQL database without a reset.

## Evidence

- Backend: `npm test` — 25 passed, 0 failed, including TypeScript build.
- Frontend: `npm test` — 63 passed, 0 failed. Actual component harness covers draft retention and batched history scroll anchoring; it does not represent browser rendering coverage.
- Chat integration: `npm run smoke:chat` — 104 HTTP checks passed with actual PostgreSQL fixtures. Includes 2/3/4-member acceptance, participant isolation, validation, equal-timestamp cursor pagination, idempotent concurrent sends, completion/send races, RESERVED inventory before receipt and EXCHANGED inventory afterward.
- Existing exchange regression: `npm run smoke:exchange` — 128 HTTP requests passed, including three/four-person circles and competing reservations.
- Frontend production build: `npm run build` — passed after the final scroll fix, including type checking and static page generation.
- Running HTTP checks returned 200 for `/explore`, `/my-items`, `/trades/example` and API `/health`; route shells contain the sidebar label markup. Protected content was tested through the API/component harness rather than signed-in browser interaction.

## Independent review

One fresh-context reviewer examined the combined changes. One Important finding was fixed: the older-history scroll snapshot was cleared before React committed the batched message update. Regression tests first reproduced 150px versus the required 950px reading position, then passed with a readiness-guarded anchor to the visible message. Tests also cover unrelated status updates and messages appended during history loading. There were no other findings, deferred minors or behaviors declined for judgment.

## Decisions and practical costs

1. Preserve the approved checkout, installed services and existing animation work, using a local feature branch. No separate worktree was created. If isolation assumptions are wrong, the branch can be moved; there are no remote changes.
2. Serialize chat writes by updating the existing trade row in a serializable Prisma transaction, with 10-second acquisition/transaction allowances. This avoids receipt/send races and makes concurrent snapshots retry through Prisma's P2034 handling. Chat activity also advances `updatedAt`; sustained contention may return a retryable 409.
3. Assign strictly increasing message timestamps per trade after acquiring the write lock so polling does not miss a later-committed message. A burst can put displayed timestamps a few milliseconds ahead of the wall clock.

## Limits

The available browser tool reported no connected browser (discovery returned an empty list). Hover appearance, keyboard appearance, reduced-motion rendering, responsive layout and multi-user browser interaction have not been visually verified. There are no screenshots. Text chat has no attachments, read receipts, typing indicators, notifications or WebSocket transport.

Integration checks retain uniquely named local fixture accounts/items/trades, following the existing smoke-test convention. They do not reset existing data. The regenerated team archive excludes real environment files, model weights, stored media, dependencies and git history.
