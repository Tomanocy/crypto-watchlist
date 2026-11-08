#!/usr/bin/env python3
import json,pathlib,re
root=pathlib.Path(__file__).resolve().parents[1]
seed=json.loads((root/'data/page-data.json').read_text());numeric=json.loads((root/'data/numeric-data.json').read_text())
focus=[a for a in seed['assets'] if a['symbol']!='BTC'];assert len(focus)>=16
assert len({a['symbol'] for a in focus})==len(focus)
assert len(numeric['assets'])==len(seed['assets'])
assert all(len(a['riskFlags']['flags'])==4 and a['thesis']['sources'] for a in focus)
assert all(n['tag'] in ['Rocket','Steady','Yikes'] and n['tagReason'] for n in seed['news'])
assert not any(k in numeric for k in ['news','events','catalysts','risks','thesis','alerts'])
assert all(not any(k in a for k in ['thesis','riskFlags','catalysts']) for a in numeric['assets'])
html=(root/'index.html').read_text();js=(root/'app.js').read_text()
assert 'Not financial advice' in html and 'Not financial advice' in js
assert all(a['scope']=='market' and a['severity'] in ['High','Medium','Info'] and a['source'].startswith('http') for a in seed.get('marketAlerts',[]))
assert 'carousel.js' in html and 'all-alerts' in html
for path in ['carousel.js','styles.css','app.js','data/page-data.json','data/numeric-data.json']:assert (root/path).exists()
assert 'https://cursor.com/canvas/' not in (root/'data/page-data.json').read_text()
assert '/workspace/' not in (root/'data/page-data.json').read_text()
assert len(re.findall(r'id="coin-picker"',html))==1
assert 'chart.js' in html and (root/'chart.js').exists()
cj=(root/'chart.js').read_text();assert 'Not financial advice' in cj and 'Data unavailable' in cj
hidx=json.loads((root/'data/history/index.json').read_text())['series']
for s in [a['symbol'] for a in seed['assets']]+['ETH','GOLD','TSLA','NVDA','GOOGL']:
  if s in hidx:
    h=json.loads((root/f'data/history/{s}.json').read_text());c=h['closes'];assert c and h['source'] and h['asOf']==c[-1][0]
    assert all(c[i][0]<c[i+1][0] for i in range(len(c)-1)) and all(x[1]>0 for x in c)
assert all(r in cj for r in ["['2Y',730]","['3Y',1095]","['5Y',1825]"])
assert not re.search(r'\b(RSI|MACD|Bollinger|moving average|price target)\b',cj,re.I)
print(f'Validated: {len(focus)} focus coins + BTC, curated/numeric separation, public-safe export, news tags, local asset paths and disclaimers.')
