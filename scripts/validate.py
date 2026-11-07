#!/usr/bin/env python3
import json,pathlib,re
root=pathlib.Path(__file__).resolve().parents[1]
seed=json.loads((root/'data/page-data.json').read_text());numeric=json.loads((root/'data/numeric-data.json').read_text())
focus=[a for a in seed['assets'] if a['symbol']!='BTC'];assert len(focus)==16
assert len({a['symbol'] for a in focus})==16
assert len(numeric['assets'])==17
assert all(len(a['riskFlags']['flags'])==4 and a['thesis']['sources'] for a in focus)
assert all(n['tag'] in ['Rocket','Steady','Yikes'] and n['tagReason'] for n in seed['news'])
assert not any(k in numeric for k in ['news','events','catalysts','risks','thesis','alerts'])
assert all(not any(k in a for k in ['thesis','riskFlags','catalysts']) for a in numeric['assets'])
html=(root/'index.html').read_text();js=(root/'app.js').read_text()
assert 'Not financial advice' in html and 'Not financial advice' in js
for path in ['styles.css','app.js','data/page-data.json','data/numeric-data.json']:assert (root/path).exists()
assert 'https://cursor.com/canvas/' not in (root/'data/page-data.json').read_text()
assert '/workspace/' not in (root/'data/page-data.json').read_text()
assert len(re.findall(r'id="coin-picker"',html))==1
print('Validated: 16 focus coins + BTC, curated/numeric separation, public-safe export, news tags, local asset paths and disclaimers.')
