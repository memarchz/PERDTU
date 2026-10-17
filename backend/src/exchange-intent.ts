import {createHash} from 'node:crypto';
import {z} from 'zod';
export const CATEGORIES=['Electronics','Books','Clothing','Home & Living','Sports','Other'] as const;
export const intentFields={exchangeWanted:z.string().trim().min(3).max(500).nullable().optional(),exchangeCategory:z.enum(CATEGORIES).nullable().optional(),exchangeOpenToAlternatives:z.boolean().optional()};
export type Intent={exchangeWanted?:string|null;exchangeCategory?:string|null;exchangeOpenToAlternatives?:boolean};
export function parseIntent(data:unknown,{creating}:{creating:boolean}):Intent{const parsed=z.object(intentFields).parse(data);if(creating&&!parsed.exchangeWanted&&!parsed.exchangeCategory)throw new z.ZodError([{code:'custom',path:['exchangeWanted'],message:'Describe what you want in exchange or choose a wanted category.'}]);return parsed;}
export function itemFingerprint(item:any):string{return createHash('sha256').update(JSON.stringify([item.id,item.ownerId,item.status,String(item.updatedAt||''),item.title,item.description,item.category,item.exchangeWanted||null,item.exchangeCategory||null,!!item.exchangeOpenToAlternatives])).digest('hex');}
export function embeddingText(item:any,role:'offer'|'wanted'):string{return role==='offer'?`passage: ${item.title}. ${item.description}. ${item.category}`:`query: ${item.exchangeWanted||item.exchangeCategory||''}`;}
export function hasIntent(item:Intent){return !!(item.exchangeWanted||item.exchangeCategory);}
