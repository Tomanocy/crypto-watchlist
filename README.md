# Crypto Watchlist Dashboard

Zero-build, public static website for a 16-coin ecosystem watchlist. Plain HTML/CSS/JS,
local JSON, no framework, CDN, wallet, account, analytics or server dependency. BTC is
market context only. Health metrics and editorial news labels are **not financial advice**,
price targets, forecasts, buy/sell instructions or investment scores.

## Local preview

```bash
cd /workspace/crypto-site
python3 -m http.server 8000 --bind 127.0.0.1
# Open http://127.0.0.1:8000/
```

Use HTTP, not file://, because the app fetches its relative JSON files. All paths are
relative so GitHub project Pages at `/crypto-watchlist/` work. No build step is needed.

## Publish later — not performed by the build

After Matthew signs into `gh` on this box and authorizes publication, run:

```bash
cd /workspace/crypto-site
gh repo create crypto-watchlist --public --source . --push
```

This creates a PUBLIC repository: code, JSON, the watchlist and reviewed commentary will
be visible to everyone, not just invited friends. No private account or portfolio data is
included. Inspect `data/` before publishing. Local favorites never leave the visitor's device.

Recommended Pages setup:
1. In the new repository, open **Settings → Pages → Build and deployment → Source →
   GitHub Actions**. Enable Actions if the account/org requires it.
2. Run **Actions → Deploy static dashboard → Run workflow**, or run
   `gh workflow run pages.yml --ref main` after Pages is configured.
3. The workflow's `actions/deploy-pages@v4` output is the authoritative published URL.
   Expect a project URL under `https://OWNER.github.io/crypto-watchlist/`; OWNER is not
   hard-coded and no live URL exists until publication succeeds.
4. Allow Actions **Read and write permissions** for the scheduled numeric JSON commits,
   subject to your repository rules. Branch protection may require adjusting that policy.

Optional CLI Pages configuration, using the repository's actual OWNER:

```bash
gh api --method POST repos/OWNER/crypto-watchlist/pages -f build_type=workflow
```

If Pages already exists, change its build source in Settings rather than re-running POST.
Branch-based `main / (root)` can serve these zero-build files too, but **use the supplied
Actions deployment for reliable scheduled publication**. A `GITHUB_TOKEN` commit does
not trigger the separate push workflow; refresh.yml explicitly uploads/deploys the site
in its own run. No personal access token or extra secret is required.

No login, remote repository creation, push or Pages deployment was performed locally.

## Files

- `index.html`, `styles.css`, `app.js`, `.nojekyll`: directly served website.
- `data/page-data.json`: reviewed editorial seed plus its dated numeric baseline.
- `data/numeric-data.json`: numeric-only overlay, the sole scheduled write target.
- `scripts/refresh_numeric.py`: standard-library public API collector.
- `scripts/export_site.py`: export curated JSON from the box, never a network/Git action.
- `scripts/validate.py`: schema/separation/public-safe export checks.
- `tests/test_refresh.py`: offline failure retention and editorial immutability tests.
- `tests/smoke.cjs`: optional jsdom runtime/interaction smoke tests.
- `.github/workflows/pages.yml`: push/manual explicit Pages deployment.
- `.github/workflows/refresh.yml`: daily numeric refresh, scoped commit and direct deploy.

## Data updates: numeric and editorial paths stay separate

### Scheduled public numeric observations

`refresh.yml` runs daily at **10:00 UTC** (4:00 AM CST / 5:00 AM CDT), with manual dispatch
also available. GitHub schedules can be delayed and may be disabled after prolonged
inactivity in a public repo. No browser tab is a real-time data feed.

```bash
python3 scripts/refresh_numeric.py
python3 scripts/validate.py
```

Sources: CoinGecko bulk markets (`price_change_percentage=30d`), DefiLlama TVL/fees/revenue
and USD stablecoin series, Alternative.me Fear & Greed. No API keys are used. Free endpoints
can rate-limit or change. A failed feed preserves its **last good value and original source
time**, reports the failure and never inserts zero. All-source failure exits without writing.
Unavailable/missing metric days suppress affected flow comparisons/charts. A failed or
stale feed never resolves its previous numerical breach. New numeric checks are separate
from editorial alerts; no auto-authored news, legal judgment or sentiment interpretation.

The workflow checks the editorial seed checksum and stages ONLY `data/numeric-data.json`.
It never changes reviewed news, editorial alerts/tags, catalysts, risks, thesis, structural
notes or weekly recap. A concurrency group serializes deployments/refreshes; a simultaneous
outside push makes the normal fast-forward push fail safely, not overwrite work. Re-run
against latest main if needed. API errors can leave some values stale despite a successful
refresh; the website labels source ages, not just the latest run time.

### Reviewed updates from the box routine

Existing source: `/workspace/crypto-health/`. After the approved routine reviews sources
and updates curated files / numerical snapshots:

```bash
python3 /workspace/crypto-health/refresh.py --derive-only
python3 /workspace/crypto-health/refresh.py --export-site /workspace/crypto-site/data
# Equivalent standalone export:
python3 scripts/export_site.py --source-dir /workspace/crypto-health --output data
python3 scripts/validate.py
# Review changes; commit/push only when authorized.
```

