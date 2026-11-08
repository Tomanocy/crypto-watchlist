'use strict';
/* Wide comparison chart for the "Compare the watchlist" section. Plain SVG, no libraries.
   Historical data only: no indicators, signals or predictions. Pure helpers exported for node tests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CompareChart=api;})(typeof self!=='undefined'?self:this,function(){
 const RANGES=[['7D',7],['1M',30],['3M',90],['6M',180],['1Y',365],['2Y',730],['3Y',1095],['5Y',1825],['Max',Infinity]];
 const METRICS=[['price','Price (USD)'],['tvl','Value locked'],['stables','Stablecoin USD value'],['fees','Fees paid / day'],['revenue','Revenue retained / burned']];
 const COLORS=['#14B8A6','#D4A017','#60A5FA','#F87171','#A78BFA','#84CC16','#F472B6','#FB923C','#22D3EE','#FACC15','#4ADE80','#C084FC','#F97316','#38BDF8','#E879F9','#94A3B8'];
 const DAY=86400000,MON={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
 const toDay=s=>Date.parse(s+'T00:00:00Z');
 const iso=t=>new Date(t).toISOString().slice(0,10);
 const shift=(s,days)=>iso(toDay(s)-days*DAY);
 const isN=v=>typeof v==='number'&&Number.isFinite(v);
 /* Metric histories carry "Oct 06" labels without a year: infer the year from the refresh date (never in the future). */
 function labelToIso(label,ref){if(/^\d{4}-\d{2}-\d{2}$/.test(label))return label;const m=/^([A-Z][a-z]{2})\s+(\d{1,2})$/.exec(String(label||'').trim());if(!m||!(m[1] in MON))return null;const r=new Date(ref||Date.now());let y=r.getUTCFullYear();let t=Date.UTC(y,MON[m[1]],+m[2]);if(t>r.getTime()+2*DAY)t=Date.UTC(y-1,MON[m[1]],+m[2]);return iso(t);}
 function normalize(history,ref){return (history||[]).map(p=>Array.isArray(p)?[labelToIso(p[0],ref),p[1]]:null).filter(p=>p&&p[0]&&isN(p[1])).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);}
 function sliceRange(rows,days,end){if(!rows||!rows.length)return [];if(days===Infinity)return rows.filter(r=>r[0]<=end);const start=shift(end,days);return rows.filter(r=>r[0]>=start&&r[0]<=end);}
 function covers(rows,days,end){if(!rows||rows.length<2)return false;if(days===Infinity)return true;return toDay(rows[0][0])<=toDay(shift(end,days))+7*DAY;}
 function align(dates,rows){const out=[];let j=0,last=null;for(const d of dates){while(j<rows.length&&rows[j][0]<=d){last=rows[j][1];j++;}out.push([d,j===0?null:last]);}return out;}
 /* Rebase each line to its own first valid point in the range (so late-listed coins start at 0 too). */
 function rebase(pts){const i=pts.findIndex(p=>isN(p[1])&&p[1]>0);if(i<0)return null;const b=pts[i][1];return pts.map(([d,v],k)=>[d,k<i||!isN(v)?null:(v/b-1)*100]);}
 /* Which ranges have at least one coin with full coverage. */
 function availableRanges(seriesList,end){return RANGES.filter(([,d])=>seriesList.some(s=>covers(s,d,end))).map(r=>r[0]);}
 const api={RANGES,METRICS,COLORS,labelToIso,normalize,sliceRange,covers,align,rebase,availableRanges,shift};
 if(typeof document==='undefined')return api;

 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const pct=v=>!isN(v)?'—':(v>0?'+':'')+v.toFixed(2)+'%';
 const usd=v=>!isN(v)?'—':Math.abs(v)>=1e5?'$'+new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(v):'$'+v.toLocaleString('en-US',{maximumFractionDigits:v<1?5:2,minimumFractionDigits:v<1?4:2});
 const fmtDate=s=>new Date(toDay(s)).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
 const cache=new Map();let page=null,st=null,lastFocus=null;
 const getJSON=url=>{if(!cache.has(url))cache.set(url,fetch(url).then(r=>{if(!r.ok)throw Error(r.status);return r.json();}).catch(()=>null));return cache.get(url);};
 const days=k=>RANGES.find(r=>r[0]===k)[1];

 function visibleCoins(){const out=[];document.querySelectorAll('#compare-table [data-coin]').forEach(b=>{const s=b.dataset.coin;if(s&&!out.includes(s))out.push(s);});return out;}
 function defaultMetric(a){const k=['tvl','fees','stables','revenue'].find(k=>(a?.[k]?.history||[]).length>1);return k||'price';}

 function build(){if($('cmp-overlay'))return;const o=document.createElement('div');o.id='cmp-overlay';o.className='co';o.hidden=true;o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-labelledby','cmp-title');
  o.innerHTML=`<div class="co-shell"><header class="co-head"><div><div class="eyebrow">WIDE CHART · COMPARE THE WATCHLIST</div><h2 id="cmp-title">Compare</h2><p id="cmp-sub" class="caption"></p></div><div class="co-head-actions"><button type="button" id="cmp-close" class="co-btn co-close" aria-label="Close wide chart (Esc)">✕ Close</button></div></header>
  <div class="co-toolbar"><div class="co-group" role="group" aria-label="Metric" id="cmp-metrics">${METRICS.map(([k,l])=>`<button type="button" class="co-chip" data-metric="${k}" aria-pressed="false">${esc(l)}</button>`).join('')}</div><div class="co-group" role="group" aria-label="Scale" id="cmp-modes"><button type="button" class="co-chip" data-mode="pct" aria-pressed="true">% change</button><button type="button" class="co-chip" data-mode="abs" aria-pressed="false">Actual values</button></div></div>
  <div class="co-toolbar"><div class="co-group" role="group" aria-label="Time range" id="cmp-ranges">${RANGES.map(([k])=>`<button type="button" class="co-chip" data-range="${k}" aria-pressed="false">${k}</button>`).join('')}</div><div class="co-group"><button type="button" class="co-chip" id="cmp-all">Show all</button><button type="button" class="co-chip" id="cmp-none">Hide all</button></div></div>
  <div class="co-card cmp-card"><div class="co-card-head"><h3 id="cmp-chart-title">Chart</h3><span id="cmp-range-note" class="caption"></span></div><div class="co-chart cmp-chart" id="cmp-chart"></div><div id="cmp-legend" class="cmp-legend" role="group" aria-label="Coins shown (click to toggle)"></div></div>
  <p id="cmp-note" class="caption"></p><p class="caption"><strong>Historical data only. Not financial advice.</strong> No forecasts, targets or trading indicators. Past performance is not indicative of future results.</p></div><div id="cmp-tip" class="co-tip" hidden role="status"></div>`;
  document.body.appendChild(o);
  $('cmp-close').onclick=()=>close();
  $('cmp-all').onclick=()=>{st.hidden.clear();draw();};$('cmp-none').onclick=()=>{st.coins.forEach(c=>st.hidden.add(c));draw();};
  o.addEventListener('click',e=>{const r=e.target.closest('[data-range]'),m=e.target.closest('[data-metric]'),md=e.target.closest('[data-mode]'),lg=e.target.closest('[data-toggle]');
   if(r&&!r.disabled){st.range=r.dataset.range;st.userRange=true;draw();}else if(m){st.metric=m.dataset.metric;draw();}else if(md){st.mode=md.dataset.mode;draw();}
   else if(lg){const s=lg.dataset.toggle;if(e.shiftKey||e.altKey){st.focus=st.focus===s?null:s;}else{st.hidden.has(s)?st.hidden.delete(s):st.hidden.add(s);}draw();}else if(e.target===o)close();});
  o.addEventListener('dblclick',e=>{const lg=e.target.closest('[data-toggle]');if(lg){st.focus=st.focus===lg.dataset.toggle?null:lg.dataset.toggle;st.hidden.delete(lg.dataset.toggle);draw();}});
  o.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();return;}if(e.key!=='Tab')return;const f=[...o.querySelectorAll('button,[href],select,input,[tabindex]:not([tabindex="-1"])')].filter(x=>!x.disabled&&!x.closest('[hidden]'));if(!f.length)return;const first=f[0],last=f[f.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
 }

 async function open(focusSym,metric){page=page||await getJSON('data/page-data.json');if(!page)return false;build();const o=$('cmp-overlay');if(o.hidden)lastFocus=document.activeElement;
  let coins=visibleCoins();if(!coins.length)coins=(page.assets||[]).map(a=>a.symbol);
  const asset=(page.assets||[]).find(a=>a.symbol===focusSym);
  st={coins,focus:focusSym||null,metric:metric||(asset?defaultMetric(asset):'price'),mode:'pct',range:'1M',userRange:false,hidden:new Set(),price:{}};
  o.hidden=false;document.body.classList.add('co-open');$('cmp-close').focus();$('cmp-chart').innerHTML='<p class="co-na">Loading history…</p>';
  const my=st;const res=await Promise.all(coins.map(s=>getJSON('data/history/'+encodeURIComponent(s)+'.json')));if(st!==my)return true;
  coins.forEach((s,i)=>{const r=res[i];st.price[s]=r&&Array.isArray(r.closes)&&r.closes.length>1?r.closes:null;});draw();return true;}
 function close(){const o=$('cmp-overlay');if(!o||o.hidden)return;o.hidden=true;$('cmp-tip').hidden=true;document.body.classList.remove('co-open');if(lastFocus&&lastFocus.isConnected)lastFocus.focus();}

 function seriesFor(sym){if(st.metric==='price')return st.price[sym]||null;const a=(page.assets||[]).find(x=>x.symbol===sym);const rows=normalize(a?.[st.metric]?.history,page.asOfISO||page.refreshedAt||page.asOf);return rows.length>1?rows:null;}
 function draw(){if(!st)return;const mlabel=METRICS.find(m=>m[0]===st.metric)[1];
  const all=st.coins.map((s,i)=>({k:s,color:COLORS[i%COLORS.length],rows:seriesFor(s)}));const withData=all.filter(l=>l.rows);
  const end=withData.length?withData.map(l=>l.rows[l.rows.length-1][0]).sort().slice(-1)[0]:null;
  const ok=end?availableRanges(withData.map(l=>l.rows),end):[];
  if(ok.length&&!ok.includes(st.range)){st.range=ok.includes('1Y')&&st.metric==='price'?'1Y':ok.filter(k=>k!=='Max').slice(-1)[0]||ok[0];}
  if(!st.userRange&&st.metric==='price'&&ok.includes('1Y')&&st.range==='1M'){st.range='1Y';}
  document.querySelectorAll('#cmp-metrics [data-metric]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.metric===st.metric)));
  document.querySelectorAll('#cmp-modes [data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===st.mode)));
  const earliest=withData.length?withData.map(l=>l.rows[0][0]).sort()[0]:null;
  document.querySelectorAll('#cmp-ranges [data-range]').forEach(b=>{const k=b.dataset.range,en=ok.includes(k);b.disabled=!en;b.setAttribute('aria-pressed',String(k===st.range));b.title=en?'':(st.metric==='price'?'No coin shown has history this long':'Only about 30 days of '+mlabel.toLowerCase()+' history is stored');});
  $('cmp-title').textContent=`${mlabel} · ${st.coins.length} coin${st.coins.length===1?'':'s'}`;
  $('cmp-sub').textContent=`Coins match the current table (peer group, search and favourites filters). ${st.focus?st.focus+' is highlighted. ':''}Click a coin below to show or hide it; double-click to highlight it.`;
  if(!withData.length){$('cmp-chart').innerHTML=`<p class="co-na">No ${esc(mlabel.toLowerCase())} history is available for these coins. Nothing is estimated.</p>`;$('cmp-legend').innerHTML=legend(all,{});$('cmp-range-note').textContent='';$('cmp-note').textContent='';return;}
  const span=days(st.range);
  /* Reference dates: the visible coin with the longest history inside the range. */
  const shown=withData.filter(l=>!st.hidden.has(l.k));
  const ref=(shown.length?shown:withData).map(l=>sliceRange(l.rows,span,end)).sort((a,b)=>b.length-a.length||(a[0]?.[0]<b[0]?.[0]?-1:1))[0];
  const dates=ref.map(r=>r[0]);
  const lines=all.map(l=>{if(!l.rows)return {...l,pts:null};let pts=align(dates,sliceRange(l.rows,span,end).length?l.rows.filter(r=>r[0]>=(dates[0]||'')):[]);if(pts.every(p=>!isN(p[1])))return {...l,pts:null,empty:true};if(st.mode==='pct')pts=rebase(pts);const first=pts&&pts.find(p=>isN(p[1]));return {...l,pts,since:first&&dates[0]&&first[0]>dates[0]?first[0]:null};});
  const logScale=st.mode==='abs'&&st.metric==='price';
  $('cmp-chart-title').textContent=st.mode==='pct'?`${mlabel} · % change from range start (each coin rebased to 0)`:`${mlabel} · actual values${logScale?' (log scale)':''}`;
  $('cmp-range-note').textContent=`${st.range}: ${fmtDate(dates[0])} – ${fmtDate(end)}${span>365?' · weekly points before the last year':''}`;
  chart($('cmp-chart'),lines.filter(l=>l.pts&&!st.hidden.has(l.k)),{log:logScale,pct:st.mode==='pct',dates});
  const lastVals={};lines.forEach(l=>{if(l.pts){const v=l.pts.filter(p=>isN(p[1])).slice(-1)[0];lastVals[l.k]=v?v[1]:null;}});
  $('cmp-legend').innerHTML=legend(lines,lastVals);
  const missing=all.filter(l=>!l.rows).map(l=>l.k);const late=lines.filter(l=>l.since).map(l=>`${l.k} from ${fmtDate(l.since)}`);
  $('cmp-note').textContent=[st.metric==='price'?'Prices are daily closes (Yahoo Finance, cross-checked with CoinGecko); beyond the last ~13 months points are weekly.':'Usage metrics come from DefiLlama daily observations; about 30 days are stored, so longer ranges are greyed out.',missing.length?`No ${mlabel.toLowerCase()} data: ${missing.join(', ')}.`:'',late.length?`Shorter history (starts later, rebased from its first point): ${late.join('; ')}.`:'',st.mode==='pct'&&st.metric!=='price'?'Coins whose first value in range is zero cannot be shown as % change.':''].filter(Boolean).join(' ');
 }
 function legend(lines,lastVals){return lines.map(l=>{const off=st.hidden.has(l.k),na=!l.pts;const v=lastVals[l.k];return `<button type="button" class="cmp-lg${off?' off':''}${st.focus===l.k?' focus':''}" data-toggle="${esc(l.k)}" aria-pressed="${!off&&!na}" ${na?'disabled title="No data for this metric"':''} style="--b:${l.color}"><span class="sw" aria-hidden="true"></span>${esc(l.k)}${na?' · no data':isN(v)?' '+(st.mode==='pct'?pct(v):usd(v)):''}</button>`;}).join('');}
 function chart(el,lines,{log,pct:isPct,dates}){const W=1200,H=520,P={l:isPct?72:96,r:24,t:16,b:36};const n=dates.length;
  const tf=v=>log?(v>0?Math.log10(v):null):v;
  const vals=lines.flatMap(l=>l.pts.map(p=>tf(p[1])).filter(isN));if(!vals.length||n<2){el.innerHTML='<p class="co-na">Select at least one coin with data.</p>';return;}
  let lo=Math.min(...vals),hi=Math.max(...vals);if(isPct){lo=Math.min(lo,0);hi=Math.max(hi,0);}if(hi===lo){hi+=1;lo-=1;}const pad=(hi-lo)*.05;lo-=pad;hi+=pad;
  const x=i=>P.l+i*(W-P.l-P.r)/(n-1),y=v=>P.t+(hi-v)*(H-P.t-P.b)/(hi-lo);
  const fy=v=>isPct?pct(v):usd(v);const ax=t=>fy(log?Math.pow(10,t):t);
  let g='';for(let k=0;k<=5;k++){const t=lo+(hi-lo)*k/5;g+=`<line x1="${P.l}" x2="${W-P.r}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${P.l-8}" y="${y(t)+5}" text-anchor="end" class="ax">${esc(ax(t))}</text>`;}
  if(isPct)g+=`<line x1="${P.l}" x2="${W-P.r}" y1="${y(0)}" y2="${y(0)}" class="zero"/>`;
  const ticks=Math.min(7,n);for(let k=0;k<ticks;k++){const i=Math.round(k*(n-1)/Math.max(1,ticks-1));g+=`<text x="${x(i)}" y="${H-10}" text-anchor="${k===0?'start':k===ticks-1?'end':'middle'}" class="ax">${esc(new Date(toDay(dates[i])).toLocaleDateString('en-US',{month:'short',day:'numeric',...(n>200?{year:'2-digit'}:{}),timeZone:'UTC'}))}</text>`;}
  const order=[...lines].sort((a,b)=>(a.k===st.focus)-(b.k===st.focus));
  const paths=order.map(l=>{let d='',pen=false;l.pts.forEach((p,i)=>{const t=tf(p[1]);if(!isN(t)){pen=false;return;}d+=(pen?'L':'M')+x(i).toFixed(1)+' '+y(t).toFixed(1);pen=true;});const f=st.focus===l.k,dim=st.focus&&!f;return `<path d="${d}" fill="none" stroke="${l.color}" stroke-width="${f?4.2:2.2}" stroke-opacity="${dim?.45:1}" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;}).join('');
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" tabindex="0" aria-label="${esc((isPct?'Percent change':'Values')+' chart for '+lines.map(l=>l.k).join(', '))}">${g}${paths}<line class="cross" y1="${P.t}" y2="${H-P.b}" x1="-10" x2="-10"/><rect x="${P.l}" y="${P.t}" width="${W-P.l-P.r}" height="${H-P.t-P.b}" fill="transparent"/></svg>`;
  const svg=el.querySelector('svg'),cross=svg.querySelector('.cross'),tip=$('cmp-tip');
  const show=(cx,cy)=>{const r=svg.getBoundingClientRect();if(!r.width)return;const vx=(cx-r.left)*W/r.width;const i=Math.max(0,Math.min(n-1,Math.round((vx-P.l)*(n-1)/(W-P.l-P.r))));cross.setAttribute('x1',x(i));cross.setAttribute('x2',x(i));
   const rows=lines.map(l=>[l,l.pts[i]?.[1]]).filter(r=>isN(r[1])).sort((a,b)=>b[1]-a[1]);
   tip.innerHTML=`<strong>${esc(fmtDate(dates[i]))}</strong>`+rows.map(([l,v])=>`<div${l.k===st.focus?' class="f"':''}><span class="sw" style="background:${l.color}"></span>${esc(l.k)}: ${esc(fy(v))}</div>`).join('');tip.hidden=false;
   const tw=tip.offsetWidth||200,th=tip.offsetHeight||200;tip.style.left=(cx+tw+24>window.innerWidth?Math.max(8,cx-tw-14):cx+14)+'px';tip.style.top=Math.max(8,Math.min(window.innerHeight-th-8,cy-20))+'px';};
  const hide=()=>{tip.hidden=true;cross.setAttribute('x1',-10);cross.setAttribute('x2',-10);};
  svg.addEventListener('pointermove',e=>show(e.clientX,e.clientY));svg.addEventListener('pointerdown',e=>show(e.clientX,e.clientY));svg.addEventListener('pointerleave',hide);
  svg.addEventListener('keydown',e=>{if(!/Arrow(Left|Right)/.test(e.key))return;const r=svg.getBoundingClientRect();svg._i=Math.max(0,Math.min(n-1,(svg._i??n-1)+(e.key==='ArrowRight'?1:-1)));show(r.left+x(svg._i)*r.width/W,r.top+r.height/3);});
  svg.addEventListener('blur',hide);}

 /* Make compare-table sparklines act as buttons, and add the "Wide chart" button. */
 function enhance(){const t=$('compare-table');if(!t)return;t.querySelectorAll('svg.spark').forEach(s=>{if(s.dataset.wide)return;const cell=s.closest('.coin-cell');const sym=cell?.querySelector('[data-coin]')?.dataset.coin||'';s.dataset.wide=sym||'1';s.setAttribute('role','button');s.setAttribute('tabindex','0');s.classList.add('wide-open');s.setAttribute('aria-label',`Open wide chart${sym?' with '+sym+' highlighted':''}`);});}
 function hook(){const c=$('compare');if(c&&!$('cmp-open')){const b=document.createElement('button');b.type='button';b.id='cmp-open';b.className='co-open-btn';b.textContent='⤢ Wide chart';const h=c.querySelector('h2');(h||c).insertAdjacentElement('afterend',b);b.onclick=()=>open(null,null);}
  const t=$('compare-table');if(t){enhance();new MutationObserver(enhance).observe(t,{childList:true,subtree:true});}}
 function metricOf(sym){const a=(page?.assets||[]).find(x=>x.symbol===sym);return a?defaultMetric(a):null;}
 function init(){
  document.addEventListener('click',e=>{const s=e.target.closest('#compare-table svg.wide-open');if(!s)return;e.preventDefault();const sym=s.dataset.wide!=='1'?s.dataset.wide:null;getJSON('data/page-data.json').then(p=>{page=page||p;open(sym,sym?metricOf(sym):null);});});
  document.addEventListener('keydown',e=>{const s=e.target.closest&&e.target.closest('#compare-table svg.wide-open');if(!s||(e.key!=='Enter'&&e.key!==' '))return;e.preventDefault();s.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
  const wait=setInterval(()=>{if(window.__dashboardReady){clearInterval(wait);hook();}},60);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
 api.open=open;api.close=close;api.state=()=>st;return api;
});
