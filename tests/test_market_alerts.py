import ast,datetime as dt,unittest
from zoneinfo import ZoneInfo
import pathlib
ROOT=pathlib.Path('/workspace/crypto-health')
mod=ast.parse((ROOT/'refresh.py').read_text());ns={'dt':dt,'TZ':ZoneInfo('America/Chicago')}
body=[n for n in mod.body if (isinstance(n,ast.FunctionDef) and n.name=='merge_market_alerts') or (isinstance(n,ast.Assign) and getattr(n.targets[0],'id','') in ('MARKET_FIELDS','SEVERITY_RANK'))]
exec(compile(ast.Module(body=body,type_ignores=[]),'market','exec'),ns);merge=ns['merge_market_alerts']
NOW=dt.datetime(2026,11,7,20,tzinfo=ZoneInfo('America/Chicago'))
def item(i,sev='High',date='2026-11-07T10:00:00Z',title=None,**kw):
 d=dict(id=i,title=title or 'Event '+i,severity=sev,scope='market',date=date,summary='s',why_it_matters='w',source_url='https://example.com/'+i,verified=True);d.update(kw);return d
class MarketAlertTests(unittest.TestCase):
 def test_order_and_tags(self):
  out,_=merge([item('a','Info'),item('b','High','2026-11-06T10:00:00Z'),item('c','High'),item('d','Medium')],{},NOW)
  self.assertEqual([a['id'] for a in out],['c','b','d','a']);self.assertTrue(all(a['scope']=='market' and a['asset']=='Market-wide' for a in out))
 def test_dedupe_by_id_title_and_watchlist(self):
  out,_=merge([item('a'),item('a'),item('b',title='EVENT  a'),item('w')],{},NOW,watch_ids=['w'])
  self.assertEqual([a['id'] for a in out],['a'])
 def test_unverified_old_future_bad_rejected(self):
  out,_=merge([item('u',verified=False),item('o',date='2026-11-01T00:00:00Z'),item('f',date='2026-11-10T00:00:00Z'),item('s',severity='Critical'),item('h',source_url='javascript:x'),{'id':'x'}],{},NOW)
  self.assertEqual(out,[])
 def test_cooldown_24h(self):
  out,state=merge([item('a')],{},NOW);self.assertTrue(out[0]['new'])
  out,state=merge([item('a')],state,NOW+dt.timedelta(hours=23));self.assertFalse(out[0]['new'])
  out,state=merge([item('a')],state,NOW+dt.timedelta(hours=25));self.assertTrue(out[0]['new'])
 def test_empty(self):
  self.assertEqual(merge([],{},NOW)[0],[])
if __name__=='__main__':unittest.main()
