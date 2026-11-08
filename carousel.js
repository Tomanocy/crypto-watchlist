/* Pure alert-carousel logic shared by the browser and node tests. No DOM access. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AlertCarousel=api;})(typeof self!=='undefined'?self:this,function(){
 'use strict';
 const RANK={High:0,Medium:1,Info:2};const STACK_CAP=3;const BATCH=3;const MAX=6;
 function order(alerts){return [...(alerts||[])].sort((a,b)=>((RANK[a.severity]??3)-(RANK[b.severity]??3))||((Date.parse(b.time)||0)-(Date.parse(a.time)||0)));}
 function wrap(i,n){return n?((i%n)+n)%n:0;}
 function stack(list,index,cap=STACK_CAP){const n=list.length;const depth=Math.min(Math.max(0,cap),Math.max(0,n-1));const out=[];for(let k=1;k<=depth;k++)out.push(list[wrap(index+k,n)]);return out;}
 function carouselList(alerts){return order(alerts).slice(0,MAX);}
 function batchOf(i){return Math.floor(i/BATCH);}
 function batchStack(list,i){const end=Math.min(list.length,(batchOf(i)+1)*BATCH);return list.slice(i+1,end).slice(0,STACK_CAP);}
 function step(i,d,n){const next=wrap(i+d,n);return {index:next,loadedMore:d>0&&next%BATCH===0&&next!==0};}
 function filterScope(alerts,scope){return scope==='all'?alerts:alerts.filter(a=>(a.scope||'watchlist')===scope);}
 return {RANK,STACK_CAP,BATCH,MAX,carouselList,batchOf,batchStack,step,order,wrap,stack,filterScope};
});
