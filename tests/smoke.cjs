'use strict';
const assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
(async()=>{
 const base=process.argv[2]||'http://127.0.0.1:8000/';const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',(...args)=>errors.push(args.join(' ')));
 const dom=await JSDOM.fromURL(base,{resources:'usable',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.fetch=(url,opts)=>fetch(new URL(url,base),opts);}});
 const w=dom.window,d=w.document;
 await new Promise((resolve,reject)=>{let tries=0;const t=setInterval(()=>{if(w.__dashboardReady){clearInterval(t);resolve();}else if(++tries>400){clearInterval(t);reject(Error('Dashboard did not finish loading: '+errors.join('; ')));}},50);});
 const NC=d.querySelectorAll('.tile:not(.stock-tile)').length;assert.ok(NC>=16);assert.equal(d.querySelectorAll('#coin-picker option').length,NC+1);
 assert.equal(d.querySelectorAll('#compare-table thead th').length,8);assert.equal(d.querySelectorAll('#compare-table tbody tr').length,d.querySelectorAll('.tile:not(.stock-tile)').length);
 for(const group of ['Usage','Supply','Liquidity','Sentiment','Structural','Price context']){d.querySelector('[data-group="'+group+'"]').click();assert.equal(d.querySelectorAll('#compare-table thead th').length,8);assert.equal(d.querySelectorAll('#compare-table tbody tr').length,d.querySelectorAll('.tile:not(.stock-tile)').length);}
 for(const coin of ['HBAR','XRP','XLM','QNT','ICP','DOT','BNKR','TAO','ONDO','ALGO','SUI','RENDER','AXL','NEAR','SOL','FLR']){d.getElementById('coin-picker').value=coin;d.getElementById('coin-picker').dispatchEvent(new w.Event('change'));assert.match(d.getElementById('coin-title').textContent,new RegExp(coin));assert.ok([...d.querySelectorAll('#news-content details')].every(x=>x.textContent.includes(coin)));}
 d.getElementById('coin-picker').value='All';d.getElementById('coin-picker').dispatchEvent(new w.Event('change'));
 assert.ok(d.querySelectorAll('.alert-card').length>=3);
 const stage=d.getElementById('carousel-stage');assert.ok(stage);const n=d.querySelectorAll('.car-dot').length;assert.ok(n>=1&&n<=6);assert.ok(d.querySelectorAll('.peek').length<=2);
 const count=()=>d.getElementById('car-count').textContent;assert.match(count(),new RegExp('^1 of '+n));
 if(n>3){d.getElementById('car-next').click();d.getElementById('car-next').click();d.getElementById('car-next').click();assert.match(count(),/^4 of .*Showing 3 more/);}
 for(let k=0;k<n*2;k++){d.getElementById('carousel-stage').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));}
 d.querySelector('[data-scope="market"]').click();assert.ok([...d.querySelectorAll('#alert-cards .alert-card')].every(x=>x.textContent.includes('Market-wide')));d.querySelector('[data-scope="all"]').click();
 assert.ok(d.getElementById('all-alerts'));assert.ok(d.querySelectorAll('.calendar-grid').length>=2);
 d.querySelector('[data-group="Price context"]').click();assert.match(d.getElementById('compare-note').textContent,/Not financial advice/);
 d.querySelector('[data-coin="SUI"]').click();assert.equal(d.getElementById('coin-picker').value,'SUI');assert.match(d.getElementById('coin-title').textContent,/SUI/);assert.match(d.getElementById('coin-content').textContent,/Research summary · news sentiment/);
 assert.ok([...d.querySelectorAll('#news-content details')].every(x=>x.textContent.includes('SUI')));
 d.getElementById('news-tag').value='Yikes';d.getElementById('news-tag').dispatchEvent(new w.Event('change',{bubbles:true}));assert.ok(d.getElementById('news-tag').isConnected);
 d.getElementById('coin-picker').value='QNT';d.getElementById('coin-picker').dispatchEvent(new w.Event('change'));assert.match(d.getElementById('coin-content').textContent,/Unknown/);assert.equal(d.querySelector('#coin-content .chart'),null);
 d.getElementById('coin-picker').value='All';d.getElementById('coin-picker').dispatchEvent(new w.Event('change'));
 d.querySelector('[data-favorite="HBAR"]').click();d.getElementById('favorites-only').checked=true;d.getElementById('favorites-only').dispatchEvent(new w.Event('change'));assert.equal(d.querySelectorAll('.tile:not(.stock-tile)').length,1);
 d.getElementById('favorites-only').checked=false;d.getElementById('favorites-only').dispatchEvent(new w.Event('change'));
 d.getElementById('peer-filter').value='Payments';d.getElementById('peer-filter').dispatchEvent(new w.Event('change'));assert.equal(d.querySelectorAll('#compare-table tbody tr').length,5);
 d.getElementById('sort').value='price30';d.getElementById('sort').dispatchEvent(new w.Event('change'));
 assert.match(d.getElementById('research-content').textContent,/Overall news sentiment/);assert.equal(d.querySelectorAll('#compare-table .sentiment').length,5);assert.ok(d.querySelectorAll('.news-summary').length>0);
 assert.deepEqual(errors,[]);assert.equal(d.getElementById('error').hidden,true);
 console.log('PASS: DOM runtime, all 16 selections, all six eight-column groups, calendars, SUI research, QNT missing history, label filter recovery, local favorites, peers/sort; zero captured console/runtime errors.');dom.window.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
