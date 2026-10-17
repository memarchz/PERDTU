import {Router,RequestHandler} from 'express';
import {PrismaClient} from '@prisma/client';
import {asyncRoute} from './http';
import {listingInclude,listingDto} from './listing-data';
import {runSerializable} from './serializable';
import {MediaError} from './media-store';
export function createSavedRouter(db:PrismaClient,auth:RequestHandler){
 const r=Router();r.use('/saved-items',auth);
 const dto=(entry:any)=>({...entry,available:!['DRAFT','ARCHIVED'].includes(entry.item.status),item:['DRAFT','ARCHIVED'].includes(entry.item.status)?{id:entry.item.id,title:entry.item.title,status:entry.item.status}:listingDto(entry.item)});
 r.get('/saved-items',asyncRoute(async(req,res)=>res.json((await db.savedItem.findMany({where:{userId:req.userId!},include:{item:{include:listingInclude}},orderBy:{createdAt:'desc'}})).map(dto))));
 r.put('/saved-items/:itemId',asyncRoute(async(req,res)=>{const entry=await runSerializable(db,async tx=>{const item=await tx.item.findFirst({where:{id:req.params.itemId,status:{notIn:['DRAFT','ARCHIVED']}}});if(!item)throw new MediaError('Item not found',404);return tx.savedItem.upsert({where:{userId_itemId:{userId:req.userId!,itemId:item.id}},create:{userId:req.userId!,itemId:item.id},update:{},include:{item:{include:listingInclude}}});});res.json(dto(entry));}));
 r.delete('/saved-items/:itemId',asyncRoute(async(req,res)=>{await db.savedItem.deleteMany({where:{userId:req.userId!,itemId:req.params.itemId}});res.status(204).end();}));return r;
}
