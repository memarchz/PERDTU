# Deploy PERDTU with Docker / Huawei ECS

ชุดนี้เตรียมแอปสำหรับ deploy; ไม่ได้สร้าง ECS/RDS, จองโดเมน, ออก certificate หรือเปลี่ยนข้อมูลระบบเดิมให้โดยอัตโนมัติ ใช้ Docker Engine/Compose v2 และ Linux containers คำสั่งเริ่มจาก repository root ซึ่งมี `compose.production.yml`

## สิ่งที่ build และที่เก็บข้อมูล

| ส่วน | Image / ที่เก็บ |
|---|---|
| Next.js | `perdtu/frontend:local` — standalone Node server, non-root |
| Express + local AI workers | `perdtu/backend:local` — Linux Prisma/Sharp/ONNX, non-root |
| Migration job | `perdtu/migrate:local` — target `migrate` ใน backend/Dockerfile รันแล้วจบ ไม่ใช่ API อีกตัว |
| Reverse proxy | image สำเร็จรูป `nginx:stable-alpine` |
| PostgreSQL | RDS private endpoint หรือ optional `postgres:16-bookworm` container |
| รูปสินค้า | named volume `uploads` ที่ `/app/storage/uploads` |
| โมเดล | named volume `models` ที่ `/app/storage/models`; API mount read-only |
| ข้อมูล self-hosted DB | named volume `production-pgdata`; ไม่ publish พอร์ต 5432 |

Compose project เริ่มต้นชื่อ `perdtu-production` แยกจากชุดพัฒนา รูป บัญชี ฐานข้อมูล และโมเดลเดิมไม่ถูกย้ายมาเอง Redis ยังไม่ถูกใช้จึงไม่อยู่ในชุดนี้ API และ frontend ไม่มี host ports; Nginx เป็นทางเข้าเดียว

## 1. ลองทั้งชุดในเครื่องก่อน

สร้าง config เฉพาะ deploy พร้อม JWT/password สุ่ม ไม่เขียนทับ `.env` ใดที่มีอยู่:

```sh
npm run deploy:init -- --local-db --origin http://localhost:8080
```

ถ้ามี `deploy/.env.production` อยู่แล้ว ให้แก้ไฟล์นั้นเอง initializer จะปฏิเสธการเขียนทับ ตรวจว่า `DATABASE_URL` ชี้ `postgres:5432` และ password ตรงกับ `POSTGRES_PASSWORD` ที่สร้างไว้ การเปลี่ยน password ใน env ภายหลังไม่เปลี่ยน password ในฐานข้อมูลที่ initialize แล้ว

```sh
docker compose --env-file deploy/.env.production -f compose.production.yml -f deploy/compose.postgres.yml config --quiet
docker compose --env-file deploy/.env.production -f compose.production.yml -f deploy/compose.postgres.yml build frontend backend migrate
docker compose --env-file deploy/.env.production -f compose.production.yml -f deploy/compose.postgres.yml run --rm --no-deps ai-setup
docker compose --env-file deploy/.env.production -f compose.production.yml -f deploy/compose.postgres.yml up -d
```

`ai-setup` ดาวน์โหลด pinned multilingual-e5-small ลง volume และลอง inference จริง ต้องมีอินเทอร์เน็ตครั้งแรก ถ้าไม่เตรียมโมเดล ระบบทั่วไปยังเปิดได้ แต่ Suggested swaps จะแจ้ง AI unavailable และจะไม่ดาวน์โหลดโมเดลเองระหว่างใช้งาน

เปิด **http://localhost:8080** พอร์ตนี้ bind loopback เท่านั้น ไม่เปิดออก LAN อัตโนมัติ `up` รอ PostgreSQL healthy → migration สำเร็จ → backend healthy → Nginx จึงเปิด ให้ตรวจ `ps -a` หากหน้าเว็บยังไม่พร้อม

```sh
docker compose --env-file deploy/.env.production -f compose.production.yml -f deploy/compose.postgres.yml ps -a
docker compose --env-file deploy/.env.production -f compose.production.yml -f deploy/compose.postgres.yml logs --tail 100 migrate backend nginx
```

`/healthz` ผ่าน Nginx ใช้ตรวจ liveness ของ API ใน HTTP mode; Docker health ไม่รับประกันว่า DB/AI พร้อมทุกขณะ ควรทดสอบสมัคร ลงรูป จับคู่ แลก และแชตหลังเปิดบริการด้วย

## 2. เตรียม Huawei ECS + RDS

ใช้ ECS Linux ที่รองรับ image architecture ที่ build ไว้ (ทดสอบเริ่มต้นกับ Linux amd64) ให้ ECS และ RDS อยู่ใน region/VPC ที่ติดต่อกันได้ ตั้ง Security Group ให้ RDS รับ 5432 จาก ECS เท่านั้น จัด persistent disk, backups และ domain DNS ให้พร้อมก่อนเปิดจริง

