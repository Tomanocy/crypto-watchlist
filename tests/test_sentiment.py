import datetime as dt
import pathlib
import unittest
ROOT=pathlib.Path('/workspace/crypto-health')
# Load pure derivation functions without executing the refresh CLI or network work.
ns={}
import ast
module=ast.parse((ROOT/'refresh.py').read_text())
func=next(n for n in module.body if isinstance(n,ast.FunctionDef) and n.name=='derive_research')
exec(compile(ast.Module(body=[func],type_ignores=[]),'derive_research','exec'),{'dt':dt},ns)
derive=ns['derive_research']
NOW=dt.datetime(2026,11,7,20,tzinfo=dt.timezone(dt.timedelta(hours=-6)))
def story(tag='Rocket',url='https://example.com/1',date='Nov 6, 2026'):
 return dict(tag=tag,source=url,date=date,assets=['SOL'],tagReason='A sourced change.')
class SentimentTests(unittest.TestCase):
 def calculate(self,news):
  result=derive({'assets':[{'symbol':'SOL'}],'news':news},NOW)
  return result['assets'][0],result['researchSummary']
 def test_positive_and_duplicate_url(self):
  a,r=self.calculate([story(),story()]);self.assertEqual(a['newsSentiment']['label'],'Positive');self.assertEqual(a['newsSentiment']['storyCount'],1);self.assertEqual(r['counts']['Positive'],1)
 def test_mixed(self):
  a,_=self.calculate([story(),story('Yikes','https://example.com/2')]);self.assertEqual(a['newsSentiment']['label'],'Mixed')
 def test_neutral_negative(self):
  for tag,label in [('Steady','Neutral'),('Yikes','Negative')]:
   a,_=self.calculate([story(tag)]);self.assertEqual(a['newsSentiment']['label'],label)
 def test_old_future_missing_and_invalid_dates(self):
  for date in ['Oct 30, 2026','Nov 8, 2026','','invalid']:
   a,_=self.calculate([story(date=date)]);self.assertEqual(a['newsSentiment']['label'],'Not enough data')
 def test_inclusive_range_and_seven_day_boundary(self):
  for date in ['Nov 5–6, 2026','Nov 1, 2026','2026-11-06']:
   a,_=self.calculate([story(date=date)]);self.assertEqual(a['newsSentiment']['storyCount'],1)
  a,_=self.calculate([story(date='Oct 31, 2026')]);self.assertEqual(a['newsSentiment']['storyCount'],0)
 def test_missing_source_and_other_asset(self):
  n=story();n['assets']=['XRP'];a,_=self.calculate([story(url=''),n]);self.assertEqual(a['newsSentiment']['label'],'Not enough data')
if __name__=='__main__':unittest.main()
