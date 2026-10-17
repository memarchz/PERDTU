'use client';
import {useState} from 'react';
import type {ItemSummary} from '../lib/types';
export function ItemGallery({images,imageUrl,title}:{images?:ItemSummary['images'];imageUrl?:string|null;title:string}){
 const photos=images?.length?images.map(p=>({id:p.id,url:p.url})):imageUrl?[{id:'legacy',url:imageUrl}]:[];
 const [selected,setSelected]=useState(''),[failed,setFailed]=useState<string[]>([]);const active=photos.find(p=>p.id===selected)||photos[0];
 return <div className="item-gallery"><div className="gallery-main">{active&&!failed.includes(active.url)?<img src={active.url} alt={title} onError={()=>setFailed(old=>[...old,active.url])}/>:<div className="item-placeholder">Photo unavailable</div>}</div>{photos.length>1&&<div className="gallery-thumbnails">{photos.map((p,i)=><button type="button" key={p.id} aria-label={`View photo ${i+1}`} aria-pressed={active?.id===p.id} onClick={()=>setSelected(p.id)}><img src={p.url} alt=""/></button>)}</div>}</div>;
}