ใช้ config ใหม่สำหรับ production โดยสร้างบนเครื่องที่มี Node แล้วส่งไฟล์อย่างปลอดภัยไป ECS หรือ copy `deploy/.env.example` เป็น `deploy/.env.production` บน ECS แล้วแก้ค่าด้วย editor เครื่อง ECS ต้องมี Docker/Compose แต่ไม่ต้องติดตั้ง Node เพื่อรัน images

```sh
npm run deploy:init -- --origin https://perdtu.your-domain.com
```

กำหนดในไฟล์จริง:

- `PUBLIC_ORIGIN=https://perdtu.your-domain.com` ไม่มี path หรือ slash ท้าย ใช้ origin เดียวสำหรับเว็บ, API, CORS และ URL รูป
- `DATABASE_URL` เป็น PostgreSQL connection ของ RDS ใช้ user/password จริง, URL-encode รหัสผ่าน และสร้าง database `perdtu` ไว้ก่อน
- ใช้ TLS ตามการตั้งค่า RDS พร้อม CA ที่ดาวน์โหลดจากบริการ เก็บที่ `deploy/certs/rds-ca.pem`; container เห็น `/run/perdtu-certs/rds-ca.pem` ทั้ง migration และ backend ตัวอย่าง URL ใน `.env.example` ใช้ `sslmode=require&sslaccept=strict&sslcert=...`; ใช้ชื่อ host ที่ตรงกับ certificate และแก้ปัญหา certificate แทนการปิด verification
- `JWT_SECRET` สุ่มยาวอย่างน้อย 32 ตัวอักษร เก็บเดิมไว้ระหว่าง redeploy หากต้องการให้ token เดิมใช้ต่อได้
- `IMAGE_TAG` ใช้ release tag ที่ระบุเวอร์ชัน เช่น `2026-10-18-01`; ทดสอบและบันทึก image digests สำหรับ release จริง

**อย่าใช้ `deploy/compose.postgres.yml` เมื่อใช้ RDS** PostgreSQL ไม่ได้อยู่ใน ECS ในรูปแบบนี้ ปัจจุบัน embedding เก็บเป็น JSON ใน PostgreSQL จึงยังไม่มี migration ที่บังคับ extension pgvector

## 3. HTTPS ที่ Nginx

ชุด HTTPS ใช้พอร์ตมาตรฐาน 443 เท่านั้น initializer จะไม่รับ origin ที่ระบุพอร์ต HTTPS อื่น เตรียม certificate ของโดเมนจริงและ key จากผู้ให้บริการ certificate ของคุณ:

```sh
mkdir -p deploy/certs
```

```text
deploy/certs/fullchain.pem
deploy/certs/privkey.pem
deploy/certs/rds-ca.pem     # ถ้า RDS ต้องใช้ CA แยก
```

ใน Linux จำกัดสิทธิ์ private key ให้ root อ่านได้และไม่เปิดให้ผู้อื่นอ่าน RDS CA เป็น public certificate แต่ต้องอ่านได้โดย user `node` ใน container ไฟล์ใน certs ไม่ถูก commit หรือส่งใน ZIP

คำสั่งต่อไปนี้ใช้ RDS และ TLS; override เพิ่ม public ports 80/443 และ redirect HTTP → HTTPS:

```sh
docker compose --env-file deploy/.env.production -f compose.production.yml -f deploy/compose.https.yml config --quiet
docker compose --env-file deploy/.env.production -f compose.production.yml -f deploy/compose.https.yml build frontend backend migrate
docker compose --env-file deploy/.env.production -f compose.production.yml -f deploy/compose.https.yml run --rm --no-deps ai-setup
docker compose --env-file deploy/.env.production -f compose.production.yml -f deploy/compose.https.yml up -d
```

เปิด Security Group 80/443 ตามต้องการ และจำกัด SSH เฉพาะผู้ดูแล พอร์ต 3000/4000/5432 ไม่ต้องเปิด public การต่ออายุ certificate เป็นงานของผู้ดูแลชุดนี้ไม่ได้ออกหรือต่ออายุให้ เมื่อเปลี่ยนไฟล์ให้ reload Nginx หลังตรวจ config (`exec nginx nginx -t`, แล้ว `exec nginx nginx -s reload` โดยใช้ Compose options เดิม)

ถ้าเริ่มโดยใช้ PostgreSQL container พร้อม HTTPS ให้เพิ่ม `-f deploy/compose.postgres.yml` ก่อน `-f deploy/compose.https.yml` ทุกคำสั่งด้วย

ถ้าใช้ ELB จบ TLS แทน Nginx ให้ใช้ HTTP config ด้านหลัง ELB กำหนด `PUBLIC_ORIGIN` เป็น HTTPS public domain และตั้ง `HTTP_BIND_ADDRESS` เป็น private IP ของ ECS กับ `HTTP_PORT` ของ target group อนุญาตเข้าพอร์ตนั้นเฉพาะจาก ELB การจัด ELB/certificate ไม่ได้รวมเป็น cloud automation ใน repo นี้

## 4. ใช้ Huawei SWR แทน build บน ECS

