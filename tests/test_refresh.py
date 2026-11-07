import copy, datetime as dt, hashlib, importlib.util, json, pathlib, tempfile, unittest
from zoneinfo import ZoneInfo
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('refresh_numeric',ROOT/'scripts/refresh_numeric.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class RefreshTests(unittest.TestCase):
 def prepare(self,tmp):
  d=pathlib.Path(tmp)
  for f in ['page-data.json','numeric-data.json']:(d/f).write_bytes((ROOT/'data'/f).read_bytes())
  return d
 def test_all_fail_retains_every_byte(self):
  with tempfile.TemporaryDirectory() as tmp:
   d=self.prepare(tmp);before={p.name:p.read_bytes() for p in d.iterdir()}
   def fail(url):raise RuntimeError('offline test')
   with self.assertRaises(RuntimeError):m.refresh(d,fetch=fail)
   for name,content in before.items():self.assertEqual((d/name).read_bytes(),content)
 def test_partial_success_preserves_curated_and_failed_prices(self):
  with tempfile.TemporaryDirectory() as tmp:
   d=self.prepare(tmp);seed=(d/'page-data.json').read_bytes();old=json.loads((d/'numeric-data.json').read_text())
   now=dt.datetime.now(ZoneInfo('America/Chicago'));day=int(now.timestamp())//86400*86400
   observations=[{'date':str(day-i*86400),'totalCirculatingUSD':{'peggedUSD':100000000+i}} for i in range(1,40)]
   def fetch(url):
    if url.endswith('stablecoincharts/all'):return observations
    raise RuntimeError('offline test feed failure')
   result=m.refresh(d,fetch=fetch)
   self.assertEqual((d/'page-data.json').read_bytes(),seed)
   for old_a,new_a in zip(old['assets'],result['assets']):
    self.assertEqual(old_a['market'],new_a['market']);self.assertEqual(old_a['priceContext'],new_a['priceContext'])
    self.assertNotIn('thesis',new_a);self.assertNotIn('riskFlags',new_a)
   self.assertTrue(all(a.get('unverified') for a in result['numericAlerts']))
 def test_missing_flow_days_suppress_comparisons_and_chart(self):
  now=dt.datetime.now(ZoneInfo('America/Chicago'));day=int(now.timestamp())//86400*86400
  history=[[day-i*86400,100] for i in range(90,0,-1) if i!=4]
  value,_=m.metric(history,'fees',now)
  self.assertIsNone(value['change7d']);self.assertEqual(value['history'],[])
 def test_missing_stablecoin_total_is_not_zero(self):
  now=dt.datetime.now(ZoneInfo('America/Chicago'));day=int(now.timestamp())//86400*86400
  with self.assertRaises(ValueError):m.parse_series([{'date':day-86400}], 'stables',day)
  self.assertEqual(m.parse_series([{'date':day-86400,'totalCirculatingUSD':{'peggedUSD':0}}], 'stables',day)[0][1],0)
 def test_genuine_zero_is_preserved(self):
  now=dt.datetime.now(ZoneInfo('America/Chicago'));day=int(now.timestamp())//86400*86400
  history=[[day-i*86400,0] for i in range(90,0,-1)]
  value,_=m.metric(history,'revenue',now)
  self.assertEqual(value['current'],0);self.assertEqual(len(value['history']),31);self.assertIsNone(value['change7d'])
if __name__=='__main__':unittest.main()
