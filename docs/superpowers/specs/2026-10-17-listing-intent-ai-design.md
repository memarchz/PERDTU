# Listing-specific exchange intent and local AI suggestions

Date: 2026-10-17. Status: user approved the revised design (including Wishlist removal) on 2026-10-17. Implementation plan written; awaiting plan review before product changes.

## User intent and decisions

The user explicitly wants each listing to say what its owner would exchange it for, visible in Explore. Suggested swaps must find people who want an item we actually have and show the actual item they offer in return. Order strongest matches to our desired items first, then weaker but potentially acceptable alternatives. The user subsequently requested removing the Wishlist page entirely: listing-specific exchange terms are the only source of matching intent. Remove Wishlist navigation, page and account-wish publishing UI. Saved items remains a distinct bookmarking feature. The user selected local AI with a downloadable model and no paid API.

Keep existing accounts, listings, media, history, auth, reservation/receipt protection, PostgreSQL Docker volume and local UI. No reset, cleanup of old test/user data, Git initialization or deployment. Keep current English interface with Thai branding, accepting Thai/English listing content.

## Chosen approach and alternatives

Use local multilingual text embeddings plus explicit listing-level conditions, followed by bilateral/cycle eligibility checks. This supplies semantic similarity while deterministic checks enforce actual available items, ownership and each participant's stated terms. Do not ask a language model to invent inventory or infer agreement. Similarity is a ranking signal, not a probability of acceptance or a valuation.

Keyword-only matching is cheaper to run but does not meet the requested AI meaning matching, especially across Thai and English. Hosted embeddings can avoid local model memory/downloads but require credentials and external inference; the user selected local inference.

Proposed runtime: server-side Transformers.js with quantized Xenova/multilingual-e5-small ONNX weights. Inspect package engines, native Windows/Node20 support, resolved dependency changes and model license/revision before installation; pin a compatible version and model revision. This model/runtime choice is grounded in the maintainer's model card and Node inference documentation. Exact size/latency must be measured, not promised.

## Listing data and forms

Add to Item through a forward-only migration:

- exchangeWanted: nullable text, maximum500characters; concrete description of what this listing's owner wants in return.
- exchangeCategory: nullable existing category, a preference used in ranking.
- exchangeOpenToAlternatives: boolean, defaultfalse. Explicitly permits showing lower-fit alternatives; it does not mean automatic acceptance.

Post and Edit show a clearly labeled 'Want to exchange this item for' section, wanted category and 'Open to similar alternatives' checkbox. New UI listings require at least a specific description (3–500characters) or a selected category. Alternative openness alone is insufficient to infer any bilateral fit. Remove the Wishlist screen and navigation. Post writes exchange intent only to Item, with no Wish write or wish-only retry stage. Preserve resilient photo/item publication and user-specific draft recovery. Old pending publish drafts with a created item id must lead to that item's editor to complete exchange intent, never recreate the item or copy a historical account wish silently.

New API creates require intent, while existing listings remain readable. Owners can add intent with PATCH using the existing available-only mutation rules, including pending proposal cancellation. Unrelated edits to legacy listings remain possible; those items are excluded from AI suggestions until intent is supplied. Missing intent is displayed honestly as 'Exchange preference not provided'; no retroactive copying of account Wishlist. Existing agreed snapshots/events are never rewritten.

Explore cards and detail show wanted description/category and whether similar alternatives are welcome. Inventory marks missing intent and links to Edit. Long/Thai content wraps. The existing Save action remains independent.

## Semantic analysis and reciprocal eligibility

Compute wanted embeddings from a listing's exchangeWanted, and offer embeddings from another listing's title/description/category. Use the model's documented query/passage prefixes, mean pooling and normalization. Analyze each direction separately: incoming offer against the receiving participant's outgoing listing terms. A result must name one actual outgoing and incoming available item per participant, with distinct owners and no duplicate item.

Direct exchange example: our lamp wants a backpack; their backpack wants a lamp. Show both items and both stated wants. A backpack owner seeking shoes is not a strong reciprocal match for our lamp. If their terms do not fit our lamp, do not present them as someone who wants it. 'They want your item' means their stated terms have a strong model/rule fit, not confirmed human interest.

Keep 2–4-person cycles, but validate item-specific terms at every receiving edge. It is not enough to connect owner-level wishes: a person offering a different item can have different return conditions. Direct results are the default view; longer cycles are separately labeled and show all give/receive links.

Semantic cosine scores need calibration for this model; do not use a universal percentage threshold or label raw cosine as acceptance confidence. Evaluate a labeled Thai/English fixture set covering exact names, paraphrases, cross-language names, unrelated goods, same-category distractors and negation. Select strong/alternative cutoffs from measured results, store them with the model/scoring version and document limitations. Category boosts may adjust ordering but cannot make an unrelated item a strong match. For explicit wording such as 'only/exactly/not/ไม่/เท่านั้น', do not relax it into an alternative; show uncertainty or reject instead of pretending embeddings reliably enforce arbitrary exclusions.

Rank strong reciprocal fits first. Within that group, prioritize similarity of the item we receive to the terms on the item we give; use partner fit, weakest cycle edge and stable ids for ties. Then show a distinct lower-fit alternatives group, only where the receiving listing opts in. In a direct alternative, the partner still must have a strong fit for our offered item; our incoming item may be weaker when our listing opts into alternatives. In longer cycles, every lower-fit recipient must explicitly opt in. Never pad with completely unrelated inventory simply because no strong result exists.

