import {PrismaClient,Prisma} from '@prisma/client';
import {evaluateCycle} from './matching';
import {itemFingerprint} from './exchange-intent';
import type {Prepared} from './match-service';
import {tradeInclude} from './trade-view';
import {runSerializable} from './serializable';
import {MediaError} from './media-store';
type Edge={from:string;to:string;itemId:string};
export async function createProposal(db:PrismaClient,userId:string,edges:Edge[],prepared?:Prepared){
if(!prepared)throw new MediaError('Refresh AI suggestions before proposing an exchange.',409);
return runSerializable(db,async tx=>{
 const users=edges.map(e=>e.from); const ids=edges.map(e=>e.itemId);
 if(new Set(users).size!==users.length || new Set(ids).size!==ids.length || !users.includes(userId)) throw new MediaError('Invalid trade cycle');
 if(edges.some(e=>!users.includes(e.to)) || edges.some(e=>edges.filter(x=>x.to===e.to).length!==1)) throw new MediaError('Cycle must give and receive exactly once');
 const items=await tx.item.findMany({where:{id:{in:ids},status:'AVAILABLE'}});
 if(items.length!==ids.length || edges.some(e=>items.find(i=>i.id===e.itemId)?.ownerId!==e.from)) throw new MediaError('Some items are unavailable',409);
 if(items.some(i=>prepared.fingerprints[i.id]!==itemFingerprint(i)))throw new MediaError('Listing details changed. Refresh suggestions before proposing.',409);
 if(!evaluateCycle(items,edges,userId,prepared.vectors,prepared.policy))throw new MediaError('Trade no longer matches listing preferences');
 const trade=await tx.trade.create({data:{participants:{create:users.map(userId=>({userId}))},items:{create:edges.map(e=>({itemId:e.itemId,fromUserId:e.from,toUserId:e.to,snapshot:JSON.parse(JSON.stringify(items.find(i=>i.id===e.itemId)!)) as Prisma.InputJsonValue}))},events:{create:{actorId:userId,eventType:'PROPOSED'}}},include:tradeInclude});
 return trade;
});}
