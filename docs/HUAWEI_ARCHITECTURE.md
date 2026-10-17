# Huawei Cloud Architecture — PERDTU

## Phase A: Low-cost MVP (recommended)
- **VPC** with public/private subnets and restrictive Security Groups.
- **ECS**: Docker containers for Next.js, Express API, with local AI and graph worker threads inside the API. Prefer internal communication; only HTTPS entrypoint public.
- **RDS for PostgreSQL**: private endpoint, backups, SSL, monitoring. Check `pgvector` extension availability on selected RDS engine/version before depending on it.
- **OBS**: private bucket for photos, signed upload/download URLs; lifecycle policy and CORS limited to frontend origin. For browser upload use short-lived signatures; credentials never in browser.
- **DCS Redis** optional at initial pilot; required when BullMQ and distributed rate limiting are introduced. Local Redis is development-only.
- **ELB**: add when deploying multiple API/Next replicas; for one ECS a reverse proxy is enough.
- **SWR**: private container image registry.
- **LTS + CES/AOM**: central logs, CPU/RAM, error-rate and DB alarms; **CTS** for cloud API operation audit.
- **IAM**: least-privilege service credentials. Prefer temporary credentials/agency roles when supported; avoid hardcoding AK/SK.

## Phase B: Growth
- **ELB → multiple stateless API/Web replicas**; no filesystem uploads and no in-memory sessions.
- **CCE**: deploy web, API, and worker separately. HPA scales pods; Cluster Autoscaler scales nodes; resource requests/limits, readiness/liveness probes, disruption budgets.
- **DCS** for shared queues/cache. Queue-based backpressure: match jobs triggered by listing exchange-preference updates, not by every HTTP request.
- **RDS**: connection pooling; indexes; scale vertically first; read replicas for read-heavy workloads only. Beware read-after-write consistency.
- **OBS** scales independently for object storage; configure CDN only if justified and protect private photos.
- **WAF** for internet-facing production and sensitive endpoints if threat profile justifies it.

## Network diagram
```text
Internet -> DNS/HTTPS -> (WAF optional) -> ELB or reverse proxy
                                     |-> Next.js web (ECS / CCE)
                                     |-> Express API (ECS / CCE)
                                                   |-> RDS PostgreSQL (private)
                                                   |-> DCS Redis (private)
                                                   |-> OBS (private object store)
                                                   |-> Local AI / graph workers
Logs -> LTS; Metrics -> CES/AOM; cloud actions -> CTS
```

## Scaling triggers (initial targets; validate under load)
- API p95 latency > 500 ms sustained, CPU > 65% for 10 min, or queue lag > 2 min: investigate bottleneck, then scale replicas/workers.
- DB: connection saturation / slow queries / disk IOPS -> query optimization and pool sizing before adding replicas.
- Match graph: cap outgoing edges to top K, cycle length <= 4, batch recompute, incremental candidate generation; never enumerate full graph synchronously at large scale.
- Run `k6` scenarios for browse/search, concurrent trade acceptance, burst listing uploads, and background recomputation.

## Security / cost / operations checklist
1. Separate dev/staging/prod; budgets and alerts; tag resources.
2. Never expose RDS/DCS publicly. Restrict SG inbound to necessary source SGs.
3. HTTPS, secret management, rotating credentials, backup restore drills, audit trails.
4. Encrypt data at rest/in transit where supported; user data retention and PDPA review.
5. Use one region close to users and confirm service availability, quotas and pricing. Do not assume all products/features are in every region.
6. Avoid CCE for first few dozen users unless competition demo specifically requires it; it increases baseline spend.

## Docs
- Huawei CCE auto scaling: https://support.huaweicloud.com/intl/en-us/usermanual-cce/cce_10_0279.html
- Huawei HPA + CA: https://support.huaweicloud.com/intl/en-us/usermanual-cce/cce_10_0300.html
- Huawei architecture scalability: https://support.huaweicloud.com/intl/en-us/usermanual-caf/caf_01_0103.html
- Huawei RDS PG scaling: https://support.huaweicloud.com/intl/en-us/usermanual-rds-pg/rds_pg_05_0097.html