Each card shows 'You give', 'You receive', 'They are looking for', our original wanted terms, a strong/alternative label and concise grounded match reasons. Explain when only category/semantic proximity is available. Provide an Include similar alternatives control and an own-listing selector. Show no matches honestly and offer to edit terms. No fabricated value/fairness/distance or guaranteed acceptance.

## Local model lifecycle and persistence

Provide an explicit setup/download command. Download model/tokenizer assets into an ignored workspace-owned directory, preserving the existing environment files. Model loading is single-flight; run bounded batches/queue and cap concurrent work to protect other API requests. Cache normalized vectors keyed by model revision, role and content hash, persisted in PostgreSQL JSON fields/a dedicated cache table chosen in the implementation plan. An edit changes the hash, invalidating old embeddings and results; old snapshot data stays unchanged.

Inference runs locally after model setup. No listing text is sent to an external inference service. Initial installation/download uses package/model hosts; record pinned sources. No GPU is required by design; measure actual CPU behavior on this machine. Keep model files outside public/static media routes.

Expose loading/ready/unavailable state for the matching UI. A missing model/download/inference error shows a useful retry/setup state; never call keyword fallback 'AI'. Warm model and compute cache misses outside serializable database transactions. A cold first request should return a preparing state or a bounded retry response, not hang indefinitely or block all API traffic. Abort/timeout handling must not turn cancelled requests into orphaned concurrent model loads.

## API and transaction integration

Keep the existing /matches flow but version/extend its result with selected listing, strong/alternative classification, direction-specific fit/reasons, model/scoring version and actual item summaries. Validate query ids as owned/available; always include the requesting owner's selected item when building a bounded candidate pool. Report candidate bounds honestly and use deterministic pagination/limits; do not claim to search the entire database when truncated. Exclude archived/reserved, own-owner offers and missing-intent items.

Never trust a client-supplied AI score. At proposal creation, re-evaluate eligibility against current item terms/availability. Prepare any embeddings outside the transaction; inside the existing serializable transaction re-read every selected item and compare content/version fingerprints before creating immutable snapshots. A concurrent edit/archive must cancel pending proposals or cause stale proposal submission to fail409/recompute; no network/model calls inside the transaction. Validate the specific directed cycle directly rather than hoping it appears inside an arbitrary top-N suggestion list. Everyone still explicitly accepts, and final acceptance retains atomic reservation.

Remove /wishlist from the web route and sidebar/profile/home/empty-state links. Redirect old /wishlist bookmarks to /my-items (or sign-in with a safe return path), without auto-writing preferences. Replace item-detail I?m interested with Find a swap for this item: sign-in when necessary, select an owned available listing, then show reciprocal matches involving the target item. If no owned listing exists, link to Post. Do not show a dead Wishlist action anywhere. Remove obsolete account-wish submit/retry UI while retaining duplicate-publication protection.

Preserve the existing Wish table and historical rows; this request does not authorize destructive data migration. Remove live Wishlist API route registrations and matching reads of Wish; old clients receive an explicit410 retirement response with guidance, not a successful phantom write. Existing matching-related smoke fixtures must supply explicit per-item intent, preserving privacy, race, direction and multi-party assertions rather than weakening them. Replace obsolete Wishlist-specific UI/API tests with retirement/redirect/no-implicit-Wish-write tests; keep historical verification documents dated.

## Acceptance and verification

1. New listing intent survives create/read/edit/restart, appears on Explore/detail, with no Wishlist menu/page/action or Wish creation side effect. Old Wishlist bookmarks redirect safely; legacy Wish data remains intact. Foreign edits and reserved/exchanged mutations remain blocked.
2. Actual local model inference ranks labeled Thai/English compatible examples above unrelated/same-category distractors. Record measured scores, ranking results, latency and model revision. If quality fails, adjust the model/calibration before claiming AI matching is complete.
3. A direct suggestion requires real owned available items and reciprocal intent. Historical Wishlist-only and one-way-interest fixtures cannot manufacture a strong match.
4. Sorting prioritizes our wanted item fit; alternatives are visibly separate, honor openness and strict exclusions, and never imply agreement. Unrelated/no-intent records show useful empty/missing states.
5. Item-specific 3/4-person cycles remain closed and valid at every receiver, preserving alternate directed cycles with the same owners/items.
6. Model cold start, missing files, errors, repeated requests and content edits are tested with bounded resource behavior and honest UI states. Real model tests supplement injected-vector algorithm tests; mock scores alone do not establish AI quality.
7. Proposal/edit/archive/accept races, privacy, photos, saved collections, auth and receipt regressions remain passing; both builds and migrations verified without data reset.
8. Conditional browser testing checks real Post/Edit/Explore/Matches flows at desktop/mobile widths. If the supported browser remains unavailable, report that separately from real API/model evidence.

## Sources and next gate

- https://huggingface.co/Xenova/multilingual-e5-small — maintainer ONNX/Transformers.js model usage.
- https://huggingface.co/docs/transformers.js/en/tutorials/node — maintainer server-side Node/CommonJS loading guidance.

This spec is the concrete review artifact. After user review/approval, write the implementation plan with tests, exact runtime/model setup, interface migration and transaction-safe validation steps. Continue locally with one final independent review, preserving baseline/config/data. Do not equate the selected AI deployment option with approval of this not-yet-reviewed artifact.
