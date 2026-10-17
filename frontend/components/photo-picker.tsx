'use client';
import {useEffect,useRef,useState} from 'react';
import {useAuth} from './auth-provider';
import {addPhoto,movePhoto,removePhoto,releasePreviews,type PhotoDraft} from '../lib/photos.mjs';
export function PhotoPicker({value,onChange,disabled=false,onBusyChange}:{value:PhotoDraft[];onChange:(p:PhotoDraft[])=>void;disabled?:boolean;onBusyChange?:(busy:boolean)=>void}){
 const {request,user}=useAuth(),[busy,setBusy]=useState(false),[error,setError]=useState('');const current=useRef(value),urls=useRef(new Set<string>()),generation=useRef(0);current.current=value;
 useEffect(()=>{generation.current++;return()=>{generation.current++;releasePreviews(urls.current);};},[user?.id]);
 async function select(files:FileList|null){if(!files||busy)return;const stamp=generation.current;setBusy(true);onBusyChange?.(true);setError('');
  try{for(const file of Array.from(files)){
   if(current.current.length>=4)throw Error('Choose up to four photos.');
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error('Choose JPEG, PNG or WebP photos, at most 5 MiB each.');
   const formData=new FormData();formData.set('file',file);
   const photo=await request<{id:string;width:number;height:number}>('/uploads/images',{method:'POST',formData});
   if(stamp!==generation.current)return;
   const previewUrl=URL.createObjectURL(file);urls.current.add(previewUrl);current.current=addPhoto(current.current,{...photo,previewUrl});onChange(current.current);
  }}catch(e){if(stamp===generation.current)setError(e instanceof Error?e.message:'Upload failed. Earlier photos are kept.');}finally{if(stamp===generation.current){setBusy(false);onBusyChange?.(false);}}
 }
 async function remove(photo:PhotoDraft){if(busy||disabled)return;const stamp=generation.current;setBusy(true);onBusyChange?.(true);setError('');try{
  try{await request('/uploads/images/'+photo.id,{method:'DELETE'});}catch(e){if(!(e instanceof Error&&'status' in e&&e.status===404))throw e;}
  if(stamp!==generation.current)return;
  if(urls.current.delete(photo.previewUrl))URL.revokeObjectURL(photo.previewUrl);onChange(removePhoto(current.current,photo.id));
 }catch(e){if(stamp===generation.current)setError(e instanceof Error?e.message:'Could not remove photo.');}finally{if(stamp===generation.current){setBusy(false);onBusyChange?.(false);}}}

 return <section className="photo-picker"><h3>Photos <small>up to 4</small></h3><p className="muted">JPEG, PNG or WebP · 5 MiB each. The first photo is your cover.</p><div className="photo-grid">{value.map((p,i)=><div key={p.id} className="photo-tile">{p.previewUrl?<img src={p.previewUrl} alt={`Photo ${i+1}`} />:<div className="notice">Uploaded photo {i+1} ? preview available after publishing</div>}<div className="button-row"><button type="button" disabled={disabled||busy||i===0} onClick={()=>onChange(movePhoto(value,p.id,-1))} aria-label={`Move photo ${i+1} left`}>←</button><button type="button" disabled={disabled||busy||i===value.length-1} onClick={()=>onChange(movePhoto(value,p.id,1))} aria-label={`Move photo ${i+1} right`}>→</button><button type="button" disabled={disabled||busy} onClick={()=>remove(p)}>Remove</button></div></div>)}</div><label className="form-field">{busy?'Uploading…':'Add photos'}<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={disabled||busy||value.length>=4} onChange={e=>{void select(e.target.files);e.target.value='';}} /></label>{error&&<p role="alert" className="alert">{error} Earlier uploads and your text are kept.</p>}</section>;
}
