import 'dotenv/config';
import { createAuth, asyncRoute } from './http';
import { createMediaRouter } from './media-routes';
import { MediaError } from './media-store';
import { createListingRouter } from './listing-routes';
import { createSavedRouter } from './saved-routes';
import { createChatRouter } from './chat-routes';
import { ChatError } from './trade-chat';
import {createProposal} from './trade-proposal';
import { listingInclude, listingDto } from './listing-data';
import { randomUUID } from 'node:crypto';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, Prisma, ItemStatus } from '@prisma/client';
import { z } from 'zod';
import {MatchService} from './match-service';
import {createMatchRouter} from './match-routes';
import { publicUserSelect, tradeInclude } from './trade-view';
import { runSerializable, conflictMessage } from './serializable';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
const db = new PrismaClient();
const app = express();
app.use(cors({origin: process.env.WEB_ORIGIN || 'http://localhost:3000'}));
app.use(express.json({limit:'100kb'}));
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 24) throw new Error('Set a strong JWT_SECRET in .env');
const auth = createAuth(secret);
app.use('/api/v1',createMediaRouter(db,auth));
app.use('/api/v1',createListingRouter(db,auth));
app.use('/api/v1',createSavedRouter(db,auth));
app.use('/api/v1',createChatRouter(db,auth));
app.get('/health',(_req,res)=>res.json({status:'ok'}));
app.post('/api/v1/auth/register',asyncRoute(async(req,res)=>{
 const d=z.object({email:z.string().email(),password:z.string().min(10),displayName:z.string().min(2).max(80)}).parse(req.body);
 const email=d.email.trim().toLowerCase(); if(await db.user.findUnique({where:{email}})) return res.status(409).json({error:'Email already registered'});
 const user=await db.user.create({data:{email,displayName:d.displayName,passwordHash:await bcrypt.hash(d.password,12)}});
 return res.status(201).json({id:user.id,email:user.email});
}));
app.post('/api/v1/auth/login',asyncRoute(async(req,res)=>{
 const d=z.object({email:z.string().email(),password:z.string()}).parse(req.body);
 const user=await db.user.findUnique({where:{email:d.email.trim().toLowerCase()}});
 if(!user || !await bcrypt.compare(d.password,user.passwordHash)) return res.status(401).json({error:'Invalid credentials'});
 return res.json({accessToken:jwt.sign({sub:user.id},secret!,{expiresIn:'2h'}),user:{id:user.id,displayName:user.displayName,email:user.email}});
}));
app.get('/api/v1/users/me',auth,asyncRoute(async(req,res)=>res.json(await db.user.findUnique({where:{id:req.userId!},select:{id:true,email:true,displayName:true,role:true}}))));
app.all(['/api/v1/wishlist','/api/v1/wishlist/:id'],auth,(_req,res)=>res.status(410).json({error:'Wishlist has been retired. Set exchange preferences on each listing.'}));
const matchService=new MatchService(db);
app.use('/api/v1',createMatchRouter(matchService,auth));
app.post('/api/v1/trades',auth,asyncRoute(async(req,res)=>{
 const d=z.object({edges:z.array(z.object({from:z.string().uuid(),to:z.string().uuid(),itemId:z.string().uuid()})).min(2).max(4),expectedFingerprints:z.record(z.string()).optional()}).parse(req.body);
 const prepared=await matchService.prepareEvaluation(d.edges,req.userId!);
 if(d.expectedFingerprints&&d.edges.some(e=>d.expectedFingerprints![e.itemId]!==prepared.fingerprints[e.itemId]))throw new MediaError('Listing details changed. Refresh suggestions before proposing.',409);
 const trade=await createProposal(db,req.userId!,d.edges,prepared); res.status(201).json(trade);
}));
app.get('/api/v1/trades',auth,asyncRoute(async(req,res)=>res.json(await db.trade.findMany({where:{participants:{some:{userId:req.userId!}}},include:tradeInclude,orderBy:{createdAt:'desc'}}))));
app.get('/api/v1/trades/:id',auth,asyncRoute(async(req,res)=>{
 const trade=await db.trade.findFirst({where:{id:req.params.id,participants:{some:{userId:req.userId!}}},include:tradeInclude});
 if(!trade) return res.status(404).json({error:'Trade not found'});
 return res.json(trade);
}));
app.post('/api/v1/trades/:id/respond',auth,asyncRoute(async(req,res)=>{
 const {accept}=z.object({accept:z.boolean()}).parse(req.body);
 try { const result=await runSerializable(db,async tx=>{
   const trade=await tx.trade.findUnique({where:{id:req.params.id},include:{participants:true,items:true}});
   if(!trade||trade.status!=='PROPOSED') throw Error('Trade is not awaiting responses');
   const me=trade.participants.find(p=>p.userId===req.userId); if(!me||me.decision!=='PENDING') throw Error('Not authorized or already responded');
   await tx.tradeParticipant.update({where:{id:me.id},data:{decision:accept?'ACCEPTED':'DECLINED'}});
   if(!accept) { await tx.trade.update({where:{id:trade.id},data:{status:'DECLINED'}}); }
   else if(trade.participants.every(p=>p.id===me.id||p.decision==='ACCEPTED')) {
     for(const ti of trade.items) {
       const updated=await tx.item.updateMany({where:{id:ti.itemId,status:'AVAILABLE'},data:{status:'RESERVED'}});
       if(updated.count!==1) throw Error('Item already reserved; trade cannot be confirmed');
     }
     await tx.trade.update({where:{id:trade.id},data:{status:'CONFIRMED'}});
   }
   await tx.tradeEvent.create({data:{tradeId:trade.id,actorId:req.userId!,eventType:accept?'ACCEPTED':'DECLINED'}});
   return tx.trade.findUnique({where:{id:trade.id},include:{participants:true}});
 }); res.json(result);
 } catch(e) { res.status(409).json({error:conflictMessage(e)}); }
}));
app.post('/api/v1/trades/:id/receipt',auth,asyncRoute(async(req,res)=>{
 try {const result=await runSerializable(db,async tx=>{
  const trade=await tx.trade.findUnique({where:{id:req.params.id},include:{participants:true,items:true}});
  if(!trade||!['CONFIRMED','EXCHANGING'].includes(trade.status)) throw Error('Trade is not active');
  const me=trade.participants.find(p=>p.userId===req.userId); if(!me||me.received) throw Error('Not authorized or already confirmed');
  await tx.tradeParticipant.update({where:{id:me.id},data:{received:true}});
  const done=trade.participants.every(p=>p.id===me.id||p.received);
  await tx.trade.update({where:{id:trade.id},data:{status:done?'COMPLETED':'EXCHANGING'}});
  if(done) for(const item of trade.items) await tx.item.update({where:{id:item.itemId},data:{status:'EXCHANGED'}});
  await tx.tradeEvent.create({data:{tradeId:trade.id,actorId:req.userId!,eventType:'RECEIPT_CONFIRMED'}});
  return {completed:done};
 }); res.json(result);
 } catch(e){res.status(409).json({error:conflictMessage(e)});}
}));
app.post('/api/v1/uploads/presign',auth,asyncRoute(async(req,res)=>{
 const d=z.object({contentType:z.enum(['image/jpeg','image/png','image/webp'])}).parse(req.body);
 const endpoint=process.env.OBS_ENDPOINT,bucket=process.env.OBS_BUCKET;
 if(!endpoint||!bucket||!process.env.OBS_ACCESS_KEY_ID||!process.env.OBS_SECRET_ACCESS_KEY) return res.status(503).json({error:'OBS is not configured'});
 const client=new S3Client({endpoint,region:process.env.OBS_REGION||'ap-southeast-3',credentials:{accessKeyId:process.env.OBS_ACCESS_KEY_ID,secretAccessKey:process.env.OBS_SECRET_ACCESS_KEY},forcePathStyle:true});
 const key=`items/${req.userId}/${randomUUID()}`;
 const url=await getSignedUrl(client,new PutObjectCommand({Bucket:bucket,Key:key,ContentType:d.contentType}),{expiresIn:300});
 res.json({url,key,expiresIn:300});
}));
app.use((err:any,_req:Request,res:Response,_next:NextFunction)=>{
 if(err instanceof ChatError) return res.status(err.status).json({error:err.message});
 if(err instanceof Prisma.PrismaClientKnownRequestError && ['P2034','P2028'].includes(err.code)) return res.status(409).json({error:'This conversation changed. Please retry your message.'});
 if(err instanceof MediaError) return res.status(err.status).json({error:err.message});
 if(err instanceof z.ZodError) return res.status(400).json({error:'Validation failed',details:err.flatten()});
 console.error(err); res.status(500).json({error:'Internal server error'});
});
app.listen(Number(process.env.PORT||4000),()=>console.log('PERDTU API listening'));
