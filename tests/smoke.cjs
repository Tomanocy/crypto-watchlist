'use strict';
const assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
(async()=>{
 const base=process.argv[2]||'http://127.0.0.1:8000/';const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',(...args)=>errors.push(args.join(' ')));
 const dom=await JSDOM.fromURL(base,{resources:'usable',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.fetch=(url,opts)=>fetch(new URL(url,base),opts);}});
 const w=dom.window,d=w.document;
 await new Promise((resolve,reject)=>{let tries=0;const t=setInterval(()=>{if(w.__dashboardReady){clearInterval(t);resolve();}else if(++tries>100){clearInterval(t);reject(Error('Dashboard did not finish loading: '+errors.join('; ')));}},50);});
 assert.equal(d.querySelectorAll('.tile').length,16);assert.equal(d.querySelectorAll('#coin-picker option').length,17);
 assert.equal(d.querySelectorAll('#compare-table thead th').length,6);assert.equal(d.querySelectorAll('#compare-table tbody tr').length,16);
 for(const group of ['Usage','Supply','Liquidity','Sentiment','Structural','Price context']){d.querySelector('[data-group="'+group+'"]').click();assert.equal(d.querySelectorAll('#compare-table thead th').length,6);assert.equal(d.querySelectorAll('#compare-table tbody tr').length,16);}
 for(const coin of ['HBAR','XRP','XLM','QNT','ICP','DOT','BNKR','TAO','ONDO','ALGO','SUI','RENDER','AXL','NEAR','SOL','FLR']){d.getElementById('coin-picker').value=coin;d.getElementById('coin-picker').dispatchEvent(new w.Event('change'));assert.match(d.getElementById('coin-title').textContent,new RegExp(coin));assert.ok([...d.querySelectorAll('#news-content details')].every(x=>x.textContent.includes(coin)));}
 d.getElementById('coin-picker').value='All';d.getElementById('coin-picker').dispatchEvent(new w.Event('change'));
 assert.ok(d.querySelectorAll('.alert-card').length>=3);assert.ok(d.querySelectorAll('.calendar-grid').length>=2);
 d.querySelector('[data-group="Price context"]').click();assert.match(d.getElementById('compare-note').textContent,/Not financial advice/);
 d.querySelector('[data-coin="SUI"]').click();assert.equal(d.getElementById('coin-picker').value,'SUI');assert.match(d.getElementById('coin-title').textContent,/SUI/);assert.match(d.getElementById('coin-content').textContent,/observed divergence/);
 assert.ok([...d.querySelectorAll('#news-content details')].every(x=>x.textContent.includes('SUI')));
 d.getElementById('news-tag').value='Yikes';d.getElementById('news-tag').dispatchEvent(new w.Event('change',{bubbles:true}));assert.ok(d.getElementById('news-tag').isConnected);
 d.getElementById('coin-picker').value='QNT';d.getElementById('coin-picker').dispatchEvent(new w.Event('change'));assert.match(d.getElementById('coin-content').textContent,/Unknown/);assert.equal(d.querySelector('#coin-content .chart'),null);
 d.getElementById('coin-picker').value='All';d.getElementById('coin-picker').dispatchEvent(new w.Event('change'));
 d.querySelector('[data-favorite="HBAR"]').click();d.getElementById('favorites-only').checked=true;d.getElementById('favorites-only').dispatchEvent(new w.Event('change'));assert.equal(d.querySelectorAll('.tile').length,1);
 d.getElementById('favorites-only').checked=false;d.getElementById('favorites-only').dispatchEvent(new w.Event('change'));
 d.getElementById('peer-filter').value='Payments';d.getElementById('peer-filter').dispatchEvent(new w.Event('change'));assert.equal(d.querySelectorAll('#compare-table tbody tr').length,5);
 d.getElementById('sort').value='price30';d.getElementById('sort').dispatchEvent(new w.Event('change'));
 assert.deepEqual(errors,[]);assert.equal(d.getElementById('error').hidden,true);
 console.log('PASS: DOM runtime, all 16 selections, all six six-column groups, calendars, SUI gap, QNT missing history, label filter recovery, local favorites, peers/sort; zero captured console/runtime errors.');dom.window.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
