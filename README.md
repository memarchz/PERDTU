# PERDTU

เว็บแลกเปลี่ยนสิ่งของ พร้อมเงื่อนไขแลกต่อประกาศและ AI จับคู่บนเครื่อง

## โครงสร้าง

```text
perdtu-starter/
├── frontend/          Next.js: หน้าเว็บ, components, client API, tests
├── backend/           Express + Prisma: API, DB schema/migrations, AI, tests
│   ├── src/           โค้ด API และ worker ที่ใช้งานจริง
│   ├── prisma/        schema และ migrations
│   ├── fixtures/      ชุดทดสอบ/ค่าประเมินโมเดล
│   ├── scripts/       คำสั่ง setup AI และ smoke tests
│   ├── storage/       รูปและโมเดลในเครื่อง — ไม่รวมใน ZIP สำหรับทีม
│   └── prototypes/    ตัวอย่าง Python เก่า ไม่ใช่ระบบที่เว็บกำลังใช้อยู่
├── docs/              คู่มือและรายละเอียดระบบ
├── scripts/           ตั้งค่าและจัดชุดส่งทีม
├── docker-compose.yml PostgreSQL สำหรับพัฒนา; Redis ยังไม่ถูกใช้
└── package.json       คำสั่งเรียก frontend/backend จากโฟลเดอร์หลัก
```

ดูขั้นตอนพร้อมทดสอบหลายบัญชีที่ [docs/TEAM_QUICKSTART.md](docs/TEAM_QUICKSTART.md)

## เริ่มใช้งานครั้งแรก

เตรียม Node.js20+ และ Docker Desktop (Linux containers) แล้วเปิด terminal ในโฟลเดอร์ที่มีไฟล์นี้:

```powershell
npm run setup
npm run ai:setup
```

`setup` สร้าง backend/.env พร้อม JWT secret แบบสุ่ม และ frontend/.env.local เฉพาะเมื่อยังไม่มีไฟล์ จากนั้นติดตั้ง dependencies เปิด PostgreSQL และ apply migrations โดยไม่ reset ข้อมูล ต้องมีอินเทอร์เน็ตสำหรับดาวน์โหลด dependencies; `ai:setup` ดาวน์โหลดโมเดลประมาณ135MB ครั้งแรก การใช้งาน AI ภายหลังคำนวณในเครื่อง ไม่ต้องมี API key

เปิด terminal แยกกันสองหน้าต่างจากโฟลเดอร์หลัก:

```powershell
npm run dev:backend
```

```powershell
npm run dev:frontend
```

เปิด http://localhost:3000 — API http://localhost:4000

หรือเข้า frontend/backend โดยตรงแล้วใช้ npm run dev ได้เหมือนเดิม ไม่มีการเปลี่ยนพอร์ตหรือ API contract

## ฟีเจอร์

- สมัคร/เข้าสู่ระบบ ดูและค้นหาสินค้า ลงรูปสูงสุด4รูป แก้ไข/เก็บประกาศเข้าคลัง
- ระบุของที่ต้องการแลกต่อประกาศ แสดงบน Explore/detail; ไม่มีหน้า Wishlist แล้ว
- Saved items สำหรับบันทึกของที่สนใจ
- AI ไทย/อังกฤษแนะนำคู่แลกจริง2–4คน แยกคู่ตรงและตัวเลือกใกล้เคียง
- ส่งข้อเสนอ ทุกคนตอบรับก่อนจองสินค้า และยืนยันรับของจนครบวง

AI เป็นคำแนะนำ ไม่ยืนยันความสนใจแทนผู้ใช้ การค้นหามีขอบเขตและอาจพลาดคู่ที่เป็นไปได้ แชต/การแจ้งเตือนยังไม่ได้ทำ

## คำสั่งตรวจระบบ

```powershell
npm run test:backend
npm run test:frontend
npm run build:backend
npm run build:frontend
npm run ai:evaluate
```

Smoke tests ต้องเปิด API/ฐานข้อมูล และสร้างข้อมูลทดสอบที่เก็บไว้:

```powershell
npm --prefix backend run smoke
npm --prefix backend run smoke:ai
npm --prefix backend run smoke:exchange
npm --prefix backend run smoke:media
npm --prefix backend run smoke:proposal-race
```

ผลประเมินถูกบันทึกใน .superpowers/verification ซึ่งสร้างให้เมื่อจำเป็น ไม่ต้องมี execution ledger ของผู้พัฒนาเดิม

## ข้อมูลและการส่งให้ทีม

PostgreSQL เก็บใน Docker volume pgdata; รูปอยู่ backend/storage/uploads และโมเดล backend/storage/models ห้ามใช้ docker compose down -v หรือ prisma migrate reset หากต้องเก็บข้อมูล สำรองฐานข้อมูลและรูปแยกกัน

ZIP ส่งทีมไม่รวม .env จริง, node_modules, .next, dist, storage หรือประวัติการทำงานใน .superpowers แต่มี source, lockfiles, migrations และ .env.example แต่ละคนเริ่มฐานข้อมูลใหม่บนเครื่องตัวเอง หากต้องใช้ข้อมูลเดียวกันหลายเครื่อง ต้องจัด shared backend/database หรือ deploy แยกต่างหาก; localhost ของแต่ละคนเป็นคนละระบบ

เครื่องเดิมยังใช้ค่า .env และข้อมูลเดิมหลังย้ายโฟลเดอร์ Root .env.example เก่าที่ยังไม่ถูกใช้งานย้ายไป docs/examples/legacy-root.env.example

ดู [API](docs/API.md), [ผลตรวจ AI](docs/AI_MATCHING_VERIFICATION.md), [Huawei architecture](docs/HUAWEI_ARCHITECTURE.md) และ [การย้ายโฟลเดอร์](docs/FOLDER_STRUCTURE.md) เอกสารใน docs/superpowers เป็นประวัติแผนเก่า จึงอาจใช้ชื่อ apps/web และ apps/api
