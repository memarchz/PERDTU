'use client';
import {createContext,useContext,useEffect,useRef,useState,useCallback} from 'react';
import {useAuth} from './auth-provider';
import {createSavedStore} from '../lib/saved.mjs';
import type {SavedEntry} from '../lib/types';
type SavedContext={entries:SavedEntry[];loading:boolean;error:string;refresh:()=>Promise<void>;setSaved:(id:string,saved:boolean)=>Promise<void>};
const Context=createContext<SavedContext|null>(null);
export function SavedItemsProvider({children}:{children:React.ReactNode}){
 const {user,request}=useAuth(),store=useRef(createSavedStore()),[,render]=useState(0),[loading,setLoading]=useState(false),[error,setError]=useState('');
 // Clear synchronously on a new request capability, including same-user reauthentication.
 store.current.session(request);const capability=useRef(request);capability.current=request;
 const refresh=useCallback(async()=>{if(!user)return;const current=request;setLoading(true);setError('');try{await store.current.load(()=>request<SavedEntry[]>('/saved-items'));if(capability.current===current)render(n=>n+1);}catch(e){if(capability.current===current)setError(e instanceof Error?e.message:'Could not load saved items.');}finally{if(capability.current===current)setLoading(false);}},[user?.id,request]);
 useEffect(()=>{setError('');setLoading(false);void refresh();},[refresh]);
 async function setSaved(id:string,saved:boolean){const current=request;await store.current.set(id,saved,()=>request<SavedEntry|undefined>('/saved-items/'+id,{method:saved?'PUT':'DELETE'}));if(capability.current===current)render(n=>n+1);}
 return <Context.Provider value={{entries:user?store.current.entries():[],loading:!!user&&loading,error:user?error:'',refresh,setSaved}}>{children}</Context.Provider>;
}
export function useSaved(){const value=useContext(Context);if(!value)throw Error('Saved provider required');return value;}
