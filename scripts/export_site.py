#!/usr/bin/env python3
"""Export existing observations + curated context; no API, GitHub, messages or Page writes."""
import argparse, copy, json, pathlib, re
ROOT=pathlib.Path(__file__).resolve().parent
NUMERIC_KEYS=['symbol','id','peer','chain','market','turnover','tradingActivity','coverage','dataAvailable','metricFreshness','priceContext','gapObservations','tvl','stables','fees','revenue','visual']
def public(value):
 if isinstance(value,dict):
  return {k:public(v) for k,v in value.items() if k not in ['endpoints','errors']}
 if isinstance(value,list):return [public(v) for v in value]
 if isinstance(value,str):
  if value.startswith('https://cursor.com/canvas/'):return ''
  return re.sub(r'/workspace/[\w/.-]+','[local refresh tooling]',value)
 return value

def export(output,source_dir=ROOT):
 source_dir=pathlib.Path(source_dir)
 out=pathlib.Path(output);out.mkdir(parents=True,exist_ok=True)
 data=json.loads((source_dir/'page-data.json').read_text());data=public(data)
 structural_path=source_dir/'structural.json'
 if structural_path.exists():data['structural']=public(json.loads(structural_path.read_text()))
 data['weeklyRecap']={'title':'Week in context · Nov 4–6, 2026','body':'Staged Binance custody recovery; tokenization distribution; Firelight cover on Lido Earn; Bittensor wallet security shipped but still gated; Algorand grant/community reset. Distribution gains and weaker fee/capital readings can coexist. This is a verified slice, not a complete week.','reviewedAt':'2026-11-07T10:18:41-06:00','sources':['https://x.com/binance/status/2118541594358104469','https://firelight.finance/articles/lido-earn-integrates-firelight-onchain-cover','https://taostats.io/docs/concepts/protocol-changes/quantum-wallets','https://algorand.co/blog/algorand-community-update']}
 data['sources']=[{'title':t,'url':u} for t,u in [('CoinGecko markets','https://www.coingecko.com/en/api'),('DefiLlama definitions','https://defillama.com/metrics'),('Global stablecoins','https://stablecoins.llama.fi/'),('Alternative.me Fear & Greed','https://alternative.me/crypto/fear-and-greed-index/'),('Sui supply schedule','https://www.sui.io/token-schedule'),('XRP escrow tracker','https://xrp-insights.com/xrp-radar/escrow'),('SEC Ripple release','https://www.sec.gov/enforcement-litigation/litigation-releases/lr-26369')]]
 (out/'page-data.json').write_text(json.dumps(data,indent=2,allow_nan=False)+'\n')
 numeric={'schemaVersion':1,'refreshedAt':data['asOfISO'],'assets':[{k:copy.deepcopy(a[k]) for k in NUMERIC_KEYS if k in a} for a in data['assets']],'backdrop':copy.deepcopy(data['backdrop']),'numericAlerts':[{k:v for k,v in a.items() if k not in ['tag','tagReason']} for a in data['alerts']],'sourceFailures':[]}
 (out/'numeric-data.json').write_text(json.dumps(numeric,indent=2,allow_nan=False)+'\n')
 print('Exported dated editorial seed and numeric overlay to',out)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--source-dir',default=str(ROOT));args=p.parse_args();export(args.output,args.source_dir)
