#!/usr/bin/env python3
"""Public numeric-only refresh. Writes numeric-data.json; NEVER writes the editorial seed."""
import argparse, concurrent.futures, copy, datetime as dt, json, math, pathlib, urllib.parse, urllib.request
from zoneinfo import ZoneInfo
TZ=ZoneInfo('America/Chicago')
KINDS=['tvl','stables','fees','revenue']
FEES={'HBAR':'hedera','XRP':'xrpl','XLM':'stellar','ICP':'internet-computer','DOT':'polkadot','BNKR':'bankr','ONDO':'ondo-finance','ALGO':'algorand','SUI':'sui','NEAR':'near','SOL':'solana','FLR':'flare','BTC':'bitcoin'}
NUMERIC_KEYS=['symbol','id','peer','chain','market','turnover','tradingActivity','coverage','dataAvailable','metricFreshness','priceContext','gapObservations','tvl','stables','fees','revenue','visual']
def finite(v):return isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)
def get(url):
 request=urllib.request.Request(url,headers={'User-Agent':'CryptoWatchlist-PublicMetrics/1.0','Accept':'application/json'})
 with urllib.request.urlopen(request,timeout=35) as response:value=json.load(response)
 if isinstance(value,dict) and value.get('error'):raise ValueError('API error response')
 return value

def pull(job):
 key,url=job
 try:return key,get(url),None
 except Exception as e:return key,None,type(e).__name__+': '+str(e)[:150]

def stock_change(series,days):
 if not series:return None
 target=series[-1][0]-days*86400;older=[p for p in series if p[0]<=target]
 if not older or target-older[-1][0]>2*86400 or older[-1][1]<=0:return None
 return (series[-1][1]/older[-1][1]-1)*100

def flow_change(series,days):
 if len(series)<2*days:return None
 end=series[-1][0];mapping=dict(series);wanted=[end-i*86400 for i in range(2*days)]
 if any(t not in mapping for t in wanted):return None
 new=sum(mapping[t] for t in wanted[:days]);old=sum(mapping[t] for t in wanted[days:])
 return {'new':new,'old':old,'pct':(new/old-1)*100 if old>0 else None}

def parse_series(value,kind,day):
 if kind in ['fees','revenue']:
  if not isinstance(value,dict) or not isinstance(value.get('totalDataChart'),list):raise ValueError('Missing daily adapter chart')
  rows=value['totalDataChart']
 else:
  if not isinstance(value,list):raise ValueError('Missing stock series')
  rows=value
 series=[]
 for row in rows:
  try:
   if kind in ['fees','revenue']:t,v=int(row[0]),row[1]
   elif kind=='tvl':t,v=int(row['date']),row['tvl']
   else:
    t=int(row['date']);parts=row.get('totalCirculatingUSD')
    if not isinstance(parts,dict) or not parts or not all(finite(v) for v in parts.values()):continue
    v=sum(parts.values())
   if finite(v) and t<day:series.append([t,float(v)])
  except (KeyError,ValueError,TypeError):continue
 series=sorted({p[0]:p for p in series}.values())
 if not series:raise ValueError('No valid completed observations')
 return series

def metric(series,kind,now):
 stamp=dt.datetime.fromtimestamp(series[-1][0],TZ).isoformat();fresh=now.timestamp()-series[-1][0]<=172800
 windows={d:flow_change(series,d) for d in [7,30]} if kind in ['fees','revenue'] else {}
 chart_rows=series[-31:]
 if kind in ['fees','revenue'] and any(b[0]-a[0]!=86400 for a,b in zip(chart_rows,chart_rows[1:])):chart_rows=[]
 result={'current':series[-1][1],'asOf':stamp,'fresh':fresh,'change7d':None,'change30d':None,'history':[[dt.datetime.fromtimestamp(t,TZ).strftime('%b %d'),v] for t,v in chart_rows]}
 if fresh:
  for days in [7,30]:result['change'+str(days)+'d']=(windows[days]['pct'] if windows.get(days) else None) if kind in ['fees','revenue'] else stock_change(series,days)
 return result,windows

