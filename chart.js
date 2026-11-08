'use strict';
/* Full-screen coin chart overlay. Plain SVG, no libraries. Neutral price context only:
   no indicators, signals or predictions. Pure helpers are exported for node tests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CoinChart=api;})(typeof self!=='undefined'?self:this,function(){
 const RANGES=[['7D',7],['1M',30],['3M',90],['6M',180],['1Y',365],['Max',Infinity]];
 const BENCH=[['BTC','Bitcoin','#F7931A','8 4'],['ETH','Ethereum','#A5B4FC','2 4'],['GOLD','Gold','#D4A017','10 3 2 3'],['TSLA','Tesla','#F87171','4 3'],['NVDA','Nvidia','#84CC16','1 3'],['GOOGL','Alphabet (Google)','#60A5FA','12 4']];
 const COIN_COLOR='#14B8A6';
 const DAY=86400000;
 const toDay=s=>Date.parse(s+'T00:00:00Z');
 const shift=(s,days)=>new Date(toDay(s)-days*DAY).toISOString().slice(0,10);
 /* Rows are [date, close] sorted ascending. Range start = end - days (inclusive). */
 function sliceRange(rows,days,end){if(!rows||!rows.length)return [];end=end||rows[rows.length-1][0];if(days===Infinity)return rows.filter(r=>r[0]<=end);const start=shift(end,days);return rows.filter(r=>r[0]>=start&&r[0]<=end);}
 function rebase(rows){if(!rows.length||!(rows[0][1]>0))return [];const b=rows[0][1];return rows.map(([d,v])=>[d,v==null?null:(v/b-1)*100]);}
 /* As-of join: for each target date take the latest benchmark close on/before it (never after). */
 function align(dates,rows){const out=[];let j=0,last=null;for(const d of dates){while(j<rows.length&&rows[j][0]<=d){last=rows[j][1];j++;}out.push([d,last]);}return out;}
 function ratio(a,b){const al=align(a.map(r=>r[0]),b);return a.map(([d,v],i)=>[d,al[i][1]>0?v/al[i][1]:null]);}
 function perf(rows,days,end){const s=sliceRange(rows,days,end).filter(r=>r[1]!=null);if(s.length<2)return null;return (s[s.length-1][1]/s[0][1]-1)*100;}
 function parseHash(h){const m=/^#coin=([A-Za-z0-9]{1,12})$/.exec(h||'');return m?m[1].toUpperCase():null;}
 const api={RANGES,BENCH,sliceRange,rebase,align,ratio,perf,parseHash,shift};
 if(typeof document==='undefined')return api;

 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const safe=u=>{try{const x=new URL(u);return /^https?:$/.test(x.protocol)?x.href:'';}catch{return '';}};
 const isN=v=>typeof v==='number'&&Number.isFinite(v);
 const pct=v=>!isN(v)?'—':(v>0?'+':'')+v.toFixed(2)+'%';
 const usd=v=>!isN(v)?'—':'$'+v.toLocaleString('en-US',{maximumFractionDigits:v<1?6:2,minimumFractionDigits:v<1?4:2});
 const compact=v=>!isN(v)?'—':'$'+new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(v);
 const fmtDate=s=>new Date(toDay(s)).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
 const cache=new Map();let page=null,index=null,st=null,lastFocus=null;
 const getJSON=url=>{if(!cache.has(url))cache.set(url,fetch(url).then(r=>{if(!r.ok)throw Error(r.status);return r.json();}).catch(()=>null));return cache.get(url);};
 const series=sym=>getJSON('data/history/'+encodeURIComponent(sym)+'.json');

 function build(){if($('coin-overlay'))return;const o=document.createElement('div');o.id='coin-overlay';o.className='co';o.hidden=true;o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-labelledby','co-title');
  o.innerHTML=`<div class="co-shell"><header class="co-head"><div><div class="eyebrow">FULL-SCREEN CHART · NEUTRAL PRICE CONTEXT</div><h2 id="co-title">Coin</h2><p id="co-sub" class="caption"></p></div><div class="co-head-actions"><button type="button" id="co-copy" class="co-btn">Copy link</button><button type="button" id="co-close" class="co-btn co-close" aria-label="Close chart (Esc)">✕ Close</button></div></header>
  <div class="co-body"><div class="co-main"><div class="co-toolbar"><div class="co-group" role="group" aria-label="Time range" id="co-ranges">${RANGES.map(([k])=>`<button type="button" class="co-chip" data-range="${k}" aria-pressed="false">${k}</button>`).join('')}</div><div class="co-group" role="group" aria-label="Compare against" id="co-bench">${BENCH.map(([k,n,c])=>`<button type="button" class="co-chip bench" data-bench="${k}" aria-pressed="false" style="--b:${c}"><span class="sw" aria-hidden="true"></span>${k==='GOLD'?'Gold':k}</button>`).join('')}</div></div>
  <div class="co-card"><div class="co-card-head"><h3 id="co-chart-title">Price (USD)</h3><span id="co-range-note" class="caption"></span></div><div class="co-chart" id="co-chart"></div><div id="co-legend" class="co-legend"></div></div>
  <div class="co-grid"><div class="co-card"><div class="co-card-head"><h3>Priced in</h3><div class="co-group" role="group" aria-label="Ratio denominator" id="co-ratio">${['BTC','ETH','GOLD'].map(k=>`<button type="button" class="co-chip" data-ratio="${k}" aria-pressed="${k==='BTC'}">${k==='GOLD'?'Gold (oz)':k}</button>`).join('')}</div></div><div class="co-chart small" id="co-ratio-chart"></div></div>
  <div class="co-card"><div class="co-card-head"><h3>Performance by range</h3></div><div class="table-scroll" id="co-perf" tabindex="0" aria-label="Performance table"></div></div></div>
  <div class="co-card co-sources"><h3>Series sources · as of</h3><div id="co-src"></div><p class="caption">Daily closes. Crypto = CoinGecko daily USD (latest point may be an intraday snapshot). Stocks and gold do not trade weekends/holidays: their last close is carried forward (shown flat) so lines align with 7-day crypto calendars. Past performance is not indicative of future results. <strong>Not financial advice.</strong> No buy/sell signals, indicators or predictions.</p></div></div>
  <aside class="co-side" id="co-side" aria-label="Coin context"></aside></div></div><div id="co-tip" class="co-tip" hidden role="status"></div>`;
  document.body.appendChild(o);
  $('co-close').onclick=()=>close();
  $('co-copy').onclick=()=>{const u=location.href.split('#')[0]+'#coin='+st.sym;(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(()=>{$('co-copy').textContent='Link copied';},()=>{$('co-copy').textContent='#coin='+st.sym;});};
  o.addEventListener('click',e=>{const r=e.target.closest('[data-range]'),b=e.target.closest('[data-bench]'),q=e.target.closest('[data-ratio]');
   if(r){st.range=r.dataset.range;draw();}else if(b){const k=b.dataset.bench;st.bench.has(k)?st.bench.delete(k):st.bench.add(k);draw();}else if(q){st.ratio=q.dataset.ratio;draw();}else if(e.target===o)close();});
  o.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();return;}if(e.key!=='Tab')return;const f=[...o.querySelectorAll('button,[href],select,input,[tabindex]:not([tabindex="-1"])')].filter(x=>!x.disabled&&!x.closest('[hidden]'));if(!f.length)return;const first=f[0],last=f[f.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
 }
 async function open(sym,fromHash){sym=String(sym||'').toUpperCase();page=page||await getJSON('data/page-data.json');index=index||await getJSON('data/history/index.json');
  const asset=(page?.assets||[]).find(a=>a.symbol===sym);if(!asset)return false;build();
  const o=$('coin-overlay');if(o.hidden)lastFocus=document.activeElement;
  st={sym,asset,range:st?.sym===sym?st.range:'3M',bench:st?.sym===sym?st.bench:new Set(),ratio:st?.ratio||'BTC',data:{}};
  o.hidden=false;document.body.classList.add('co-open');$('co-title').textContent=`${sym} · ${asset.id.replace(/-/g,' ')}`;
  if(!fromHash&&location.hash!=='#coin='+sym)history.pushState(null,'','#coin='+sym);
  $('co-close').focus();side();const my=st;st.loading=true;['co-chart','co-ratio-chart','co-perf','co-legend','co-src'].forEach(id=>$(id).innerHTML=id==='co-chart'?'<p class="co-na">Loading history…</p>':'');
  const syms=[sym,...BENCH.map(b=>b[0]).filter(k=>k!==sym)];const res=await Promise.all(syms.map(series));if(st!==my)return true;st.loading=false;syms.forEach((k,i)=>st.data[k]=res[i]&&Array.isArray(res[i].closes)&&res[i].closes.length?res[i]:null);
  draw();return true;}
 function close(){const o=$('coin-overlay');if(!o||o.hidden)return;o.hidden=true;$('co-tip').hidden=true;document.body.classList.remove('co-open');if(parseHash(location.hash))history.replaceState(null,'',location.pathname+location.search);if(lastFocus&&lastFocus.isConnected)lastFocus.focus();}
 const days=k=>RANGES.find(r=>r[0]===k)[1];
 function draw(){if(!st||st.loading)return;const c=st.data[st.sym];document.querySelectorAll('#co-ranges [data-range]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.range===st.range)));
  document.querySelectorAll('#co-bench [data-bench]').forEach(b=>{b.setAttribute('aria-pressed',String(st.bench.has(b.dataset.bench)));b.disabled=b.dataset.bench===st.sym;});
  document.querySelectorAll('#co-ratio [data-ratio]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.ratio===st.ratio));b.disabled=b.dataset.ratio===st.sym;});
  if(!c){$('co-sub').textContent='';$('co-chart').innerHTML='<p class="co-na">Data unavailable — price history for this coin could not be loaded. Nothing is estimated.</p>';$('co-legend').innerHTML='';$('co-ratio-chart').innerHTML='<p class="co-na">Data unavailable</p>';$('co-perf').innerHTML='';sources();return;}
  const rows=c.closes,end=rows[rows.length-1][0],sl=sliceRange(rows,days(st.range),end);const last=rows[rows.length-1][1];
  $('co-sub').innerHTML=`Last ${usd(last)} · ${fmtDate(end)} · Available history: ${fmtDate(rows[0][0])} – ${fmtDate(end)} (${rows.length} daily points; Max = full available range)`;
  $('co-range-note').textContent=`${st.range}: ${fmtDate(sl[0][0])} – ${fmtDate(end)}${st.range==='Max'||days(st.range)>=rows.length?' · limited to available history':''}`;
  const dates=sl.map(r=>r[0]);const benches=[...st.bench].filter(k=>k!==st.sym);let lines,mode;
  if(benches.length){mode='pct';lines=[{k:st.sym,label:st.sym,color:COIN_COLOR,dash:'',pts:rebase(sl)}];for(const k of benches){const b=BENCH.find(x=>x[0]===k),s=st.data[k];if(!s){lines.push({k,label:b[1],color:b[2],dash:b[3],pts:null});continue;}const al=align(dates,s.closes);const startIdx=al.findIndex(r=>r[1]!=null);const base=startIdx<0?null:al[startIdx][1];lines.push({k,label:b[1],color:b[2],dash:b[3],pts:base?al.map(([d,v])=>[d,v==null?null:(v/base-1)*100]):null});}}
  else{mode='usd';lines=[{k:st.sym,label:st.sym+' (USD)',color:COIN_COLOR,dash:'',pts:sl}];}
  $('co-chart-title').textContent=mode==='pct'?'% change from range start (rebased to 0)':'Price (USD)';
  svgChart($('co-chart'),lines,mode,{h:420});
  $('co-legend').innerHTML=lines.map(l=>`<span class="lg"><svg width="28" height="10" aria-hidden="true"><line x1="0" y1="5" x2="28" y2="5" stroke="${l.color}" stroke-width="3" stroke-dasharray="${l.dash}"/></svg>${esc(l.label)}${l.pts?(mode==='pct'?' '+pct(l.pts.filter(p=>p[1]!=null).slice(-1)[0]?.[1]):''):' · <em>Data unavailable</em>'}</span>`).join('')+(mode==='usd'?'<span class="caption">Toggle a benchmark to compare as % change.</span>':'');
  const den=st.data[st.ratio];const rlab=st.ratio==='GOLD'?'oz gold':st.ratio;
  if(st.ratio===st.sym)$('co-ratio-chart').innerHTML='<p class="co-na">Choose a different denominator.</p>';
  else if(!den)$('co-ratio-chart').innerHTML='<p class="co-na">Data unavailable</p>';
  else svgChart($('co-ratio-chart'),[{k:'r',label:`${st.sym} in ${rlab}`,color:'#D4A017',dash:'',pts:ratio(sl,den.closes)}],'ratio',{h:240,unit:rlab});
  const cols=[[st.sym,c],...BENCH.filter(b=>b[0]!==st.sym).map(b=>[b[0]==='GOLD'?'Gold':b[0],st.data[b[0]]])];
  $('co-perf').innerHTML=`<table class="co-table"><caption class="sr-only">Percent change over each range, ending ${esc(fmtDate(end))}</caption><thead><tr><th scope="col">Range</th>${cols.map(([n])=>`<th scope="col">${esc(n)}</th>`).join('')}</tr></thead><tbody>${RANGES.map(([k,d])=>`<tr${k===st.range?' class="cur"':''}><th scope="row">${k}</th>${cols.map(([n,s])=>{if(!s)return '<td class="muted">Data unavailable</td>';const v=perf(s.closes,d,end);const avail=d===Infinity||toDay(s.closes[0][0])<=toDay(shift(end,d));return `<td class="${v>0?'up':v<0?'down':''}">${pct(v)}${avail||v==null?'':'<sup title="Shorter than range: from first available day">*</sup>'}</td>`;}).join('')}</tr>`).join('')}</tbody></table><p class="caption">All ranges end ${esc(fmtDate(end))}. * = series history shorter than the range. Benchmarks use their latest close on or before each date.</p>`;
  sources();}
 function sources(){const ks=[st.sym,...BENCH.map(b=>b[0]).filter(k=>k!==st.sym)];$('co-src').innerHTML='<ul class="co-srclist">'+ks.map(k=>{const s=st.data[k];if(!s)return `<li><strong>${esc(k)}</strong>: Data unavailable</li>`;const u=safe(s.sourceUrl);return `<li><strong>${esc(k==='GOLD'?'Gold':k)}</strong>: ${u?`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(s.source)}</a>`:esc(s.source)} · as of ${esc(fmtDate(s.asOf))} · ${s.days} days from ${esc(fmtDate(s.first))}${s.ffill?' · weekends forward-filled':''}</li>`;}).join('')+'</ul>';}
 function svgChart(el,lines,mode,{h,unit}){const W=1000,H=h,P={l:mode==='usd'||mode==='ratio'?92:64,r:20,t:16,b:34};const all=lines.filter(l=>l.pts).flatMap(l=>l.pts.map(p=>p[1]).filter(isN));if(!all.length){el.innerHTML='<p class="co-na">Data unavailable</p>';return;}
  let lo=Math.min(...all),hi=Math.max(...all);if(mode==='pct'){lo=Math.min(lo,0);hi=Math.max(hi,0);}if(hi===lo){hi+=1;lo-=1;}const pad=(hi-lo)*.06;lo-=pad;hi+=pad;
  const dates=(lines.find(l=>l.pts)||lines[0]).pts.map(p=>p[0]);const n=dates.length;const x=i=>P.l+(n<2?0:i*(W-P.l-P.r)/(n-1)),y=v=>P.t+(hi-v)*(H-P.t-P.b)/(hi-lo);
  const fy=v=>mode==='pct'?pct(v):mode==='usd'?usd(v):(Math.abs(v)<.001?v.toExponential(2):v.toPrecision(4));
  let g='';for(let k=0;k<=4;k++){const v=lo+(hi-lo)*k/4;g+=`<line x1="${P.l}" x2="${W-P.r}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${P.l-8}" y="${y(v)+5}" text-anchor="end" class="ax">${esc(fy(v))}</text>`;}
  if(mode==='pct')g+=`<line x1="${P.l}" x2="${W-P.r}" y1="${y(0)}" y2="${y(0)}" class="zero"/>`;
  const ticks=Math.min(6,n);for(let k=0;k<ticks;k++){const i=Math.round(k*(n-1)/Math.max(1,ticks-1));g+=`<text x="${x(i)}" y="${H-10}" text-anchor="${k===0?'start':k===ticks-1?'end':'middle'}" class="ax">${esc(new Date(toDay(dates[i])).toLocaleDateString('en-US',{month:'short',day:'numeric',...(n>200?{year:'2-digit'}:{}),timeZone:'UTC'}))}</text>`;}
  const paths=lines.filter(l=>l.pts).map(l=>{let d='',pen=false;l.pts.forEach((p,i)=>{if(!isN(p[1])){pen=false;return;}d+=(pen?'L':'M')+x(i).toFixed(1)+' '+y(p[1]).toFixed(1);pen=true;});return `<path d="${d}" fill="none" stroke="${l.color}" stroke-width="${l.k===st.sym||l.k==='r'?3.2:2.2}" stroke-dasharray="${l.dash}" stroke-linejoin="round"/>`;}).join('');
  const lab=lines.map(l=>l.label).join(', ');
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc((mode==='pct'?'Percent change chart: ':mode==='ratio'?'Ratio chart: ':'Price chart: ')+lab)}" tabindex="0">${g}${paths}<line class="cross" y1="${P.t}" y2="${H-P.b}" x1="-10" x2="-10"/><rect class="hit" x="${P.l}" y="${P.t}" width="${W-P.l-P.r}" height="${H-P.t-P.b}" fill="transparent"/></svg>`;
  const svg=el.querySelector('svg'),cross=svg.querySelector('.cross'),tip=$('co-tip');
  const show=(cx,cy)=>{const r=svg.getBoundingClientRect();if(!r.width)return;const vx=(cx-r.left)*W/r.width;const i=Math.max(0,Math.min(n-1,Math.round((vx-P.l)*(n-1)/(W-P.l-P.r))));cross.setAttribute('x1',x(i));cross.setAttribute('x2',x(i));
   tip.innerHTML=`<strong>${esc(fmtDate(dates[i]))}</strong>`+lines.map(l=>`<div><span class="sw" style="background:${l.color}"></span>${esc(l.label)}: ${l.pts&&isN(l.pts[i]?.[1])?esc(fy(l.pts[i][1])):'—'}</div>`).join('');tip.hidden=false;
   const tw=tip.offsetWidth||200;tip.style.left=Math.min(window.innerWidth-tw-8,Math.max(8,cx+14))+'px';tip.style.top=Math.max(8,cy-20)+'px';};
  const hide=()=>{tip.hidden=true;cross.setAttribute('x1',-10);cross.setAttribute('x2',-10);};
  svg.addEventListener('pointermove',e=>show(e.clientX,e.clientY));svg.addEventListener('pointerdown',e=>show(e.clientX,e.clientY));svg.addEventListener('pointerleave',hide);
  svg.addEventListener('keydown',e=>{if(!/Arrow(Left|Right)/.test(e.key))return;const r=svg.getBoundingClientRect();svg._i=Math.max(0,Math.min(n-1,(svg._i??n-1)+(e.key==='ArrowRight'?1:-1)));show(r.left+x(svg._i)*r.width/W,r.top+r.height/3);});
  svg.addEventListener('blur',hide);}
 function side(){const a=st.asset,ns=a.newsSentiment||{};const cls={Positive:'rocket',Negative:'yikes'}[ns.label]||'steady';const m=k=>a[k]&&isN(a[k].current)?`${compact(a[k].current)}${isN(a[k].change7d)?` <span class="${a[k].change7d>0?'up':'down'}">${pct(a[k].change7d)} 7d</span>`:''}`:'Unknown';
  const news=(page.news||[]).filter(x=>(x.assets||[]).includes(a.symbol)).slice(0,6);const L=(u,t)=>safe(u)?`<a href="${esc(safe(u))}" target="_blank" rel="noopener noreferrer">${esc(t)}</a>`:'';
  $('co-side').innerHTML=`<section><h3>Research summary</h3><p><span class="sentiment ${cls}">News sentiment: ${esc(ns.label||'Insufficient news')}</span></p><p>${esc(a.researchSummary||'No reviewed summary yet.')}</p><p class="caption">Describes recent news, not a price call.</p></section>
  <section><h3>Usage metrics</h3><dl class="co-dl"><dt>Value locked</dt><dd>${m('tvl')}</dd><dt>Stablecoins</dt><dd>${m('stables')}</dd><dt>Fees</dt><dd>${m('fees')}</dd><dt>Revenue</dt><dd>${m('revenue')}</dd></dl></section>
  <section><h3>Catalysts</h3>${(a.catalysts||[]).length?'<ul>'+a.catalysts.slice(0,5).map(c=>`<li><strong>${esc(c.date||'Undated')}</strong> ${esc(c.title)} ${L(c.source,'Source')}</li>`).join('')+'</ul>':'<p class="muted">None scheduled in the reviewed window.</p>'}</section>
  <section><h3>Risk flags</h3><ul>${(a.riskFlags?.flags||[]).map(f=>`<li><strong>${esc(f.kind)}:</strong> ${esc(f.text)}</li>`).join('')}</ul></section>
  <section><h3>Thesis check</h3>${a.thesis?`<p><strong>Going right:</strong> ${esc(a.thesis.goingRight)}</p><p><strong>Would weaken:</strong> ${esc(a.thesis.wouldWeaken)}</p><p><strong>This week:</strong> ${esc(a.thesis.changedThisWeek)}</p>`:'<p class="muted">Unknown</p>'}</section>
  <section><h3>Recent tagged news</h3>${news.length?'<ul class="co-news">'+news.map(x=>`<li><span class="tag ${x.tag==='Rocket'?'rocket':x.tag==='Yikes'?'yikes':'steady'}">${esc(x.tag||'Steady')}</span> <strong>${esc(x.title)}</strong> <span class="caption">${esc(x.date)}</span> ${L(x.sources?.[0]?.href,'Source')}</li>`).join('')+'</ul>':'<p class="muted">No recent tagged stories.</p>'}</section>
  <p class="caption">Not financial advice. No buy/sell ratings, targets or predictions.</p>`;}
 function hookOpeners(){const pick=$('coin-picker'),h=$('coin-title');if(h&&!$('coin-chart-open')){const b=document.createElement('button');b.type='button';b.id='coin-chart-open';b.className='co-open-btn';b.textContent='⤢ Full-screen chart';b.hidden=true;h.insertAdjacentElement('afterend',b);b.onclick=()=>open(pick.value);const sync=()=>{b.hidden=!pick||pick.value==='All';};pick&&pick.addEventListener('change',sync);document.addEventListener('click',()=>setTimeout(sync,0));}}
 function init(){
  document.addEventListener('click',e=>{const t=e.target.closest('.tile-main[data-coin], #compare-table [data-coin], #coin-title');if(!t)return;const sym=t.id==='coin-title'?$('coin-picker')?.value:t.dataset.coin;if(sym&&sym!=='All')open(sym);});
  window.addEventListener('hashchange',()=>{const s=parseHash(location.hash);if(s)open(s,true);else close();});
  window.addEventListener('popstate',()=>{const s=parseHash(location.hash);if(!s)close();});
  const wait=setInterval(()=>{if(window.__dashboardReady){clearInterval(wait);hookOpeners();const s=parseHash(location.hash);if(s)open(s,true);}},60);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
 api.open=open;api.close=close;api.state=()=>st;return api;
});
