import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

function harness(){
 const states=[],refs=[],effects=[];let si=0,ri=0,mounted=false,layout=[],tree,subscriber,resolveOlder;
 const request=()=>{};let messageCount=1;
 const message=id=>({id,sender:{id:'u',displayName:'Member'},body:id,createdAt:'2026-10-18T00:00:00Z'});
 let chatState={messages:[message('m')],opened:true,canSend:true,loading:false,sending:false,error:'',sendError:'',hasOlder:true};
 const publish=patch=>{chatState={...chatState,...patch};subscriber(chatState);};
 const session={start:()=>publish({}),stop(){},refresh:async()=>{},send:async()=>false,loadOlder:()=>new Promise(resolve=>{resolveOlder=()=>{messageCount++;publish({messages:[message('older'),...chatState.messages]});resolve();};})};
 const hooks={useState(value){const i=si++;if(!(i in states))states[i]=value;return [states[i],next=>{states[i]=typeof next==='function'?next(states[i]):next;}];},useRef(value){const i=ri++;return refs[i]??=( {current:value});},useEffect(fn){if(!mounted)effects.push(fn);},useLayoutEffect(fn){layout.push(fn);}};
 const viewport={scrollHeight:1000,scrollTop:0,clientHeight:420,getBoundingClientRect:()=>({top:0}),querySelectorAll:()=>[],querySelector:()=>null};
 const module={exports:{}};
 const jsx=(type,props)=>({type,...props});
 runInNewContext(ts.transpileModule(readFileSync(new URL('../components/trade-chat.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module,exports:module.exports,document:{hidden:false,addEventListener(){},removeEventListener(){}},Date,Error,require:name=>name==='react'?hooks:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:name==='lucide-react'?{}:name.includes('auth-provider')?{useAuth:()=>({request,user:{id:'u'}})}:name.includes('chat-session')?{createChatSession:options=>{subscriber=options.onChange;return session;}}:{}});
 function find(predicate,node=tree){if(!node)return null;if(Array.isArray(node)){for(const child of node){const found=find(predicate,child);if(found)return found;}}else if(typeof node==='object'){if(predicate(node))return node;return node.children===undefined?null:find(predicate,node.children);}return null;}
 function render(){si=0;ri=0;layout=[];const wrapper=module.exports.TradeChat({tradeId:'trade'});tree=wrapper.type(wrapper);const region=find(n=>n['aria-label']==='Messages');if(region)region.ref.current=viewport;for(const fn of layout)fn();if(!mounted){mounted=true;effects.forEach(fn=>fn());}return tree;}
 render();render();
 return {render,find,viewport,publish,session,resolveOlder:()=>resolveOlder(),get messageCount(){return messageCount;}};
}
test('older history retains the reader position through React batched updates',async()=>{
 const h=harness();h.viewport.scrollTop=150;h.find(n=>n['aria-label']==='Messages').onScroll();
 const pending=h.find(n=>n.children==='Load earlier messages').onClick();
 h.resolveOlder();await pending;await new Promise(r=>setImmediate(r));
 h.viewport.scrollHeight=1800;h.render();assert.equal(h.viewport.scrollTop,950);
});
test('a status update while older history is pending must not consume the anchor',async()=>{
 const h=harness();h.viewport.scrollTop=150;h.find(n=>n['aria-label']==='Messages').onScroll();
 h.find(n=>n.children==='Load earlier messages').onClick();
 h.publish({messages:[]});h.render(); // An unrelated publish before pagination settles.
 h.resolveOlder();await new Promise(r=>setImmediate(r));h.viewport.scrollHeight=1800;h.render();assert.equal(h.viewport.scrollTop,950);
});
test('polling preserves the typed draft and failed sending keeps it for retry',async()=>{
 const h=harness();h.find(n=>n.type==='textarea').onChange({target:{value:'Meet at the library'}});h.render();
 h.publish({messages:[]});h.render();assert.equal(h.find(n=>n.type==='textarea').value,'Meet at the library');
 await h.find(n=>n.type==='form').onSubmit({preventDefault(){}});h.render();assert.equal(h.find(n=>n.type==='textarea').value,'Meet at the library');
 h.session.send=async()=>true;await h.find(n=>n.type==='form').onSubmit({preventDefault(){}});h.render();assert.equal(h.find(n=>n.type==='textarea').value,'');
});
test('a message appended during history loading does not shift the visible anchor',async()=>{
 const h=harness();let anchorTop=500;
 const anchor={dataset:{chatMessage:'m'},getBoundingClientRect:()=>({top:anchorTop-h.viewport.scrollTop,bottom:anchorTop+50-h.viewport.scrollTop})};
 h.viewport.querySelectorAll=()=>[anchor];h.viewport.querySelector=()=>anchor;
 h.viewport.scrollTop=150;h.find(n=>n['aria-label']==='Messages').onScroll();
 h.find(n=>n.children==='Load earlier messages').onClick();
 h.publish({messages:[]});h.viewport.scrollHeight=1200;h.render();assert.equal(h.viewport.scrollTop,150);
 h.resolveOlder();await new Promise(r=>setImmediate(r));anchorTop=1300;h.viewport.scrollHeight=2000;h.render();assert.equal(h.viewport.scrollTop,950);
});
