'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useSaved} from './saved-items-provider';
import {useAuth} from './auth-provider';
import {archiveListing} from '../lib/saved.mjs';
export function OwnerActions({id,refresh}:{id:string;refresh:()=>Promise<unknown>}){const {request}=useAuth(),saved=useSaved(),[confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function archive(){setBusy(true);setError('');try{await archiveListing(id,request,async()=>{await refresh();await saved.refresh();});setConfirm(false);}catch(e){setError(e instanceof Error?e.message:'Could not archive.');}finally{setBusy(false);}}
 return <div className="owner-actions"><div className="button-row"><Link className="button secondary" href={`/items/${id}/edit`}>Edit item</Link><button type="button" className="text-link" disabled={busy} onClick={()=>setConfirm(true)}>Archive</button></div>{confirm&&<div className="notice"><p>Archive this listing? It will leave public browsing and cancel pending exchange proposals that contain it. Confirmed exchanges cannot be archived.</p><div className="button-row"><button type="button" className="button" disabled={busy} onClick={()=>void archive()}>{busy?'Archiving…':'Confirm archive'}</button><button type="button" className="button secondary" disabled={busy} onClick={()=>setConfirm(false)}>Keep listing</button></div></div>}{error&&<p className="alert" role="alert">{error} Refresh your closet to see its current status.</p>}</div>;
}
