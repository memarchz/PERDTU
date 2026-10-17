# เริ่มทดสอบ PERDTU สำหรับทีม

1. แตก ZIP แล้วเปิด terminal ภายในโฟลเดอร์ PERDTU ที่มี package.json และ docker-compose.yml ไม่ต้องเข้า frontend/backend ก่อน
2. ติดตั้ง Node.js20+ และเปิด Docker Desktop ให้พร้อมใช้งาน Linux containers ตรวจด้วย node --version, npm --version, docker compose version
3. รัน npm run setup ติดตั้ง dependencies และเตรียม PostgreSQL ถ้าติดพอร์ต5432ให้ตรวจบริการเดิมก่อน อย่า reset ฐานข้อมูลเพื่อแก้ปัญหา
4. รัน npm run ai:setup หนึ่งครั้งสำหรับโมเดล AI ต้องต่ออินเทอร์เน็ตและมีพื้นที่สำหรับ dependencies/โมเดล
5. Terminalแรก: npm run dev:backend รอ API listening
6. Terminalที่สอง: npm run dev:frontend แล้วเปิด http://localhost:3000

## ทดลอง2คน

สมัครAและBในคนละ browser profile/session ลงโคมไฟ/กระเป๋า โดยAต้องการกระเป๋าและBต้องการโคมไฟ กรอกรายละเอียดจริง เปิด Suggested swaps เลือกสินค้าตัวเองและ Two people เมื่อเจอคู่ให้ Propose แล้วทุกบัญชีรวมผู้สร้างกด Accept ที่ My trades ยืนยันรับเฉพาะหลังได้ของจริง

## ทดลอง3–4คน

เลือก Circles of2–4people ใน Suggested swaps แล้วใช้เงื่อนไขต่อเป็นวง:

- Aมีโคมไฟ ต้องการกระเป๋า
- Bมีกระเป๋า ต้องการหนังสือ
- Cมีหนังสือ ต้องการโคมไฟ (วง3คน)
- สำหรับวง4คน เปลี่ยนCเป็นต้องการหูฟัง แล้วDลงหูฟังและต้องการโคมไฟ

ทุกคนต้องใช้ backend/database ชุดเดียวกัน การแตก ZIP แล้วรันคนละเครื่องจะได้ระบบแยกกัน ถ้าจะทดสอบร่วมกันจากหลายเครื่อง ให้ใช้เครื่องโฮสต์เดียวหรือ staging deployment และตั้ง frontend/.env.local NEXT_PUBLIC_API_URL กับ backend/.env WEB_ORIGIN/PUBLIC_API_URL ให้ตรงกับที่อยู่เข้าถึงได้ โมเดลและรูปไม่ต้องส่งผ่าน ZIP

## ปัญหาที่พบบ่อย

- Dockerไม่พร้อม: เปิด Docker Desktop รอ engine แล้วรัน npm run db:up
- AI unavailable: รัน npm run ai:setup และตรวจ backend เปิดอยู่; Cold analysis อาจใช้เวลามากกว่าครั้งถัดไป
- ไม่มีคู่แนะนำ: ทุกสินค้าต้อง Available มีเงื่อนไขแลก และผู้รับแต่ละคนต้องมีของตอบกลับครบวง; AI/search ไม่ได้รับประกันพบทุกคู่
- พอร์ต3000/4000ถูกใช้: ปิดเฉพาะ process ที่คุณเปิดไว้ หรือกำหนดค่าพอร์ตและ origin ให้ตรงกัน
- รูป/บัญชีเดิมไม่อยู่: ZIP ไม่รวมฐานข้อมูลหรือรูปส่วนตัว แต่เครื่องผู้พัฒนาเดิมยังเก็บไว้ ต้องย้ายข้อมูลแยกหากต้องการ

เก็บ .env จริงเป็นส่วนตัว ส่งได้เฉพาะ .env.example การ setup จะไม่เขียนทับไฟล์ตั้งค่าที่มีอยู่แล้ว
