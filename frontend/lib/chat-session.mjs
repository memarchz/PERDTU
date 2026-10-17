export function createChatSession({request,tradeId,onChange,schedule=setTimeout,cancel=clearTimeout,makeId=()=>crypto.randomUUID()}) {
  let state={messages:[],opened:false,canSend:false,loading:true,sending:false,error:'',sendError:'',hasOlder:false};
  let active=false,epoch=0,timer=null,busy=null,newest=null,oldest=null,loaded=false,retry=null;
  const controllers=new Set();
  const publish=patch=>{state={...state,...patch};onChange({...state,messages:[...state.messages]});};
  const current=v=>active&&epoch===v;
  const merge=messages=>{
    const map=new Map(state.messages.map(m=>[m.id,m]));for(const m of messages)map.set(m.id,m);
    return [...map.values()].sort((a,b)=>a.createdAt<b.createdAt?-1:a.createdAt>b.createdAt?1:a.id<b.id?-1:a.id>b.id?1:0);
  };
  const clearTimer=()=>{if(timer!==null){cancel(timer);timer=null;}};
  const queue=()=>{clearTimer();if(active)timer=schedule(()=>{timer=null;void refresh();},3000);};
  async function get(path,options,v){const controller=new AbortController();controllers.add(controller);try {const result=await request(path,{...options,signal:controller.signal});return current(v)?result:null;}finally{controllers.delete(controller);}}
  const endpoint=`/trades/${encodeURIComponent(tradeId)}/messages`;
  function refresh(){
    if(!active)return Promise.resolve();if(busy)return busy;
    const v=epoch;clearTimer();
    const operation=(async()=>{
      try {
        let again=false,rounds=0;
        do {
          const initial=!loaded;
          const result=await get(endpoint+(loaded&&newest?'?after='+encodeURIComponent(newest):''),{},v);if(!result)return;
          if(initial){oldest=result.olderCursor;publish({hasOlder:result.hasMore});}
          // If an initially locked room opens later, its first page is a latest page too.
          if(!newest&&result.olderCursor){oldest=result.olderCursor;publish({hasOlder:result.hasMore});}
          const wasAfter=!!(loaded&&newest);
          loaded=true;if(result.nextCursor)newest=result.nextCursor;
          publish({messages:merge(result.messages),opened:result.opened,canSend:result.canSend,loading:false,error:''});
          again=wasAfter&&result.hasMore;rounds++;
        } while(again&&current(v)&&rounds<10);
      } catch(error){if(current(v))publish({loading:false,error:error instanceof Error?error.message:'Could not load messages.'});}
    })();
    busy=operation;
    void operation.finally(()=>{if(current(v)){busy=null;queue();}});
    return operation;
  }
  async function loadOlder(){
    if(!active||busy||!state.hasOlder||!oldest)return;
    const v=epoch;clearTimer();
    const operation=(async()=>{try {
      const result=await get(endpoint+'?before='+encodeURIComponent(oldest),{},v);if(!result)return;
      oldest=result.olderCursor;publish({messages:merge(result.messages),hasOlder:result.hasMore,opened:result.opened,canSend:result.canSend,error:''});
    }catch(error){if(current(v))publish({error:error instanceof Error?error.message:'Could not load earlier messages.'});}})();
    busy=operation;await operation;if(current(v)){busy=null;queue();}
  }
  async function send(body){
    const text=body.trim();if(!active||state.sending||!state.canSend||!text||text.length>2000)return false;
    const v=epoch;
    if(!retry||retry.body!==text)retry={body:text,clientMessageId:makeId()};
    publish({sending:true,sendError:''});
    try {
      const result=await get(endpoint,{method:'POST',body:retry},v);if(!result)return false;
      retry=null;publish({messages:merge([result.message]),sending:false,sendError:''});return true;
    }catch(error){if(current(v)){publish({sending:false,sendError:error instanceof Error?error.message:'Could not send your message.'});void refresh();}return false;}
  }
  return {
    start(){if(active)return;active=true;epoch++;publish({sending:false});void refresh();},
    stop(){active=false;epoch++;clearTimer();for(const c of controllers)c.abort();controllers.clear();busy=null;},
    refresh,loadOlder,send,
  };
}