def refresh(data_dir,fetch=get):
 seed_path=data_dir/'page-data.json';numeric_path=data_dir/'numeric-data.json';seed_bytes=seed_path.read_bytes();seed=json.loads(seed_bytes)
 old=json.loads(numeric_path.read_text()) if numeric_path.exists() else {'assets':seed['assets'],'backdrop':seed['backdrop'],'numericAlerts':seed.get('alerts',[])}
 previous={a['symbol']:a for a in old['assets']};assets=[{k:copy.deepcopy(previous.get(a['symbol'],a).get(k,a.get(k))) for k in NUMERIC_KEYS if k in a or k in previous.get(a['symbol'],{})} for a in seed['assets']]
 now=dt.datetime.now(TZ);day=int(now.timestamp())//86400*86400
 market_url='https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids='+','.join(a['id'] for a in assets)+'&per_page=100&page=1&price_change_percentage=30d'
 jobs=[('markets',market_url),('global_stables','https://stablecoins.llama.fi/stablecoincharts/all'),('fng','https://api.alternative.me/fng/?limit=91')]
 for a in assets:
  if a.get('chain'):
   chain=urllib.parse.quote(a['chain']);jobs.extend([(a['symbol']+':tvl','https://api.llama.fi/v2/historicalChainTvl/'+chain),(a['symbol']+':stables','https://stablecoins.llama.fi/stablecoincharts/'+chain)])
  if a['symbol'] in FEES:
   for kind,typ in [('fees','dailyFees'),('revenue','dailyRevenue')]:jobs.append((a['symbol']+':'+kind,'https://api.llama.fi/summary/fees/'+FEES[a['symbol']]+'?dataType='+typ))
 if fetch is get:
  with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(pull,jobs))
 else:
  results=[]
  for key,url in jobs:
   try:results.append((key,fetch(url),None))
   except Exception as e:results.append((key,None,str(e)))
 raw={key:value for key,value,error in results if not error};errors={key:error for key,value,error in results if error};urls=dict(jobs)
 if not raw:raise RuntimeError('All numeric sources failed; prior file and timestamps retained')
 markets={m['id']:m for m in raw.get('markets',[]) if isinstance(m,dict) and m.get('id')} if isinstance(raw.get('markets'),list) else {}
 alert_checks=[];failed_metrics=set();succeeded=0
 def alert(a,kind,text,why):alert_checks.append({'id':a['symbol']+':'+kind+'7d','asset':a['symbol'],'rule':kind+'7d','severity':'Medium','time':now.isoformat(),'change':text,'why':why,'source':urls[a['symbol']+':'+kind]})
 for a in assets:
  m=markets.get(a['id']);a.setdefault('market',{})
  if m and finite(m.get('current_price')):
   a['market']={k:m.get(k) for k in ['market_cap','total_volume','circulating_supply','total_supply','max_supply','ath_change_percentage','current_price','last_updated','price_change_percentage_30d_in_currency']}
   a['priceContext']={'usd':m['current_price'],'change30d':m.get('price_change_percentage_30d_in_currency'),'athDistance':m.get('ath_change_percentage'),'asOf':m.get('last_updated'),'circulating':m.get('circulating_supply'),'source':'https://www.coingecko.com/en/coins/'+a['id']};succeeded+=1
  else:errors[a['symbol']+':market']='Market row unavailable; prior values/dates retained'
  cap=a['market'].get('market_cap');volume=a['market'].get('total_volume');a['tradingActivity']=a['turnover']=volume/cap*100 if finite(cap) and cap>0 and finite(volume) else None
  for kind in KINDS:
   key=a['symbol']+':'+kind
   if key not in urls:continue
   try:
    if key not in raw:raise ValueError('Source unavailable')
    series=parse_series(raw[key],kind,day);value,windows=metric(series,kind,now);a[kind]=value;succeeded+=1
    if not value['fresh']:failed_metrics.add(key);continue
    pc=value['change7d']
    if not finite(pc):failed_metrics.add(key) # An unavailable comparison cannot resolve an old breach.
    if kind in ['tvl','stables'] and finite(pc) and pc>-100:
     prior=value['current']/(1+pc/100);delta=value['current']-prior;threshold,dollar=(15,5e6) if kind=='tvl' else (10,1e7)
     if abs(pc)>=threshold and abs(delta)>=dollar:alert(a,kind,f'{kind} {pc:+.2f}% over 7d (${delta:+,.0f}).','USD-valued capital or settlement liquidity changed; valuation, bridges and adapter scope may contribute. Not a trade signal.')
    if kind in ['fees','revenue']:
     w=windows.get(7)
     if w and finite(w['pct']) and abs(w['pct'])>=50 and w['old']>=1e4 and abs(w['new']-w['old'])>=1e4:alert(a,kind,f"Completed 7d {kind} {w['pct']:+.2f}% (${w['new']:,.0f} vs ${w['old']:,.0f}).",'Provider-defined paid activity or fee economics shifted; inspect one-offs and metric scope. No assumed token-holder entitlement.')
   except Exception as e:errors[key]=str(e);failed_metrics.add(key) # Prior observation AND source time remain untouched.
  a['dataAvailable']=a['coverage']=sum(finite(a.get(k,{}).get('current')) for k in KINDS)
  a['metricFreshness']={}
  for k in ['market',*KINDS]:
   stamp=a['market'].get('last_updated') if k=='market' else a.get(k,{}).get('asOf');age=(now-dt.datetime.fromisoformat(stamp.replace('Z','+00:00'))).total_seconds()/3600 if stamp else None
   a['metricFreshness'][k]={'asOf':stamp,'ageHours':age,'stale':age is not None and age>48,'missing':stamp is None}
  chosen=next((k for k in ['tvl','fees','stables','revenue'] if len(a.get(k,{}).get('history',[]))>1),None)
  a['visual']={'sparklineMetric':chosen,'sparkline':a[chosen]['history'] if chosen else [],'sourceAsOf':a[chosen].get('asOf') if chosen else None,'availabilityGauge':{'count':a['dataAvailable'],'total':4}}
  a['gapObservations']=[];p=a.get('priceContext',{});ps=p.get('asOf');pf=ps and now.timestamp()-dt.datetime.fromisoformat(ps.replace('Z','+00:00')).timestamp()<=172800
  for k in ['tvl','stables','fees']:
   v=a.get(k,{}).get('change30d');ret=p.get('change30d');fresh=not a['metricFreshness'].get(k,{}).get('stale',True)
   if pf and fresh and finite(v) and finite(ret) and abs(v)>=5 and abs(ret)>=5 and v*ret<0:a['gapObservations'].append({'metric':k,'change30d':v,'priceChange30d':ret,'fundamentalAsOf':a[k]['asOf'],'priceAsOf':ps,'source':urls.get(a['symbol']+':'+k),'priceSource':p.get('source')})
 backdrop=copy.deepcopy(old.get('backdrop',seed['backdrop']))
 try:
  series=parse_series(raw.get('global_stables'),'stables',day);backdrop['stablecoins']=metric(series,'stables',now)[0];succeeded+=1
 except Exception as e:errors['global_stables']=str(e)
 fng=raw.get('fng',{});fng=fng.get('data') if isinstance(fng,dict) else None
 if isinstance(fng,list) and fng and all('timestamp' in x and 'value' in x for x in fng):
  backdrop['fng']=fng;succeeded+=1;value=int(fng[0]['value']);stamp=int(fng[0]['timestamp'])
  if now.timestamp()-stamp>172800:errors['fng']='Mood observation is over 48h old; prior alert retained'
  if now.timestamp()-stamp<=172800 and (value<=20 or value>=80):alert_checks.append({'id':'BTC backdrop:fear-greed','asset':'BTC backdrop','rule':'fear-greed','severity':'Info','time':now.isoformat(),'change':f'Fear & Greed {value}/100: {fng[0].get("value_classification","")}.','why':'Extreme crowd mood, not a directional or timing signal.','source':'https://api.alternative.me/fng/?limit=91'})
 else:errors['fng']='Missing valid mood history; prior observations retained'
 # Failed/stale feeds are not evidence a prior alert resolved.
 for old_alert in old.get('numericAlerts',[]):
  k=old_alert.get('rule','').removesuffix('7d');key=old_alert.get('asset','')+':'+k
  if key in failed_metrics or (old_alert.get('rule')=='fear-greed' and 'fng' in errors):alert_checks.append({**old_alert,'unverified':True})
 if not succeeded:raise RuntimeError('No valid new observations; prior numeric file retained')
 result={'schemaVersion':1,'refreshedAt':now.isoformat(),'assets':assets,'backdrop':backdrop,'numericAlerts':list({x['id']:x for x in alert_checks}.values()),'sourceFailures':[key+': '+error for key,error in sorted(errors.items())]}
 # Fail closed on any accidental editorial write or schema leakage.
 assert seed_path.read_bytes()==seed_bytes
 assert not any(k in result for k in ['news','events','catalysts','risks','thesis','alerts'])
 tmp=numeric_path.with_suffix('.tmp');tmp.write_text(json.dumps(result,indent=2,allow_nan=False)+'\n');tmp.replace(numeric_path)
 print(f'Numeric sources refreshed: {succeeded}; failed/retained: {len(errors)}; checks tripped: {len(result["numericAlerts"])}')
 return result
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--data-dir',type=pathlib.Path,default=pathlib.Path(__file__).resolve().parents[1]/'data');refresh(parser.parse_args().data_dir)
