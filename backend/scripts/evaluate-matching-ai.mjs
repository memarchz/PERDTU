import {verificationPath} from './verification-output.mjs';
﻿import 'dotenv/config';import {PrismaClient} from '@prisma/client';import {EmbeddingService,vectorKey} from '../dist/embedding-service.js';import {MODEL_KEY,MODEL_ROOT} from '../dist/ai-model.js';import {writeFile,mkdir,stat,readdir} from 'node:fs/promises';import assert from 'node:assert/strict';
const fixtures=[
['calibration','กระเป๋าเป้ใส่โน้ตบุ๊ก','Laptop backpack for carrying a computer','Desk lamp with adjustable light'],
['calibration','โคมไฟอ่านหนังสือ','Desk reading lamp','Running shoes'],
['calibration','หนังสือนิยายภาษาอังกฤษ','English fiction novel book','Wireless computer mouse'],
['calibration','หูฟังไร้สาย','Wireless Bluetooth headphones','Coffee mug'],
['calibration','เสื้อแจ็คเก็ต','Jacket coat clothing','Badminton racket'],
['calibration','ลูกฟุตบอล','Football soccer ball','Electric kettle'],
['evaluation','กระเป๋าสะพายหลัง','Backpack bag','Table light lamp'],
['evaluation','อุปกรณ์ให้แสงสว่างบนโต๊ะ','Desk lamp reading light','School backpack bag'],
['evaluation','แป้นพิมพ์สำหรับคอมพิวเตอร์','Computer keyboard','Kitchen cooking pan'],
['evaluation','รองเท้าสำหรับวิ่งออกกำลังกาย','Running sports shoes','Fiction novel book'],
['evaluation','นิยายให้อ่านเล่น','Fiction novel book','Bluetooth headphones'],
['evaluation','ไม้แบดมินตัน','Badminton racket','Jacket coat clothing']
];
const db=new PrismaClient(),service=new EmbeddingService(db),start=Date.now();
try{const inputs=fixtures.flatMap(([,want,yes,no])=>[{role:'wanted',text:'query: '+want},{role:'offer',text:'passage: '+yes},{role:'offer',text:'passage: '+no}]);const vectors=await service.prepare(inputs);const cosine=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),get=(role,text)=>vectors.get(vectorKey({role,text}));const results=fixtures.map(([split,want,yes,no])=>({split,want,positive:cosine(get('wanted','query: '+want),get('offer','passage: '+yes)),negative:cosine(get('wanted','query: '+want),get('offer','passage: '+no))}));for(const r of results){console.log(r.split,r.want,r.positive.toFixed(4),r.negative.toFixed(4));assert.ok(r.positive>r.negative,'Intended offer must outrank unrelated distractor');}const cal=results.filter(r=>r.split==='calibration'),maxNegative=Math.max(...cal.map(r=>r.negative)),minPositive=Math.min(...cal.map(r=>r.positive));const strong=Math.max((minPositive+maxNegative)/2,maxNegative+0.015);for(const r of results.filter(r=>r.split==='evaluation'))assert.ok(r.negative<strong,'Unrelated held-out offer must not be strong');const alternative=maxNegative+0.003;for(const r of results)assert.ok(r.negative<alternative,'Known unrelated distractor must not qualify as an alternative');const policy={strong,alternative,version:'e5-calibrated-v2',modelKey:MODEL_KEY};await mkdir('fixtures',{recursive:true});await writeFile('fixtures/matching-calibration.json',JSON.stringify(policy,null,2));await writeFile('fixtures/semantic-matching.json',JSON.stringify(fixtures,null,2));await writeFile(verificationPath('ai-evaluation.json'),JSON.stringify({modelKey:MODEL_KEY,elapsedMs:Date.now()-start,policy,results,conservativeRecall:results.filter(r=>r.positive>=strong).length/results.length},null,2));console.log('PASS 24 semantic comparisons; policy',policy);}finally{await service.close();await db.$disconnect();}
