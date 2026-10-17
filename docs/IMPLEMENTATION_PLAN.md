# Implementation plan and acceptance criteria

## Sprint 0 — foundation
- Lock UI design tokens: cream #faf8f2, forest #0d5f4d, typography, spacing.
- API contracts (OpenAPI), Prisma migrations, CI, `.env` management, Git branch protections.
- Configure staging cloud account, IAM roles, budgets, security groups, OBS private bucket.

## Sprint 1 — Identity / listings
- Finish email verification, reset password, refresh sessions, revoke tokens, rate limits.
- CRUD, photo upload pipeline, condition disclosure, listing-specific wants, browse filters.
- End-to-end tests and ownership checks.

## Sprint 2 — matching
- Replace keyword overlap with measured multilingual semantic embeddings.
- Item-to-want edges, hard constraints, 2–4-party cycles, bounded graph search.
- Compare keyword direct vs semantic direct vs semantic multi-party on a labeled dataset.

## Sprint 3 — trade state machine
- Proposal expiration, atomic reservation, idempotency keys, readiness, handover evidence, receipt confirmation, dispute handling, safe cancellation.
- Transaction isolation and concurrency tests for double reservation.

## Sprint 4 — trust / launch
- Reports, moderation dashboard, notification queue, trade-scoped chat, audit trail.
- Pilot with real consenting users, usability tests, accessibility, security and load tests.
- Deploy ECS/RDS/OBS first; migrate to ELB/CCE only when capacity justifies it.

## Exit criteria before public beta
- Every API has authorization and input validation.
- Uploaded files validated and scanned; private OBS objects and signed access.
- Race tests show no double reservation under concurrent accepts.
- Trade cannot complete without every receiver confirmation.
- Cancellation/dispute process has clear ownership and operational playbook.
- Backup and restore tested; alerting, error tracking, and rate limiting live.
- Privacy notice, consent and retention plan approved.

## Known open decisions
- University-only pilot vs open local community; permitted item categories.
- Exchange meeting locations, handover verification, dispute resolution authority.
- Whether image recognition is necessary and what dataset is available.
- Huawei region, project quota, budget ceiling and exact service SKUs.
