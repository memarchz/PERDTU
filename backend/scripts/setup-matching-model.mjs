import {EmbeddingService} from '../dist/embedding-service.js';
import {MODEL,MODEL_ROOT} from '../dist/ai-model.js';
import {mkdir,writeFile} from 'node:fs/promises';
const db={embeddingCache:{findUnique:async()=>null,upsert:async()=>{}}},service=new EmbeddingService(db,{download:true});
try{console.log('Downloading pinned local model:',MODEL.id,MODEL.revision);await service.prepare([{role:'wanted',text:'query: กระเป๋าเป้'},{role:'offer',text:'passage: Laptop backpack'}]);await mkdir(MODEL_ROOT,{recursive:true});await writeFile(MODEL_ROOT+'/ready.json',JSON.stringify(MODEL));console.log('PASS real local AI inference. Model cached; runtime download disabled.');}finally{await service.close();}
