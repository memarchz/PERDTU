import {Router,RequestHandler} from 'express';
import {PrismaClient,Prisma} from '@prisma/client';
import {z} from 'zod';
import {intentFields,parseIntent,hasIntent} from './exchange-intent';
import {asyncRoute} from './http';
import {MediaError} from './media-store';
import {listingInclude,listingDto,mediaUrl} from './listing-data';
import {runSerializable} from './serializable';
const fields=z.object({...intentFields,title:z.string().min(3).max(120),description:z.string().min(10).max(3000),category:z.string().min(2).max(60),condition:z.enum(['LIKE_NEW','GOOD','FAIR','FOR_PARTS']),area:z.string().max(120).optional(),imageUrl:z.string().url().optional(),photoIds:z.array(z.string().uuid()).max(4).refine(ids=>new Set(ids).size===ids.length,'Photos must be distinct').optional()});
async function attach(tx:Prisma.TransactionClient,ownerId:string,itemId:string,ids:string[]){
 const photos=await tx.photo.findMany({where:{id:{in:ids},ownerId,OR:[{itemId:null},{itemId}]}});
 if(photos.length!==ids.length)throw new MediaError('Choose your own uploaded photos. Photos already used by another listing cannot be moved.');
 await tx.photo.updateMany({where:{itemId},data:{position:null}});
 for(let position=0;position<ids.length;position++)await tx.photo.update({where:{id:ids[position]},data:{itemId,position}});
 await tx.item.update({where:{id:itemId},data:{imageUrl:ids.length?mediaUrl(ids[0]):null}});
}
export function createListingRouter(db:PrismaClient,auth:RequestHandler){
 const r=Router();
 r.get('/items',asyncRoute(async(req,res)=>{const q=String(req.query.q||'').slice(0,100),category=String(req.query.category||'');res.json((await db.item.findMany({where:{status:'AVAILABLE',...(category?{category}:{}),...(q?{OR:[{title:{contains:q,mode:'insensitive'}},{description:{contains:q,mode:'insensitive'}}]}:{})},include:listingInclude,orderBy:{createdAt:'desc'},take:40})).map(listingDto));}));
 r.get('/items/:id',asyncRoute(async(req,res)=>{const item=await db.item.findUnique({where:{id:req.params.id},include:listingInclude});if(!item||['DRAFT','ARCHIVED'].includes(item.status))return res.status(404).json({error:'Not found'});res.json(listingDto(item));}));
 r.get('/me/items',auth,asyncRoute(async(req,res)=>res.json((await db.item.findMany({where:{ownerId:req.userId!},include:listingInclude,orderBy:{createdAt:'desc'}})).map(listingDto))));
 r.post('/items',auth,asyncRoute(async(req,res)=>{const {photoIds,...data}=fields.parse(req.body);parseIntent(data,{creating:true});const item=await runSerializable(db,async tx=>{const created=await tx.item.create({data:{...data,ownerId:req.userId!}});if(photoIds)await attach(tx,req.userId!,created.id,photoIds);return tx.item.findUniqueOrThrow({where:{id:created.id},include:listingInclude});});res.status(201).json(listingDto(item));}));
 for(const method of ['patch','delete'] as const)r[method]('/items/:id',auth,asyncRoute(async(req,res)=>{
   const patch=method==='patch'?fields.partial().parse(req.body):{};
   try {const result=await runSerializable(db,async tx=>{
     const item=await tx.item.findFirst({where:{id:req.params.id,ownerId:req.userId!}});if(!item)throw new MediaError('Item not found',404);
     if(item.status!=='AVAILABLE')throw new MediaError('This listing is reserved, exchanged or archived. Refresh your inventory.',409);
     const {photoIds,...data}=patch;
     if(hasIntent(item)&&!hasIntent({...item,...data}))throw new MediaError('Keep an exchange description or wanted category.');
     await tx.item.update({where:{id:item.id},data:method==='delete'?{status:'ARCHIVED'}:data});
     if(photoIds)await attach(tx,req.userId!,item.id,photoIds);
     const pending=await tx.trade.findMany({where:{status:'PROPOSED',items:{some:{itemId:item.id}}},select:{id:true}});
     for(const trade of pending){await tx.trade.update({where:{id:trade.id},data:{status:'CANCELLED'}});await tx.tradeEvent.create({data:{tradeId:trade.id,actorId:req.userId!,eventType:method==='delete'?'ITEM_ARCHIVED':'ITEM_UPDATED'}});}
     return tx.item.findUniqueOrThrow({where:{id:item.id},include:listingInclude});
   });return method==='delete'?res.status(204).end():res.json(listingDto(result));
   }catch(error){if(error instanceof MediaError)throw error;if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2034')throw new MediaError('This listing changed. Refresh your inventory and try again.',409);throw error;}
 }));return r;
}
