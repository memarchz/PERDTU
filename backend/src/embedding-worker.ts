import {parentPort,workerData} from 'node:worker_threads';
import {MODEL,MODEL_ROOT} from './ai-model';
const load=async()=>{const {pipeline,env}=await (new Function('name','return import(name)'))('@huggingface/transformers');env.cacheDir=MODEL_ROOT;env.allowRemoteModels=true;env.allowLocalModels=true;return pipeline('feature-extraction',MODEL.id,{revision:MODEL.revision,dtype:MODEL.dtype,local_files_only:!workerData?.download,device:'cpu',session_options:{intra_op_num_threads:2,inter_op_num_threads:1}});};
let pipeline:Promise<any>|undefined;
parentPort!.on('message',async({id,texts})=>{try{const run=await(pipeline||=load());const result=await run(texts,{pooling:'mean',normalize:true,truncation:true,max_length:512});parentPort!.postMessage({id,vectors:result.tolist()});}catch{pipeline=undefined;parentPort!.postMessage({id,error:'Local AI model unavailable. Run npm run ai:setup on the API server.'});}});
