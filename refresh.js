'use strict';
// Big refresh button: pulls live public market data into this browser, then re-reads the latest published content.
(() => {
  const IDS_URL = ids => 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=' + encodeURIComponent(ids.join(',')) + '&per_page=100&page=1&price_change_percentage=30d';
  const fmt = d => new Intl.DateTimeFormat('en-US', {timeZone:'America/Chicago', hour:'numeric', minute:'2-digit', timeZoneName:'short'}).format(d);
  async function refresh(btn, status) {
    const dash = window.__dash; if (!dash) return;
    btn.disabled = true; btn.classList.add('spinning'); status.textContent = 'Refreshing live market data…';
    try {
      const ids = dash.data.assets.map(a => a.id).filter(Boolean);
      const r = await fetch(IDS_URL(ids), {cache:'no-store'});
      if (!r.ok) throw Error(r.status === 429 ? 'the price source is rate-limiting; try again in a minute' : 'HTTP ' + r.status);
      const n = dash.liveApply(await r.json());
      let note = '';
      try {
        const p = await fetch('data/page-data.json', {cache:'no-store'});
        if (p.ok) { const fresh = await p.json(); if (fresh.asOfISO && fresh.asOfISO !== dash.data.asOfISO) note = ' Newer news is published; reload the page to see it.'; }
      } catch {}
      status.textContent = `Updated ${n} coins with live prices at ${fmt(new Date())}.${note} News and alerts publish every morning around 4 AM CT.`;
    } catch (e) {
      status.textContent = 'Live refresh failed: ' + e.message + '. The dated snapshot is still shown.';
    } finally { btn.disabled = false; btn.classList.remove('spinning'); }
  }
  function init() {
    const btn = document.getElementById('refresh-live'), status = document.getElementById('refresh-status');
    if (!btn || btn.dataset.bound) return; btn.dataset.bound = '1';
    btn.addEventListener('click', () => refresh(btn, status));
  }
  if (window.__dashboardReady) init(); else document.addEventListener('dashboard-ready', init);
})();
