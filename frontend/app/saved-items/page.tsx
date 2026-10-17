'use client';
import {useEffect} from 'react';
import {AppShell} from '../../components/app-shell';
import {RequireAuth} from '../../components/require-auth';
import {useSaved} from '../../components/saved-items-provider';
import {ItemCard} from '../../components/item-card';
import {SaveItemButton} from '../../components/save-item-button';
import {PageHeading,PageState,Button,StatusBadge} from '../../components/ui';
import type {ItemSummary} from '../../lib/types';
function Saved(){const {entries,loading,error,refresh}=useSaved();useEffect(()=>{void refresh();},[refresh]);return <><PageHeading eyebrow="KEEP A LITTLE POSSIBILITY" title="Saved items." description="A collection to come back to. Exchange preferences belong to each listing."/>{loading?<PageState title="Loading saved items…" loading/>:error?<PageState title="Could not load saved items." error description={error} action={<Button onClick={()=>void refresh()}>Try again</Button>}/>:!entries.length?<PageState title="Keep something you love." description="Use Save item while exploring to collect it here."/>:<div className="items-grid">{entries.map(e=>e.available?<ItemCard key={e.id} item={e.item as ItemSummary} showStatus/>:<article className="panel" key={e.id}><h2>{e.item.title}</h2><StatusBadge status={e.item.status}/><p>This listing is unavailable.</p><SaveItemButton itemId={e.itemId}/></article>)}</div>}</>;}
export default function SavedPage(){return <AppShell><RequireAuth><Saved/></RequireAuth></AppShell>;}
