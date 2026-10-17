# Listing intent, Wishlist retirement and local AI verification

Verified2026-10-17, Windows / Node20.16.0 / PostgreSQL16. This is the current product behavior; older verification files are retained as dated history.

Implemented:

- Every new listing describes what its owner wants in exchange, or selects a wanted category; optional similar alternatives are per listing and defaultfalse.
- Explore/detail show exchange terms. Post/Edit share the fields. Older missing-intent listings remain readable and can receive unrelated owner edits; they need terms before AI matching.
- Wishlist has no live page/menu/publication step. Old /wishlist bookmarks redirect307 to /my-items. Obsolete authenticated API methods return410; all129historical Wish rows remain intact.
- Suggested swaps selects an actual owned item and compares actual offered inventory against each receiving item's terms, not account wishes. Strong fits precede opt-in alternatives. Direct alternatives still require a strong partner fit for our item. Every result shows real give/receive items and preferences;2–4person cycles remain supported.
- Local model inference and circle enumeration run in separately bounded workers; results and vectors are cached by current content/model/scoring versions. Proposal creation checks current fingerprints in a serializable transaction; stale UI terms409. Everyone still explicitly accepts before reservation.

Final evidence:

| Check | Result |
| --- | --- |
| API npm test |22passed, including intent, matching, proposal fingerprints, cache/queue/timeout, decoded photos, isolated graph search and actual HTTP responsiveness |
| Frontend npm test |52passed, including no-Wish publication, one-shot legacy draft recovery, optional legacy edit fields, circle attribution, polling/cancellation and existing auth/photo/saved tests |
| API / web production builds | Passed |
| Real local AI + intent smoke |22assertions passed: reciprocal items, expected give/receive ids, actual proposal snapshot, stale terms409, retirement401/410, no Wish writes |
| Exchange smoke |128requests passed:2/3/4people, exact directed variants, privacy, decline, atomic competing reservations, receipts |
| Media smoke |93assertions passed: real files, privacy, order, owner edit/archive, cancellation, snapshot preservation and acceptance races |
| Foundation smoke |15requests passed |
| Deterministic proposal race |2passed: proposal read then PATCH/DELETE then resume; stale proposals409 |
| Real warm graph HTTP probe |101items with3k-character descriptions; unrelated health request20ms in observed run |
| Restart | Intent and SHA256-identical vector cache persisted; real fresh local-files-only384dimension inference passed |
| Data/config | Immediately after additive migration155users/137items/55trades/129wishes unchanged; Wish count remains129; real environment SHA256 unchanged |
| Migrations / dependencies |3forward migrations current; API audit0advisories; manifests/locks consistent |
| Web HTTP |11production shells200, no Wishlist menu; old /wishlist307→/my-items |

Independent final review found4Important issues, all fixed with regressions in one pass: persistent legacy draft redirect, wrong circle-owner preference, forced intent on unrelated legacy edits, and synchronous circle search blocking Express. No Critical findings. Scoring-version metadata omission was also fixed. The small real-model evaluation set remains a known Minor limitation described below.

Local AI setup/runtime:

From backend run npm ci, prisma migrate deploy, prisma:generate, then npm run ai:setup. This explicitly downloads/probes the pinned model. npm run ai:evaluate measures real rankings; npm run smoke:ai exercises the local product API. Build/start normally afterward. No account/API key or GPU is required by this verified CPU setup.

Runtime @huggingface/transformers4.3.1, onnxruntime-node1.30.0, application Sharp0.35.5. Planned3.8.1 was rejected after audit exposed6transitive advisories; patched4.3.1 has0in the final audit. Upstream multilingual-e5-small license MIT was verified. Model Xenova/multilingual-e5-small revision761b726dd34fb83930e26aab4e9ac3899aa1fa78, q8, mean-pooled normalized384dimensions. Cached assets here total135,392,778bytes (about135.4MB), under backend/storage/models. Runtime local_files_only=true prevents downloads; initial setup alone enables them. No listing text is sent to an external inference API.

Embedding batches8, one inference worker, at most2pending jobs;30second warm/120second cold batch timeout resets a stuck worker. Graph search has one separate worker,2pending requests and3second timeout, memoized pair fits and a20,000edge/path budget. Preparation/results are content/version-keyed; bounded jobs/caches and candidate limits protect local operation. Model workers are not browser assets or public file routes. backend/prototypes/matching-worker is an older prototype, not the live matcher.

Measured semantic scope and limitations:

The12labeled positive/unrelated triples (6calibration,6held-out) generate24real similarities. Every intended offer outranked its unrelated distractor. Conservative v2cutoffs are strong0.8343838262 and alternative0.8223838262; none of these labeled unrelated distractors reaches alternative.6of12positive examples reach strong,5reach alternative and1falls below both. Thus the observed ordering does not establish perfect recall or general accuracy. Raw cosine is not an acceptance probability. Alternative eligibility additionally requires explicit openness and reciprocal terms.

Fixtures include Thai paraphrases and Thai/English pairs, but do not establish broad same-category hard-negative behavior or production title+description+category generalization; product smoke separately verifies actual offer-text encoding on a small reciprocal pair. These are limited pilot measurements, not a benchmark claiming universal accuracy. Strict/negated free-text terms are conservatively excluded from automated matches until clarified; the model is not represented as reliably understanding arbitrary exclusions. Category-only terms are explicitly labeled broad category matches.

Search uses selected/target items plus at most500other available intent-configured candidates. Longer-circle search is bounded and reports truncation conservatively. It may miss valid inventory/cycles outside these bounds. Similarity does not establish fairness, confirmed interest or consent. Empty/error/cold states are distinct, and users can clarify terms or opt into alternatives.

Browser limitation: supported Browser selection returned 'No browser is available'; discovery returned[]. Interactive file selection, hydration, real clicks and rendered desktop/mobile flows remain unverified. HTTP/API/model evidence above is real; production shells are not claimed as interactive coverage.

Tests intentionally retain labeled development accounts/listings/trades/photos. No reset, broad cleanup, deletion of historical wishes, Git initialization or public deployment occurred. Keep PostgreSQL and backend/storage/uploads together in backups. API/frontend real .env files are unchanged. Execution baseline/logs and nonsecret persistence fingerprints remain under .superpowers/sdd/2026-10-17-listing-intent-ai because this checkout has no Git history. Preview http://localhost:3000; API http://localhost:4000. Chat/notifications remain outside this change.
