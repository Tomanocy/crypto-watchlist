#!/usr/bin/env python3
"""Merge reviewed expanded editorial content into data/page-data.json (curated fields only)."""
import json, pathlib, sys, datetime
root = pathlib.Path(__file__).resolve().parents[1]
src = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/workspace/crypto-health/expanded_content.json')
c = json.loads(src.read_text()); page_p = root / 'data/page-data.json'; d = json.loads(page_p.read_text())
now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-6))).isoformat(timespec='seconds')
TAGS = {'Rocket', 'Steady', 'Yikes'}
if c.get('news'):
    news = []
    for i, n in enumerate(c['news']):
        if n.get('tag') not in TAGS or not n.get('tagReason') or not n.get('title'): continue
        srcs = [s for s in n.get('sources', []) if str(s.get('href', '')).startswith('http')]
        if not srcs: continue
        news.append({**n, 'id': n.get('id') or f'digest-{i}', 'sources': srcs, 'source': srcs[0]['href'], 'tagReviewedAt': n.get('tagReviewedAt') or now, 'assets': n.get('assets') or []})
    if news: d['news'] = news
if c.get('marketAlerts') is not None:
    d['marketAlerts'] = [a for a in c['marketAlerts'] if a.get('severity') in ('High','Medium','Info') and str(a.get('source','')).startswith('http') and a.get('scope') == 'market']
    d['marketAlertsReviewedAt'] = now
for a in d['assets']:
    k = c.get('coins', {}).get(a['symbol'])
    if not k: continue
    if k.get('overview'): a['overview'] = k['overview']
    if k.get('researchSummary'): a['researchSummary'] = k['researchSummary']
    if k.get('sentiment'):
        ns = a.get('newsSentiment') or {}
        a['newsSentiment'] = {**ns, 'label': k['sentiment'], 'asOf': now, 'sources': [u for u in (k.get('sources') or ns.get('sources') or []) if str(u).startswith('http')]}
cat = d.setdefault('catalysts', {}).setdefault('items', [])
seen = {(e.get('asset'), e.get('date'), (e.get('title') or '').lower()) for e in cat}
for sym, k in (c.get('coins') or {}).items():
    for e in k.get('catalysts') or []:
        if e.get('date') and len(str(e['date'])) > 10: e = {**e, 'time': e['date'], 'date': str(e['date'])[:10]}
        key = (sym, e.get('date'), (e.get('title') or '').lower())
        if not e.get('date') or not str(e.get('source', '')).startswith('http') or key in seen: continue
        seen.add(key); cat.append({'id': f"{sym.lower()}-{e['date']}-{len(cat)}", 'asset': sym, 'date': e['date'], 'title': e['title'], 'source': e['source'], 'status': e.get('status', 'Scheduled; verify closer to date'), 'time': e.get('time', 'Time unspecified'), 'reviewedAt': now})
cat.sort(key=lambda e: e.get('date') or '9999')
if c.get('weeklyRecap', {}).get('body'): d['weeklyRecap'] = c['weeklyRecap']
if c.get('researchSummary', {}).get('body'):
    d['researchSummary'] = {**d.get('researchSummary', {}), **c['researchSummary'], 'asOf': now}
page_p.write_text(json.dumps(d, indent=2, allow_nan=False) + '\n')
print('Merged', len(d['news']), 'news,', len(d.get('marketAlerts', [])), 'market alerts,', sum(1 for a in d['assets'] if a.get('overview')), 'coin overviews')
