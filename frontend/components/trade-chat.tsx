'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {LockKeyhole,MessageCircle,Send} from 'lucide-react';
import {useAuth} from './auth-provider';
import {createChatSession,type ChatSession,type ChatState} from '../lib/chat-session.mjs';

const initial:ChatState={messages:[],opened:false,canSend:false,loading:true,sending:false,error:'',sendError:'',hasOlder:false};
export function TradeChat({tradeId}:{tradeId:string}) {
  const {request,user}=useAuth();
  // A new account/trade gets a fresh composer and cannot display the previous history.
  return <Conversation key={`${tradeId}:${user?.id}`} tradeId={tradeId} request={request} userId={user?.id??''}/>;
}
function Conversation({tradeId,request,userId}:{tradeId:string;request:ReturnType<typeof useAuth>['request'];userId:string}) {
  const [state,setState]=useState(initial),[draft,setDraft]=useState(''),[olderBusy,setOlderBusy]=useState(false);
  const session=useRef<ChatSession|null>(null),viewport=useRef<HTMLDivElement>(null),nearBottom=useRef(true),forceBottom=useRef(false);
  const prepend=useRef<{height:number;top:number}|null>(null),alive=useRef(false),generation=useRef(0);
  useEffect(()=>{
    const version=++generation.current;alive.current=true;setState(initial);setDraft('');setOlderBusy(false);nearBottom.current=true;
    const chat=createChatSession({tradeId,request,onChange:next=>{if(generation.current===version&&alive.current)setState(next);}});session.current=chat;
    const visibility=()=>{if(document.hidden)chat.stop();else chat.start();};visibility();document.addEventListener('visibilitychange',visibility);
    return ()=>{alive.current=false;generation.current++;chat.stop();session.current=null;document.removeEventListener('visibilitychange',visibility);};
  },[tradeId,request]);
  useLayoutEffect(()=>{
    const element=viewport.current;if(!element)return;
    if(prepend.current){element.scrollTop=prepend.current.top+element.scrollHeight-prepend.current.height;prepend.current=null;}
    else if(nearBottom.current||forceBottom.current){element.scrollTop=element.scrollHeight;forceBottom.current=false;}
  },[state.messages]);
  async function older(){if(!session.current||olderBusy)return;const el=viewport.current;const version=generation.current;if(el)prepend.current={height:el.scrollHeight,top:el.scrollTop};setOlderBusy(true);await session.current.loadOlder();if(alive.current&&generation.current===version){prepend.current=null;setOlderBusy(false);}}
  async function submit(event:React.FormEvent){event.preventDefault();const chat=session.current;if(!chat)return;const version=generation.current;const text=draft;forceBottom.current=true;const sent=await chat.send(text);if(alive.current&&generation.current===version){if(sent)setDraft(current=>current===text?'':current);else forceBottom.current=false;}}
  return <section className="panel trade-chat" aria-label="Exchange group chat"><div className="list-heading"><h2><MessageCircle size={20}/> Exchange chat</h2><span className="chat-access">Participants only</span></div>
    {state.loading?<p role="status" className="muted">Loading your conversation…</p>:!state.opened&&!state.error?<p className="chat-locked"><LockKeyhole size={18}/> Chat opens here once everyone accepts this exchange.</p>:null}
    {state.error&&<p role="alert" className="alert">{state.error} <button className="text-link" type="button" onClick={()=>void session.current?.refresh()}>Try again</button></p>}
    {state.opened&&<>
      {state.hasOlder&&<button type="button" className="button secondary small" disabled={olderBusy} onClick={()=>void older()}>{olderBusy?'Loading…':'Load earlier messages'}</button>}
      <div ref={viewport} className="chat-messages" role="region" aria-label="Messages" tabIndex={0} onScroll={()=>{const el=viewport.current;if(el)nearBottom.current=el.scrollHeight-el.scrollTop-el.clientHeight<70;}}>
        {!state.messages.length&&<p className="chat-empty">Everyone is connected. Say hello and arrange your exchange.</p>}
        {state.messages.map(m=><article key={m.id} className={`chat-message ${m.sender.id===userId?'is-own':''}`}><div className="chat-meta"><strong>{m.sender.displayName}{m.sender.id===userId?' · you':''}</strong><time dateTime={m.createdAt}>{new Date(m.createdAt).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</time></div><p>{m.body}</p></article>)}
      </div>
      <p className="chat-note">{state.canSend?'Messages update automatically about every 3 seconds.':'This conversation is read-only. Your exchange history is saved.'}</p>
      {state.canSend&&<form onSubmit={submit} className="chat-composer"><label htmlFor={`chat-${tradeId}`}>Message your exchange group</label><textarea id={`chat-${tradeId}`} value={draft} onChange={e=>setDraft(e.target.value)} maxLength={2000} rows={3} disabled={state.sending} placeholder="Arrange a place and time to exchange…"/><div className="chat-composer-actions"><small>{draft.length}/2000</small><button className="button" type="submit" disabled={state.sending||!draft.trim()}><Send size={16}/>{state.sending?'Sending…':'Send message'}</button></div></form>}
      {state.sendError&&<p role="alert" className="alert">{state.sendError} Your message is kept above; you can retry.</p>}
      <span className="sr-only" role="status">{state.sending?'Sending message.':`${state.messages.length} messages loaded.`}</span>
    </>}
  </section>;
}
