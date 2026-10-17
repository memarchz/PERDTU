import { PrismaClient, Prisma } from '@prisma/client';
import { Router, RequestHandler } from 'express';
import { asyncRoute } from './http';
import { publicUserSelect } from './trade-view';
import { runSerializable } from './serializable';
import { chatAccess, ChatError, decodeCursor, encodeCursor, messageInput, pageInput } from './trade-chat';

const include={sender:{select:publicUserSelect}};
const dto=(m:{id:string,body:string,createdAt:Date,clientMessageId:string,sender:{id:string,displayName:string}})=>
  ({id:m.id,body:m.body,createdAt:m.createdAt.toISOString(),clientMessageId:m.clientMessageId,sender:m.sender});

export function createChatRouter(db:PrismaClient,auth:RequestHandler) {
  const router=Router();
  router.get('/trades/:id/messages',auth,asyncRoute(async(req,res)=>{
    const trade=await db.trade.findFirst({where:{id:req.params.id,participants:{some:{userId:req.userId!}}},select:{id:true,status:true}});
    if(!trade)throw new ChatError('Trade not found',404);
    const query=pageInput.parse(req.query),access=chatAccess(trade.status);
    if(!access.opened)return res.json({...access,messages:[],olderCursor:null,nextCursor:null,hasMore:false});
    const cursor=query.before??query.after;
    let boundary:Prisma.TradeMessageWhereInput={};
    if(cursor!==undefined){
      const point=decodeCursor(cursor);
      if(!await db.tradeMessage.findFirst({where:{tradeId:trade.id,id:point.id,createdAt:point.createdAt},select:{id:true}}))throw new ChatError('Invalid message cursor',400);
      boundary=query.after!==undefined?{OR:[{createdAt:{gt:point.createdAt}},{createdAt:point.createdAt,id:{gt:point.id}}]}:
        {OR:[{createdAt:{lt:point.createdAt}},{createdAt:point.createdAt,id:{lt:point.id}}]};
    }
    const direction=query.after!==undefined?'asc':'desc';
    const rows=await db.tradeMessage.findMany({where:{tradeId:trade.id,...boundary},include,orderBy:[{createdAt:direction},{id:direction}],take:51});
    const hasMore=rows.length>50,page=rows.slice(0,50);if(direction==='desc')page.reverse();
    res.json({...access,messages:page.map(dto),olderCursor:page.length?encodeCursor(page[0]):null,
      nextCursor:page.length?encodeCursor(page[page.length-1]):query.after??null,hasMore});
  }));
  router.post('/trades/:id/messages',auth,asyncRoute(async(req,res)=>{
    const input=messageInput.parse(req.body);
    const result=await runSerializable(db,async tx=>{
      // Serialize chat writes with receipt/status transitions on the existing trade row.
      const member=await tx.tradeParticipant.findUnique({where:{tradeId_userId:{tradeId:req.params.id,userId:req.userId!}},select:{id:true}});
      if(!member)throw new ChatError('Trade not found',404);
      await tx.trade.update({where:{id:req.params.id},data:{updatedAt:new Date()},select:{id:true}});
      const trade=await tx.trade.findFirst({where:{id:req.params.id,participants:{some:{userId:req.userId!}}},select:{id:true,status:true}});
      if(!trade)throw new ChatError('Trade not found',404);
      const prior=await tx.tradeMessage.findUnique({where:{tradeId_senderId_clientMessageId:{tradeId:trade.id,senderId:req.userId!,clientMessageId:input.clientMessageId}},include});
      if(prior){if(prior.body!==input.body)throw new ChatError('Message identifier was already used for different text',409);return {message:dto(prior),created:false};}
      if(!chatAccess(trade.status).canSend)throw new ChatError('Messages can only be sent after everyone accepts and before completion',409);
      // Monotonic per-trade timestamps keep polling cursors safe across concurrent sends.
      const latest=await tx.tradeMessage.findFirst({where:{tradeId:trade.id},orderBy:[{createdAt:'desc'},{id:'desc'}],select:{createdAt:true}});
      const createdAt=new Date(Math.max(Date.now(),latest?latest.createdAt.getTime()+1:0));
      const message=await tx.tradeMessage.create({data:{tradeId:trade.id,senderId:req.userId!,...input,createdAt},include});
      return {message:dto(message),created:true};
    },{maxWait:10000,timeout:10000});
    res.status(result.created?201:200).json({message:result.message});
  }));
  return router;
}
