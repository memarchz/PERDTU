# Docker deployment verification — 2026-10-18

Verified locally with Docker Engine 28.0.4 / Compose 2.34.0 and Linux amd64 containers. This is container preparation and local testing, not a Huawei cloud deployment.

## Completed checks

- Built real `perdtu/frontend:local` (Next standalone), `perdtu/backend:local` and `perdtu/migrate:local` images. The migration image is a short-lived job built from the same backend Dockerfile; Prisma CLI is excluded from the API runtime.
- Validated Compose HTTP + optional PostgreSQL and HTTPS combinations with `config --quiet`, without printing resolved secrets.
- Started isolated project `perdtu-deploy-smoke` on loopback port 18080 using fresh volumes. All four existing Prisma migrations applied successfully, in order, without touching the developer database.
- Frontend, backend, PostgreSQL and Nginx became healthy. Only Nginx had a published host port; frontend/API/database remained internal.
- Runtime image checks confirmed non-root frontend/backend, no application `.env` files, and no model weights in the backend image.
- `ai-setup` downloaded the pinned multilingual-e5-small model into the model volume and passed real Linux inference. The API uses that volume read-only and performs local inference without runtime downloads.
- End-to-end smoke: **27 checks passed** through Nginx, covering page routes, CORS origin, registration/login, real Sharp upload, public photo URL origin, local AI matching, proposal/acceptance, locked/open chat, idempotent send, receipt completion and EXCHANGED inventory.
- Recreated frontend/backend/PostgreSQL containers with the same volumes: **3 persistence checks passed**, confirming the photo bytes/hash, completed trade and saved read-only conversation survived.
- Nginx HTTP and HTTPS configuration syntax checks passed. A separate loopback TLS container on 18443 used a one-day, locally generated test certificate. **3 HTTPS routes passed with certificate verification enabled**, plus HTTP-to-HTTPS 308 redirect. These are proxy/TLS checks; the app image was built for the HTTP smoke origin, so this was not a production-domain browser session.
- Deployment setup unit tests: **3 passed** — random independent credentials, origin validation (including rejection of unsupported HTTPS ports), and no overwriting an existing environment file.
- Existing regression suites: **frontend 63 passed** and **backend 25 passed**, with zero failures; backend suite includes TypeScript compilation. Docker frontend build includes type checking and production compilation.
- Team ZIP was rebuilt with Docker/config/docs included and real env files, certificates, backup files, dependencies, storage and history excluded; CRC/exclusion checks passed.

Reproducible end-to-end fixture script: `node backend/scripts/deployment-smoke.mjs`; it targets loopback 18080 by default and accepts `PERDTU_DEPLOY_SMOKE_ORIGIN` for another local origin. It requires the backend's installed development dependencies on the host. Use `--verify-persistence` after container recreation. Its private test-state file is written only under ignored `.superpowers/`.

## Review fixes verified

One independent read-only reviewer identified two issues. The missing runtime calibration JSON was also reproduced by the actual Docker smoke as ENOENT on `/matches`; the image now includes only that required fixture, and end-to-end matching passes. The initializer accepted HTTPS origins on custom ports while the template publishes 443; a regression test first failed, then passed after rejecting unsupported HTTPS ports. No review findings remain deferred.

## Not verified or performed

- No Huawei account resources provisioned, RDS connected, SWR images pushed, DNS changed or public certificates issued.
- No browser automation was available; the evidence is Docker builds, real API/inference/media traffic, TLS requests and component/unit tests rather than visual browser coverage.
- Production-domain browser/CORS, selected RDS certificate chain, ECS architecture and security groups still need validation on the target environment.
- OBS integration, a Huawei AI API adapter, multi-host replicas and load testing are outside this packaging change. Current uploads use one host's persistent volume.
- Default image channels track Node 22/Debian, PostgreSQL 16 and Nginx stable updates. Record/pin tested digests for an actual release; only Linux amd64 was tested here.

The local smoke fixtures and generated credentials/certificates are separate from existing user data. Production secrets must be supplied through the private deployment env file and certificate directory described in [DEPLOYMENT.md](DEPLOYMENT.md).
