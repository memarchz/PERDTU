import {parentPort} from 'node:worker_threads';import {findItemCycles} from './matching';
parentPort!.on('message',({id,items,anchor,options,vectors,policy})=>{try{parentPort!.postMessage({id,result:findItemCycles(items,anchor,options,new Map(vectors),policy)});}catch{parentPort!.postMessage({id,error:true});}});
