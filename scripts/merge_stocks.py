#!/usr/bin/env python3
"""Merge researched stock content (company/product news, events) into data/page-data.json.
Stocks are a separate group: no price calls, crypto-only metrics are N/A."""
import json, sys, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/workspace/crypto-health/stocks_content.json')
TAGS = {'Rocket', 'Steady', 'Yikes'}
def main():
    p = ROOT / 'data/page-data.json'; d = json.loads(p.read_text()); s = json.loads(SRC.read_text())
    syms = [x['symbol'] for x in s['stocks']]
    old = {x['symbol']: x for x in d.get('stocks', [])}
    stocks = []
    for x in s['stocks']:
        stocks.append({**old.get(x['symbol'], {}), 'kind': 'stock', 'symbol': x['symbol'], 'name': x['name'], 'sector': x.get('sector', ''),
            'overview': x.get('overview', ''), 'researchSummary': x.get('researchSummary', ''), 'cryptoLink': x.get('cryptoLink', ''),
            'newsSentiment': {'label': x.get('sentiment') or 'Mixed', 'asOf': s.get('asOfISO')},
            'catalysts': [c for c in x.get('catalysts', []) if c.get('title')],
            'riskFlags': {'flags': x.get('riskFlags', [])}, 'sources': x.get('sources', [])})
    d['stocks'] = stocks
    # news: replace prior stock-only items, keep crypto items
    news = [n for n in d.get('news', []) if not set(n.get('assets', [])) <= set(syms)]
    for n in s.get('news', []):
        if n.get('tag') in TAGS and any(str(src.get('href', '')).startswith('http') for src in n.get('sources', [])):
            news.append({**n, 'kind': 'stock', 'id': n.get('id') or f"stock-{len(news)}", 'source': n.get('source') or n['sources'][0]['href'], 'tagReviewedAt': n.get('tagReviewedAt') or s.get('generatedAt')})
    order = {'Today': 0, 'Yesterday': 1, 'Last 3 days': 2}
    news.sort(key=lambda n: order.get(n.get('section'), 3))
    d['news'] = news
    items = [e for e in d.get('catalysts', {}).get('items', []) if e.get('asset') not in syms]
    for x in stocks:
        for i, c in enumerate(x['catalysts']):
            date = str(c.get('date') or '')
            e = {'id': f"stk-{x['symbol']}-{i}", 'asset': x['symbol'], 'title': c['title'], 'status': c.get('status', 'Scheduled'), 'source': c.get('source'), 'kind': 'stock'}
            if len(date) > 10: e['time'] = date; date = date[:10]
            if re.fullmatch(r'\d{4}-\d{2}-\d{2}', date): e['date'] = date
            if c.get('end'): e['end'] = str(c['end'])[:10]
            if c.get('time'): e['time'] = c['time']
            items.append(e)
    items.sort(key=lambda e: (e.get('date') or '9999', e['asset']))
    d.setdefault('catalysts', {})['items'] = items
    p.write_text(json.dumps(d, indent=2, allow_nan=False) + '\n')
    print(f'Merged {len(stocks)} stocks, {len(s.get("news", []))} stock news, {sum(len(x["catalysts"]) for x in stocks)} stock events')
if __name__ == '__main__': main()