/* Overlay smoke: open via tile, ranges, benchmarks, Esc, hash. */
(async()=>{
 const base=process.argv[2]||'http://127.0.0.1:8000/';const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',(...a)=>errors.push(a.join(' ')));
 const dom=await JSDOM.fromURL(base+'#coin=XRP',{resources:'usable',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.fetch=(u,o)=>fetch(new URL(u,base),o);}});
 const w=dom.window,d=w.document;const until=async(f,m)=>{for(let i=0;i<120;i++){if(f())return;await new Promise(r=>setTimeout(r,50));}throw Error('timeout: '+m+' '+errors.join(';'));};
 await until(()=>w.__dashboardReady,'ready');await until(()=>d.getElementById('coin-overlay')&&!d.getElementById('coin-overlay').hidden&&d.querySelector('#co-chart svg'),'hash open');
 assert.match(d.getElementById('co-title').textContent,/XRP/);
 d.getElementById('co-close').click();assert.equal(d.getElementById('coin-overlay').hidden,true);assert.equal(w.location.hash,'');
 d.querySelector('.tile-main[data-coin="SOL"]').click();await until(()=>w.CoinChart.state()?.sym==='SOL'&&d.querySelector('#co-chart svg path'),'tile open');assert.equal(w.location.hash,'#coin=SOL');
 assert.equal(d.activeElement.id,'co-close');
 for(const r of ['7D','1M','3M','6M','1Y','2Y','3Y','5Y','Max']){d.querySelector(`[data-range="${r}"]`).click();assert.equal(d.querySelector(`[data-range="${r}"]`).getAttribute('aria-pressed'),'true');assert.ok(d.querySelector('#co-chart svg path'));}
 for(const b of ['BTC','ETH','GOLD','TSLA','NVDA','GOOGL']){d.querySelector(`[data-bench="${b}"]`).click();}
 assert.match(d.getElementById('co-chart-title').textContent,/rebased/);assert.equal(d.querySelectorAll('#co-chart svg path').length,7);assert.equal(d.querySelectorAll('#co-legend .lg').length,7);
 d.querySelector('[data-bench="TSLA"]').click();assert.equal(d.querySelectorAll('#co-chart svg path').length,6);
 d.querySelector('[data-ratio="GOLD"]').click();assert.ok(d.querySelector('#co-ratio-chart svg path'));assert.equal(d.querySelectorAll('#co-perf tbody tr').length,9);
 assert.match(d.getElementById('co-side').textContent,/Risk flags/);assert.match(d.getElementById('coin-overlay').textContent,/Not financial advice/);
 /* short history: ONDO launched 2024 -> 3Y/5Y disabled, dashes in table */
 w.CoinChart.open('ONDO');await until(()=>w.CoinChart.state()?.sym==='ONDO'&&!w.CoinChart.state().loading,'ondo');
 assert.equal(d.querySelector('[data-range="5Y"]').disabled,true);assert.equal(d.querySelector('[data-range="3Y"]').disabled,true);assert.equal(d.querySelector('[data-range="1Y"]').disabled,false);assert.match(d.querySelector('[data-range="Max"]').textContent,/since Jan 2024/);
 assert.match([...d.querySelectorAll('#co-perf tbody tr')][7].textContent,/—/);d.querySelector('[data-range="Max"]').click();d.querySelector('[data-bench="BTC"]').click();assert.ok(d.querySelector('#co-chart svg path'));
 d.getElementById('coin-overlay').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(d.getElementById('coin-overlay').hidden,true);
 d.querySelector('#compare-table [data-coin]').click();await until(()=>!d.getElementById('coin-overlay').hidden,'table open');
 assert.deepEqual(errors,[]);console.log('PASS overlay: hash open, tile/table open, close+Esc, 9 ranges incl 2Y/3Y/5Y, ONDO short-history disabling + dashes, 6 benchmarks, ratio, perf table, side panel; zero console errors.');w.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
/* Wide compare chart smoke: sparkline click, metrics, ranges, legend toggles, Esc. */
(async()=>{
 const base=process.argv[2]||'http://127.0.0.1:8000/';const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',(...a)=>errors.push(a.join(' ')));
 const dom=await JSDOM.fromURL(base,{resources:'usable',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.fetch=(url,opts)=>fetch(new URL(url,base),opts);}});
 const w=dom.window,d=w.document;const wait=(f,ms=6000)=>new Promise((res,rej)=>{const t0=Date.now();const t=setInterval(()=>{let v;try{v=f();}catch{}if(v){clearInterval(t);res(v);}else if(Date.now()-t0>ms){clearInterval(t);rej(Error('timeout: '+f+' '+errors.join('; ')));}},40);});
 await wait(()=>w.__dashboardReady&&d.getElementById('cmp-open'));
 const spark=await wait(()=>d.querySelector('#compare-table svg.wide-open'));assert.equal(spark.getAttribute('role'),'button');
 spark.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 const o=await wait(()=>{const x=d.getElementById('cmp-overlay');return x&&!x.hidden&&d.querySelector('#cmp-chart svg path')&&x;});
 assert.equal(d.getElementById('coin-overlay')?.hidden??true,true,'coin overlay must not open from a sparkline');
 assert.ok(d.querySelectorAll('#cmp-legend .cmp-lg').length===d.querySelectorAll('.tile:not(.stock-tile)').length);
 const enabled=()=>[...d.querySelectorAll('#cmp-ranges [data-range]')].filter(b=>!b.disabled).map(b=>b.dataset.range);
 assert.ok(!enabled().includes('1Y'),'usage metrics only ~30 days');
 d.querySelector('[data-metric="price"]').click();await wait(()=>enabled().includes('5Y'));
 for(const k of ['7D','1M','3M','6M','1Y','2Y','3Y','5Y','Max']){d.querySelector(`[data-range="${k}"]`).click();assert.equal(d.querySelector(`[data-range="${k}"]`).getAttribute('aria-pressed'),'true');assert.ok(d.querySelectorAll('#cmp-chart svg path').length>=10);}
 d.querySelector('[data-mode="abs"]').click();assert.match(d.getElementById('cmp-chart-title').textContent,/log scale/);
 const before=d.querySelectorAll('#cmp-chart svg path').length;d.querySelector('#cmp-legend [data-toggle="XRP"]').click();assert.equal(d.querySelectorAll('#cmp-chart svg path').length,before-1);
 o.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(o.hidden,true);
 d.getElementById('peer-filter').value='Payments';d.getElementById('peer-filter').dispatchEvent(new w.Event('change'));d.getElementById('cmp-open').click();await wait(()=>!o.hidden&&d.querySelectorAll('#cmp-legend .cmp-lg').length===5);
 assert.deepEqual(errors,[]);console.log('PASS: wide compare chart opens from sparklines and button, metrics, all ranges, log scale, legend toggles, peer filter respected, Esc closes; zero errors.');dom.window.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
(async()=>{
 const assert=require('node:assert/strict');const {JSDOM,VirtualConsole}=require('jsdom');
 const base=process.argv[2]||'http://127.0.0.1:8000/';const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const fake=[{id:'ripple',current_price:1.23,market_cap:7e10,total_volume:2e9,circulating_supply:5.7e10,ath_change_percentage:-60,price_change_percentage_30d_in_currency:4,last_updated:new Date().toISOString()}];
 const dom=await JSDOM.fromURL(base,{resources:'usable',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.fetch=(url,opts)=>String(url).includes('coingecko')?Promise.resolve(new Response(JSON.stringify(fake),{status:200})):fetch(new URL(url,base),opts);}});
 const w=dom.window,d=w.document;
 await new Promise((res,rej)=>{let n=0;const t=setInterval(()=>{if(w.__dashboardReady){clearInterval(t);res();}else if(++n>400){clearInterval(t);rej(Error('not ready '+errors.join(';')));}},50);});
 assert.ok(d.querySelectorAll('.utility-group').length>=4);const NT=d.querySelectorAll('.tile:not(.stock-tile)').length;
 d.querySelector('[data-selgroup="Payments"]').click();
 const pay=d.querySelectorAll('#compare-table tbody tr').length;assert.ok(pay>=3&&pay<NT,'payments rows '+pay);assert.ok(d.getElementById('group-clear'));
 d.querySelector('.tile [data-multi="SOL"]').click();assert.equal(d.querySelectorAll('#compare-table tbody tr').length,pay+1);
 d.getElementById('group-clear').click();assert.equal(d.querySelectorAll('#compare-table tbody tr').length,NT);
 assert.equal(d.querySelectorAll('.stocks-group .stock-tile').length,7,'7 stock tiles');
 for(let i=0;i<60&&!d.querySelector('.stock-tile .tile-trend');i++)await new Promise(r=>setTimeout(r,100));assert.ok(d.querySelector('.stock-tile .tile-trend'),'stock price context rendered');
 d.querySelector('[data-selgroup="Stocks"]').click();const sn=[...d.querySelectorAll('#news-content .news-story, #news-content details')];assert.ok(sn.length>=5,'stock news '+sn.length);
 assert.ok(d.getElementById('group-bar').textContent.includes('7 picks'));d.getElementById('group-clear').click();
 d.querySelector('[data-stockchart="NVDA"]').click();for(let i=0;i<60&&d.getElementById('coin-overlay')?.hidden!==false;i++)await new Promise(r=>setTimeout(r,100));
 assert.equal(d.getElementById('coin-overlay').hidden,false);assert.match(d.getElementById('co-title').textContent,/NVIDIA|Nvidia/i);assert.match(d.getElementById('co-side').textContent,/N\/A/);
 d.getElementById('co-close').click();
 d.getElementById('refresh-live').click();for(let i=0;i<40&&!/Updated|failed/.test(d.getElementById('refresh-status').textContent);i++)await new Promise(r=>setTimeout(r,100));
 assert.match(d.getElementById('refresh-status').textContent,/Updated 1 coins/);assert.ok(d.querySelector('.badge.live'));
 assert.deepEqual(errors,[]);w.close();console.log('PASS: utility groups, select group + individual coin filters table, clear, stocks group (7 tiles, price context, select-all filters news, NVDA full-screen chart with N/A crypto metrics), live refresh button updates prices; zero errors.');
})().catch(e=>{console.error(e);process.exitCode=1;});
