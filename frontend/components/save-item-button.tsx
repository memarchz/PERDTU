'use client';
import {useState} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {Heart} from 'lucide-react';
import {useAuth} from './auth-provider';
import {useSaved} from './saved-items-provider';
export function SaveItemButton({itemId}:{itemId:string}){const {user}=useAuth(),{entries,setSaved,loading}=useSaved(),path=usePathname(),router=useRouter(),[busy,setBusy]=useState(false),[error,setError]=useState('');const saved=entries.some(e=>e.itemId===itemId);
 async function click(){if(!user){router.push('/account?next='+encodeURIComponent(path));return;}setBusy(true);setError('');try{await setSaved(itemId,!saved);}catch(e){setError(e instanceof Error?e.message:'Could not save item.');}finally{setBusy(false);}}
 return <div className="save-control"><button className="button secondary" type="button" aria-pressed={saved} disabled={busy||loading} onClick={()=>void click()}><Heart size={15} fill={saved?'currentColor':'none'}/>{busy?'Saving…':saved?'Saved':'Save item'}</button>{error&&<p className="alert" role="alert">{error}</p>}</div>;
}
