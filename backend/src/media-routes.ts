import { Router, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { asyncRoute } from './http';
import { MAX_IMAGE_BYTES, MediaError, writePhoto, removePhotoFile, photoFilePath } from './media-store';
export function createMediaRouter(db:PrismaClient,auth:RequestHandler) {
 const router=Router(), upload=multer({storage:multer.memoryStorage(),limits:{fileSize:MAX_IMAGE_BYTES,files:1,fields:0,parts:1}}).single('file');
 router.post('/uploads/images',auth,(req,res,next)=>upload(req,res,error=>{
   if(error)return res.status(error.code==='LIMIT_FILE_SIZE'?413:400).json({error:'Upload one JPEG, PNG or WebP photo, at most 5 MiB.'});next();
 }),asyncRoute(async(req,res)=>{
   if(!req.file)throw new MediaError('Select one photo.');
   const stored=await writePhoto(req.file.buffer);let id:string|undefined;
   try {if(req.aborted||res.destroyed)throw new MediaError('Upload interrupted.');
     const photo=await db.photo.create({data:{...stored,ownerId:req.userId!}});id=photo.id;
     if(req.aborted||res.destroyed)throw new MediaError('Upload interrupted.');
     res.status(201).json({id:photo.id,mime:photo.mime,bytes:photo.bytes,width:photo.width,height:photo.height});
   }catch(error){if(id)await db.photo.delete({where:{id}});await removePhotoFile(stored.filename);throw error;}
 }));
 router.delete('/uploads/images/:id',auth,asyncRoute(async(req,res)=>{
   const photo=await db.photo.findFirst({where:{id:req.params.id,ownerId:req.userId!,itemId:null}});
   if(!photo)return res.status(404).json({error:'Photo not found'});
   // A transaction locks this row against concurrent attachment before touching its file.
   await db.$transaction(async tx=>{const deleted=await tx.photo.deleteMany({where:{id:photo.id,ownerId:req.userId!,itemId:null}});if(!deleted.count)throw new MediaError('Photo not found',404);await removePhotoFile(photo.filename);});
   res.status(204).end();
 }));
 router.get('/media/:id',asyncRoute(async(req,res)=>{
   res.set({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
   const photo=await db.photo.findFirst({where:{id:req.params.id,item:{status:{notIn:['DRAFT','ARCHIVED']}}}});
   if(!photo)return res.status(404).json({error:'Photo not found'});
   res.type('image/webp').sendFile(photoFilePath(photo.filename),error=>{if(error&&!res.headersSent)res.status(404).json({error:'Photo not found'});});
 }));return router;
}
