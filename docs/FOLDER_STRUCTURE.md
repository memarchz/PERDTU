# Folder mapping — 2026-10-17

| เดิม | ใหม่ |
| --- | --- |
| apps/web | frontend |
| apps/api | backend |
| services/matching-worker | backend/prototypes/matching-worker |

ย้าย source, dependencies, real env และ local storage ไปด้วย พาธภายใน frontend/backend ยังเหมือนเดิม storage resolve จาก src/dist ของ backend จึงใช้รูปและโมเดลเดิมได้ Prisma schema/migrations และ Compose อยู่เดิมในระดับโปรเจกต์ จึงไม่เปลี่ยนชื่อ Docker volume project จากการเปลี่ยนโฟลเดอร์แอป

เอกสารแผนใน docs/superpowers และ execution ledger เก็บเป็นประวัติ ไม่ bulk rewrite หลักฐานเก่า เมื่อทำตามเอกสารเก่าให้ใช้ตาราง mapping นี้ README และคู่มือสำหรับทีมใช้พาธใหม่ทั้งหมด

Package ZIP ไม่รวมประวัติแผนเก่า/ledger, secrets, build outputs, installed dependencies หรือ local storage ทีมต้อง setup บนเครื่องของตัวเอง ตัวอย่างPythonเป็น prototype ที่ไม่อยู่ในเส้นทาง production
## Verification after the move

Backend22tests and frontend52tests pass. Backend TypeScript and frontend production build pass. Real local-model evaluation24comparisons passes using the retained model directory. Real media smoke93 and AI smoke22 pass; all3database migrations are current. API/website/explore/matches HTTP endpoints return200 from the new paths. Real env and Prisma schema hashes remain unchanged.

The share archive was CRC-tested and extracted to a workspace verification directory; manifests, secret/build/dependency exclusions and setup help/script syntax were checked. A fresh-machine dependency installation was not executed in that extracted copy. Existing installations were used for the build/runtime verification above. Interactive browser testing is not implied.

The old empty apps/api and apps directories were removed after an authorized Docker Desktop restart released their working-directory handles. All previously running containers were restored. Historical ledger references retain their original paths intentionally.
