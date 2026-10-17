import { Prisma } from '@prisma/client';
export const listingInclude = {owner:{select:{id:true,displayName:true}},photos:{where:{position:{not:null}},orderBy:{position:'asc' as const}}};
export function mediaUrl(id:string) {return `${(process.env.PUBLIC_API_URL||`http://localhost:${process.env.PORT||4000}`).replace(/\/$/,'')}/api/v1/media/${id}`;}
export function listingDto(item:Prisma.ItemGetPayload<{include:typeof listingInclude}>) {
 const {photos,...data}=item;
 return {...data,images:photos.map(p=>({id:p.id,url:mediaUrl(p.id),width:p.width,height:p.height,position:p.position}))};
}