The exporter does not re-pull data or pretend old observations are fresh. It resets the
numeric overlay to the exported snapshot, so refresh the core/price source first when
needed. It adds structural notes and a dated weekly recap, removes private Canvas URLs
and local operational paths from public data. Digest-only event dates retain source
limitations rather than being advertised as primary-verified. Curated files remain in
crypto-health: catalysts.json, risks.json, thesis.json, news.json, structural.json, brand.json.
Weekly recap is deliberately a dated edition; review/update the exporter recap content
when replacing it. It must not be relabeled automatically as this week's reporting.

## UI and interpretation

- One page-wide coin picker drives calendars, details and news; glance tiles select it.
- Comparison remains multi-coin, with independent metric group, peer, search and sorting.
  Six visible columns per group. Favorites use localStorage, tolerate disabled storage,
  and are not a server profile or an implied recommendation.
- Healthy/Watch/Attention follow the documented rule; missing/limited coverage is neutral.
  Price is never used in triage. Stale means a PRESENT source is over 48h old.
- Alerts keep severity separate from Rocket/Steady/Yikes fundamentals interpretation.
  Fresh automated checks default to Steady unless the same reviewed snapshot applies.
  Manual incident alerts remain until a curated resolution; numeric absence is not one.
- Gap observations require opposing 30d directions, each magnitude ≥5%, both sources ≤48h.
  Stocks compare endpoints; fees compare consecutive complete 30d totals. Usage ends before
  the price window. No causal, timing, valuation or trading-interest inference.
- Sparklines/charts contain only actual observations, with independently scaled axes.
  No history means no graphic. Availability is feeds available / four, not a risk score.
- Conditional votes / tracker estimates / disabled features remain explicitly labeled.
  Undated plans stay off the month grid. Conference dates may be venue-local when hours
  were not published. All actual timestamps are formatted in America/Chicago.

## Coverage and limitations

Initial seed: core Nov 7, 2026, 9:41 AM CST; prices 10:14:48 AM CST; research 10:18 AM CST.
All 16 coins have price / 30d return / ATH distance. Nine networks have capital histories;
11 fee feeds / 10 revenue feeds include true zero values. QNT/TAO/RENDER/AXL specialized
usage is not numerically ingested. DOT is relay-only; BNKR/ONDO are application scope.
No harmonized active addresses, transactions, developer retention, full beneficial-holder
concentration, order-book depth, funding/OI, measured token sentiment, ETF flows or FRED.
Risk Unknowns are explicit; XRP escrow is not complete beneficial ownership. ONDO's Jan 17
release is outside the current 60-day calendar; FLR's figure is a weekly issuance rate,
not a cliff. Unlock estimates do not establish selling. Price data is not a recommendation.

The current curated dates/news come from the reviewed dashboard; some digest carryovers
lack a public primary URL. Source coverage is visible, not silently filled. News is not
automatically discovered by GitHub Actions. No chat notification system is hosted here.

## Tests

```bash
node --check app.js
python3 scripts/validate.py
python3 -m unittest discover -s tests -p 'test_*.py'
# With the HTTP server above running:
curl --fail http://127.0.0.1:8000/
curl --fail http://127.0.0.1:8000/data/page-data.json
curl --fail http://127.0.0.1:8000/data/numeric-data.json
# Optional DOM test dependency OUTSIDE the zero-build project:
npm install --prefix /workspace/crypto-site-test-tools jsdom
NODE_PATH=/workspace/crypto-site-test-tools/node_modules node tests/smoke.cjs http://127.0.0.1:8000/
```

jsdom tests exercise rendering and controls without screenshots. They are not a visual
browser audit, accessibility certification or proof of real GitHub deployment. CI deployment
and API behavior on GitHub-hosted runners remain untested until the first authorized publish.

## Styling and safety

Website palette from brand.json: background #0B1220, slate cards #172235, borders #2A3B52,
teal #14B8A6, gold #D4A017, text #E5EDF7, muted #A8B7CC. Semantic status/change colors are
restrained and normal copy stays neutral. System font, wrapping controls, responsive cards,
scrollable small-column tables, keyboard focus, reduced-motion handling and SVG labels.
No gradients, emojis, logos or analytics. External strings are HTML-escaped and links
allow HTTP(S) only. The Pages artifact includes only HTML/CSS/JS/.nojekyll and data JSON,
not scripts, git metadata or tests (the public repository still contains source code).

References: [custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages),
[GITHUB_TOKEN trigger behavior](https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow).

## Full-screen coin charts

Click a glance tile, a coin in the comparison table, or the single-coin header (or open `#coin=XRP`). `chart.js` lazy-loads `data/history/<SYMBOL>.json` (from `scripts/refresh_history.py`) and draws plain-SVG price (7D–5Y and Max; 5+ years via Yahoo Finance, weekly points beyond ~13 months), %-change-vs-benchmark (BTC, ETH, Gold, TSLA, NVDA, GOOGL), ratio and performance views. Neutral context only; see /workspace/crypto-health/README.md for sources and forward-fill rules.
