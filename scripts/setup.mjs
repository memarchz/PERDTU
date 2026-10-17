import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
if(process.argv.includes('--help')){console.log('npm run setup: create missing local env files, install frontend/backend, start PostgreSQL and apply migrations. Does not overwrite config/reset data/download AI. Next: npm run ai:setup.');process.exit(0);}
if(Number(process.versions.node.split('.')[0])<20)throw Error('Node.js20+ required.');
function run(command,folder=''){execSync(command,{cwd:new URL(folder||'.',new URL('../',import.meta.url)),stdio:'inherit'});}
function config(relative,template,transform=s=>s){const dest=new URL('../'+relative,import.meta.url);if(!existsSync(dest)){writeFileSync(dest,transform(readFileSync(new URL('../'+template,import.meta.url),'utf8')),{flag:'wx'});console.log('Created '+relative);}else console.log('Preserved '+relative);}
config('backend/.env','backend/.env.example',s=>s.replace('REPLACE_WITH_A_LONG_RANDOM_SECRET',randomBytes(48).toString('hex')));
config('frontend/.env.local','frontend/.env.example');
run('docker compose up -d postgres');
let ready=false;for(let n=0;n<30;n++){try{execSync('docker compose exec -T postgres pg_isready -U perdtu -d perdtu',{cwd:root,stdio:'ignore'});ready=true;break;}catch{await new Promise(r=>setTimeout(r,1000));}}
if(!ready)throw Error('PostgreSQL is not ready. Check Docker Desktop and docker compose logs postgres.');
run('npm ci','backend/');run('npx --no-install prisma generate','backend/');run('npx --no-install prisma migrate deploy','backend/');run('npm ci','frontend/');
console.log('\nSetup complete. Run npm run ai:setup once for local AI, then npm run dev:backend and npm run dev:frontend in separate terminals.');
