#!/usr/bin/env python3
"""Fetch daily close history into data/history/<SYMBOL>.json. Never fabricates.
Crypto: CoinGecko market_chart (free, <=365 days). Gold/TSLA/NVDA/GOOGL: Stooq daily CSV,
fallback Yahoo Finance chart API. Stocks/gold are forward-filled over weekends/holidays
(flag ffill:true); crypto trades daily so no fill is applied. A failed source keeps the
previous file (if any) and records the error; nothing is invented."""
import csv,io,json,pathlib,sys,time,urllib.request,datetime as dt
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'data/history'
UA={'User-Agent':'crypto-watchlist-history/1.0 (+static dashboard)'}
def get(url,tries=5):
    delay=4
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers=UA),timeout=30) as r:return r.read().decode()
        except Exception as e:
            err=e
            if i<tries-1:time.sleep(delay);delay=min(delay*2,60)
    raise err
def iso(ts):return dt.datetime.fromtimestamp(ts,dt.timezone.utc).date().isoformat()
def dedupe(rows):
    m={}
    for d,c in rows:
        if c is not None and c>0:m[d]=c
    return sorted(m.items())
def ffill(rows,end=None):
    if not rows:return rows
    m=dict(rows);d=dt.date.fromisoformat(rows[0][0]);end=end or dt.date.fromisoformat(rows[-1][0]);out=[];last=None
    while d<=end:
        k=d.isoformat();last=m.get(k,last);out.append((k,last));d+=dt.timedelta(days=1)
    return out
def crypto(cid):
    j=json.loads(get(f'https://api.coingecko.com/api/v3/coins/{cid}/market_chart?vs_currency=usd&days=365&interval=daily'))
    rows=dedupe([(iso(t/1000),p) for t,p in j['prices']])
    return rows,f'https://www.coingecko.com/en/coins/{cid}','CoinGecko market_chart (daily, USD)'
def stooq(sym):
    t=get(f'https://stooq.com/q/d/l/?s={sym}&i=d')
    rows=[(r['Date'],float(r['Close'])) for r in csv.DictReader(io.StringIO(t)) if r.get('Close') not in (None,'','N/D')]
    if len(rows)<20:raise ValueError('stooq empty/limited: '+t[:80])
    return dedupe(rows)
def yahoo(sym):
    j=json.loads(get(f'https://query1.finance.yahoo.com/v8/finance/chart/{sym}?range=2y&interval=1d'))
    r=j['chart']['result'][0];cl=r['indicators']['quote'][0]['close']
    return dedupe([(iso(t),c) for t,c in zip(r['timestamp'],cl)])
TRAD={'GOLD':('xauusd','GC=F','Gold spot USD/oz (Stooq XAUUSD)','Gold futures front month (Yahoo GC=F)'),
      'TSLA':('tsla.us','TSLA','Tesla (Stooq TSLA.US)','Tesla (Yahoo Finance)'),
      'NVDA':('nvda.us','NVDA','Nvidia (Stooq NVDA.US)','Nvidia (Yahoo Finance)'),
      'GOOGL':('googl.us','GOOGL','Alphabet Class A (Stooq GOOGL.US)','Alphabet Class A (Yahoo Finance)')}
def trad(key):
    s,y,ls,ly=TRAD[key];errs=[]
    try:return stooq(s),f'https://stooq.com/q/?s={s}',ls,errs
    except Exception as e:errs.append(f'stooq: {e}')
    rows=yahoo(y);return rows,f'https://finance.yahoo.com/quote/{y}',ly,errs
def write(sym,rows,url,label,kind,errs,filled):
    cut=(dt.date.today()-dt.timedelta(days=730)).isoformat();rows=[r for r in rows if r[0]>=cut]
    doc={'symbol':sym,'kind':kind,'source':label,'sourceUrl':url,'asOf':rows[-1][0],'fetchedAt':dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'),
         'ffill':filled,'first':rows[0][0],'days':len(rows),'notes':errs,'closes':[[d,round(c,10 if c<1 else 6)] for d,c in rows]}
    (OUT/f'{sym}.json').write_text(json.dumps(doc,separators=(',',':')))
def main():
    OUT.mkdir(parents=True,exist_ok=True);seed=json.loads((ROOT/'data/page-data.json').read_text())
    coins=[(a['symbol'],a['id']) for a in seed['assets']]
    if not any(s=='ETH' for s,_ in coins):coins.append(('ETH','ethereum'))
    if not any(s=='BTC' for s,_ in coins):coins.append(('BTC','bitcoin'))
    status={};today=dt.date.today()
    for sym,cid in coins:
        try:rows,url,label=crypto(cid);write(sym,rows,url,label,'crypto',[],False);status[sym]={'ok':True,'days':len(rows)}
        except Exception as e:status[sym]={'ok':False,'error':str(e)[:200],'kept':(OUT/f'{sym}.json').exists()}
        time.sleep(7)
    for key in TRAD:
        try:
            rows,url,label,errs=trad(key);write(key,ffill(rows,today),url,label,'traditional',errs,True);status[key]={'ok':True,'days':len(rows),'notes':errs}
        except Exception as e:status[key]={'ok':False,'error':str(e)[:200],'kept':(OUT/f'{key}.json').exists()}
    idx={'generatedAt':dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'),'series':{}}
    for f in sorted(OUT.glob('*.json')):
        if f.name=='index.json':continue
        d=json.loads(f.read_text());idx['series'][d['symbol']]={k:d[k] for k in ('kind','source','sourceUrl','asOf','first','days','ffill')}
    idx['status']=status;(OUT/'index.json').write_text(json.dumps(idx,indent=1))
    print(json.dumps(status,indent=1))
    return 0 if sum(v['ok'] for v in status.values())>=len(status)//2 else 1
if __name__=='__main__':sys.exit(main())
