'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Heart, MapPin, PackageOpen, ShieldCheck } from 'lucide-react';
import {ExchangePreference} from '../../../components/exchange-preference';
import { ItemGallery } from '../../../components/item-gallery';
import { SaveItemButton } from '../../../components/save-item-button';
import { AppShell } from '../../../components/app-shell';
import { useAuth } from '../../../components/auth-provider';
import { Button, PageState, StatusBadge } from '../../../components/ui';
import { getJson } from '../../../lib/api.mjs';
import type { ItemSummary } from '../../../lib/types';

function Detail(){
  const {id}=useParams<{id:string}>(),{user}=useAuth();
  const [item,setItem]=useState<ItemSummary|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{const controller=new AbortController();setItem(null);setError('');getJson<ItemSummary>(`${process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000'}/api/v1/items/${id}`,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setItem(data);}).catch(err=>{if(!controller.signal.aborted)setError(err instanceof Error?err.message:'Could not load this item.');});return()=>controller.abort();},[id,retry]);
  if(error)return <><Link href="/explore" className="back-link"><ArrowLeft size={14} /> Back to exploring</Link><PageState title={error==='Not found.'?'This story isn’t here.':'Couldn’t load this item.'} description={error==='Not found.'?'The item may have been removed. There are more good things to discover.':error} error action={<Button className="secondary" onClick={()=>setRetry(retry+1)}>Try again</Button>} /></>;
  if(!item)return <PageState title="Finding this little possibility…" loading />;
  const mine=user?.id===item.ownerId;

  return <><Link href="/explore" className="back-link"><ArrowLeft size={14} /> Back to exploring</Link><div className="detail-layout"><div><ItemGallery images={item.images} imageUrl={item.imageUrl} title={item.title}/><p className="footnote">Give good things a second chapter.</p></div><article className="detail-copy"><span className="eyebrow">{item.category}</span><h1>{item.title}</h1><div className="detail-meta"><StatusBadge status={item.status} /><span>{item.condition.replaceAll('_',' ').toLowerCase()}</span><span><MapPin size={13} />{item.area}</span></div><section className="detail-description"><h2>A little about this item</h2><p>{item.description}</p></section><ExchangePreference item={item}/><div className="owner-row"><span className="avatar">{item.owner?.displayName.slice(0,1).toUpperCase()||'P'}</span><div><small>SHARED BY</small><strong>{item.owner?.displayName||'PERDTU member'}{mine?' (you)':''}</strong></div></div><SaveItemButton itemId={item.id}/>{mine?<Link href={item.status==='AVAILABLE'?`/items/${item.id}/edit`:'/my-items'} className="button full">Manage my item <ArrowRight size={16} /></Link>:item.status==='AVAILABLE'?<><Link href={`/matches?targetItemId=${item.id}`} className="button full"><Heart size={16} /> I’m interested <ArrowRight size={16} /></Link><p className="detail-smallprint">Choose an item from your closet to check what each person would give and receive.</p></>:<div className="notice">This item is already part of another story. <Link href="/explore">Explore other items.</Link></div>}<p className="footnote" style={{display:'flex',alignItems:'center',gap:7}}><ShieldCheck size={14} /> Exchange thoughtfully. Agree together.</p></article></div></>;
}
export default function ItemPage(){return <AppShell><Detail /></AppShell>;}
