export type MatchItem = {id:string;ownerId:string;title:string;description:string;category:string};
export type Edge={from:string;to:string;itemId:string;score:number};
import {embeddingText,hasIntent} from './exchange-intent';
import {vectorKey} from './embedding-service';
export type ExchangeItem=MatchItem&{status?:string;exchangeWanted?:string|null;exchangeCategory?:string|null;exchangeOpenToAlternatives?:boolean};
export type Policy={strong:number;alternative:number;version:string};
export type Fit={score:number;semanticScore:number;kind:'strong'|'alternative'|'ineligible';reason:string};
export type Evaluation={edges:Edge[];score:number;kind:'strong'|'alternative';viewerFit:number;fits:{receiverItemId:string;offerItemId:string;fit:Fit}[]};
export function scoreDirection(offer:ExchangeItem,receiverGives:ExchangeItem,vectors:Map<string,number[]>,policy:Policy,prepared?:Map<string,number[]>):Fit{
 const no=(reason:string):Fit=>({score:0,semanticScore:0,kind:'ineligible',reason});
 if(!hasIntent(receiverGives)||offer.ownerId===receiverGives.ownerId)return no('Exchange preferences are missing.');
 if(/\b(not|only|exactly|except|without)\b|ไม่|เท่านั้น|ยกเว้น/i.test(receiverGives.exchangeWanted||''))return no('Strict or excluded terms need clarification before automated matching.');
 const category=!!receiverGives.exchangeCategory&&receiverGives.exchangeCategory===offer.category;
 if(!receiverGives.exchangeWanted)return category?{score:1,semanticScore:1,kind:'strong',reason:'Matches the requested category; no specific item was requested.'}:no('Outside requested category.');
 const offered=prepared?prepared.get('offer:'+offer.id):vectors.get(vectorKey({role:'offer',text:embeddingText(offer,'offer')})),wanted=prepared?prepared.get('wanted:'+receiverGives.id):vectors.get(vectorKey({role:'wanted',text:embeddingText(receiverGives,'wanted')}));
 if(!offered||!wanted||offered.length!==wanted.length)return no('Semantic analysis is incomplete.');
 const semanticScore=Math.max(0,Math.min(1,offered.reduce((sum,v,i)=>sum+v*wanted[i],0))),score=Math.min(1,semanticScore+(category?0.05:0));
 const kind=semanticScore>=policy.strong?'strong':semanticScore>=policy.alternative&&receiverGives.exchangeOpenToAlternatives?'alternative':'ineligible';
 return {score,semanticScore,kind,reason:kind==='strong'?'Semantically matches the stated exchange preference.':kind==='alternative'?'A weaker semantic fit; this listing accepts similar alternatives.':'Does not sufficiently match the stated exchange preference.'};
}
export function evaluateCycle(items:ExchangeItem[],edges:{from:string;to:string;itemId:string}[],viewerId:string,vectors:Map<string,number[]>,policy:Policy,fitCache?:Map<string,Fit>,prepared?:Map<string,number[]>):Evaluation|null{
 if(edges.length<2||edges.length>4||new Set(edges.map(e=>e.from)).size!==edges.length||new Set(edges.map(e=>e.itemId)).size!==edges.length||!edges.some(e=>e.from===viewerId))return null;
 const chosen=edges.map(e=>items.find(i=>i.id===e.itemId));if(chosen.some((item,i)=>!item||item.ownerId!==edges[i].from||(item.status&&item.status!=='AVAILABLE')||!hasIntent(item)))return null;
 if(edges.some(e=>edges.filter(x=>x.to===e.to).length!==1||!edges.some(x=>x.from===e.to)))return null;
 let current=edges[0].from;const seen=new Set();for(let n=0;n<edges.length;n++){if(seen.has(current))return null;seen.add(current);current=edges.find(e=>e.from===current)!.to;}if(current!==edges[0].from)return null;
 const fits=edges.map((e,i)=>{const receiver=chosen[edges.findIndex(x=>x.from===e.to)]!;return {receiverItemId:receiver.id,offerItemId:e.itemId,fit:fitCache?.get(chosen[i]!.id+'>'+receiver.id)||scoreDirection(chosen[i]!,receiver,vectors,policy,prepared)};});
 if(fits.some(f=>f.fit.kind==='ineligible'))return null;
 if(edges.length===2){const partnerIncoming=fits.find(f=>chosen.find(i=>i!.id===f.receiverItemId)!.ownerId!==viewerId)!;if(partnerIncoming.fit.kind!=='strong')return null;}
 const own=chosen.find(i=>i!.ownerId===viewerId)!,viewerFit=fits.find(f=>f.receiverItemId===own.id)!.fit.score;
 return {edges:edges.map(e=>({...e,score:fits.find(f=>f.offerItemId===e.itemId)!.fit.score})),score:Math.min(...fits.map(f=>f.fit.score)),kind:fits.some(f=>f.fit.kind==='alternative')?'alternative':'strong',viewerFit,fits};
}
export function findItemCycles(items:ExchangeItem[],anchorItemId:string,options:{mode:'direct'|'circles';includeAlternatives:boolean;limit:number;targetItemId?:string},vectors:Map<string,number[]>,policy:Policy):Evaluation[]{
 const anchor=items.find(i=>i.id===anchorItemId);if(!anchor||!hasIntent(anchor))return [];
 const candidates=items.filter(i=>hasIntent(i)&&(!i.status||i.status==='AVAILABLE')),results:Evaluation[]=[],seen=new Set<string>();let budget=20000,checks=20000;const fitCache=new Map<string,Fit>(),prepared=new Map<string,number[]>();for(const item of candidates)for(const role of ['offer','wanted'] as const){const v=vectors.get(vectorKey({role,text:embeddingText(item,role)}));if(v)prepared.set(role+':'+item.id,v);}
 const fitFor=(a:ExchangeItem,b:ExchangeItem)=>{const key=a.id+'>'+b.id;let fit=fitCache.get(key);if(!fit){fit=scoreDirection(a,b,vectors,policy,prepared);fitCache.set(key,fit);}return fit;};
 function visit(path:ExchangeItem[]){if(--budget<0)return;
  if(path.length>=2){const edges=path.map((item,i)=>({from:item.ownerId,to:path[(i+1)%path.length].ownerId,itemId:item.id})),evaluation=evaluateCycle(path,edges,anchor!.ownerId,vectors,policy,fitCache,prepared);if(evaluation&&(!options.targetItemId||path.some(i=>i.id===options.targetItemId))&&(options.includeAlternatives||evaluation.kind==='strong')){const key=edges.map(e=>`${e.from}>${e.to}:${e.itemId}`).sort().join('|');if(!seen.has(key)){seen.add(key);results.push(evaluation);}}}
  if(path.length>=(options.mode==='direct'?2:4))return;
  for(const next of candidates){if(budget<0||--checks<0)break;if(path.some(i=>i.ownerId===next.ownerId))continue;const fit=fitFor(path[path.length-1],next);if(fit.kind==='ineligible'||(!options.includeAlternatives&&fit.kind==='alternative'))continue;visit([...path,next]);}
 }
 visit([anchor]);return results.sort((a,b)=>(a.kind==='strong'?0:1)-(b.kind==='strong'?0:1)||b.viewerFit-a.viewerFit||b.score-a.score||a.edges.length-b.edges.length||a.edges.map(e=>e.itemId).join().localeCompare(b.edges.map(e=>e.itemId).join())).slice(0,options.limit);
}