สร้าง organization/repositories และใช้ login command จาก SWR console บนเครื่อง build และ ECS ไม่บันทึก login token ลง source หรือส่งในแชต ตั้ง `IMAGE_REGISTRY` ใน config เช่น `swr.REGION.myhuaweicloud.com/YOUR_ORGANIZATION` และ `IMAGE_TAG` เป็น release เดียวกัน จากนั้น build ด้วย PUBLIC_ORIGIN ของ production แล้ว push เฉพาะ app/migration images:

```sh
docker compose --env-file deploy/.env.production -f compose.production.yml build frontend backend migrate
docker compose --env-file deploy/.env.production -f compose.production.yml push frontend backend migrate
```

บน ECS ที่ login registry แล้ว ใช้ config tag เดียวกัน:

```sh
docker compose --env-file deploy/.env.production -f compose.production.yml -f deploy/compose.https.yml pull frontend backend migrate nginx
docker compose --env-file deploy/.env.production -f compose.production.yml -f deploy/compose.https.yml run --rm --no-deps ai-setup
docker compose --env-file deploy/.env.production -f compose.production.yml -f deploy/compose.https.yml up -d --no-build
```

Frontend ฝัง `NEXT_PUBLIC_API_URL` ตอน build ซึ่ง Compose ใช้ค่าจาก `PUBLIC_ORIGIN` เปลี่ยนโดเมนต้อง build frontend ใหม่ การแก้ env ของ container อย่างเดียวไม่เปลี่ยน JavaScript ที่ส่งให้ browser **ห้ามใส่ secret ใน build args**

## 5. อัปเดต สำรอง และกู้คืน

ก่อนอัปเดต release ให้สำรอง DB และรูปควบคู่กัน แล้ว pull/build images ใหม่ รัน `run --rm migrate` โดยใช้ Compose options ของ environment นั้น ตรวจว่า exit 0 ก่อน `up -d --no-build` การ migrate จะ apply เฉพาะ migrations ที่ยังไม่เคยรัน ไม่ใช่ reset

เก็บ project name และชื่อ volumes เดิมระหว่าง deploy หากเปลี่ยน Compose project ระบบจะใช้ volumes ใหม่และดูเหมือนข้อมูลหาย ห้ามใช้ `down -v`, `docker volume prune` หรือ `prisma migrate reset` กับข้อมูลที่ต้องเก็บ หยุด containers ด้วย `down` ที่ไม่มี `-v` ได้

ตัวอย่าง backup สำหรับ self-hosted DB บน Linux ECS (ใช้ options ของ environment จริงให้ครบ):

```sh
mkdir -p deploy/backups
docker compose --env-file deploy/.env.production -f compose.production.yml -f deploy/compose.postgres.yml exec -T postgres pg_dump -U perdtu -d perdtu -Fc > deploy/backups/perdtu.dump
```

สำหรับ RDS ใช้ automated backup/snapshot และทดสอบ restore ตามบริการ สำรอง named volume รูป `/app/storage/uploads` ด้วยเครื่องมือ backup ของเครื่องหรือ disk snapshot และเก็บร่วมกับ DB version เดียวกัน โมเดลดาวน์โหลดใหม่ได้จึงไม่ใช่ข้อมูลผู้ใช้ ก่อนย้ายจากเครื่องเดิมให้วางแผน restore DB และรูปให้ตรงกัน ไม่ใช่คัดลอก image อย่างเดียว การกู้คืนที่ทับข้อมูล production ต้องแยกทดสอบก่อน

## ขอบเขตปัจจุบัน

- รูปยังเป็น local volume บน ECS จึงออกแบบเริ่มต้นสำหรับ backend เครื่องเดียว ไม่ได้ต่อ OBS ครบ flow แม้มี presign endpoint เก่าแล้ว
- AI ยังเป็น local multilingual-e5-small ใน backend ไม่มี Huawei AI API adapter การเปลี่ยน provider ต้องทดสอบ embedding/ranking ใหม่
- ไม่รวม cloud provisioning, SWR push จริง, DNS, certificate issuance, monitoring service หรือการย้ายข้อมูล production ให้โดยอัตโนมัติ
- `.dockerignore` กัน env/storage/private key จาก build contexts; ZIP กัน env/certs/backups จริง อย่าเผยแพร่ `docker compose config` แบบเต็มเพราะมี secrets ใช้ `config --quiet` เมื่อตรวจรูปแบบ

## เอกสารอ้างอิง

- [Next.js Docker / standalone](https://docs.docker.com/guides/nextjs)
- [Compose startup order and successful migration jobs](https://docs.docker.com/compose/how-tos/startup-order/)
- [Nginx proxy behavior](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Huawei RDS private connections](https://support.huaweicloud.com/eu/usermanual-rds/rds_pg_connect_01.html)
- [Huawei SWR image push](https://support.huaweicloud.com/intl/en-us/usermanual-swr/swr_01_0011.html)
- [Prisma PostgreSQL TLS parameters](https://docs.prisma.io/docs/orm/v6/overview/databases/postgresql)
