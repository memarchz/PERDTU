'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Search, Leaf, Plus } from 'lucide-react';
import { AppShell } from '../../components/app-shell';
import { ItemCard } from '../../components/item-card';
import { Button, PageHeading, PageState } from '../../components/ui';
import { getJson } from '../../lib/api.mjs';
import { CATEGORIES, type ItemSummary } from '../../lib/types';

function Browse(){
  const params=useSearchParams(),router=useRouter();
  const q=params.get('q')||'',category=params.get('category')||'';
  const [draft,setDraft]=useState(q),[items,setItems]=useState<ItemSummary[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
  useEffect(()=>{setDraft(q);},[q]);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');setItems([]);
    const query=new URLSearchParams({q,...(category?{category}:{})});
    getJson<ItemSummary[]>(`${process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000'}/api/v1/items?${query}`,{signal:controller.signal})
      .then(data=>{if(!Array.isArray(data))throw Error('Could not load items.');if(!controller.signal.aborted)setItems(data);})
      .catch(err=>{if(!controller.signal.aborted)setError(err instanceof Error?err.message:'Could not load items.');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[q,category,retry]);
  function search(value:string,selected=category){const next=new URLSearchParams();if(value.trim())next.set('q',value.trim());if(selected)next.set('category',selected);router.push(`/explore${next.size?'?'+next:''}`,{scroll:false});}
  return <><PageHeading eyebrow="GOOD THINGS COME AROUND" title="Find your next favourite." description="Things with a past. Possibilities with a future." /><form className="browse-search" onSubmit={e=>{e.preventDefault();search(draft);}}><Search size={18} /><input aria-label="Search items" placeholder="Search for something you’d love…" value={draft} onChange={e=>setDraft(e.target.value)} /><button className="text-link" aria-label="Submit search" type="submit"><ArrowRight size={18} /></button></form><section className="browse-banner"><div className="banner-copy"><p className="eyebrow">SMALL SWAPS. BIG POSSIBILITIES.</p><h2>A little less clutter.<br />A whole new story.</h2><p>Give what you don’t need. Find what you do.</p><Link href="/post" className="button"><Plus size={14} /> Open your closet</Link></div><img src="/closet-illustration.svg" alt="" /></section><div className="category-row" aria-label="Filter by category">{['',...CATEGORIES].map(c=><button key={c} type="button" className={`category-chip ${category===c?'active':''}`} aria-pressed={category===c} onClick={()=>search(draft,c)}>{c||'All items'}</button>)}</div><div className="list-heading"><h2>{q?'Search results':category||'Recent listings'}</h2><span>{!loading&&!error?`${items.length} ${items.length===1?'item':'items'}`:<Leaf size={14} />}</span></div>{loading?<PageState title="Finding good things…" loading />:error?<PageState title="Couldn’t open the closet." description={error} error action={<Button className="secondary" onClick={()=>setRetry(retry+1)}>Try again</Button>} />:!items.length?<PageState title="A little room for possibility." description="No items match this search yet. Try another category, or be the first to share something." action={<Link href="/post" className="button">Post an item <Plus size={15} /></Link>} />:<div className="items-grid">{items.map(item=><ItemCard key={item.id} item={item} />)}</div>}</>;
}
export default function Explore(){return <AppShell><Browse /></AppShell>;}
