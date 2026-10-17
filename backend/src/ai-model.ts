import path from 'node:path';
export const MODEL={id:'Xenova/multilingual-e5-small',revision:'761b726dd34fb83930e26aab4e9ac3899aa1fa78',dtype:'q8'};
export const MODEL_KEY=`${MODEL.id}@${MODEL.revision}:${MODEL.dtype}:text-v1`;
export const MODEL_ROOT=path.resolve(__dirname,'../storage/models');
