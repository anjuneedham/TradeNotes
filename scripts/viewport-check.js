const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); let bad = 0, n = 0;
  for (const [w, h] of [[390, 844], [820, 1180], [1280, 900]]) { const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
    for (const u of ['/', '/pricing', '/learn', '/login', '/signup', '/legal/terms', '/legal/subscription']) { await p.goto('http://localhost:3111' + u);
      const o = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth); n++; if (o) { bad++; console.log('OVERFLOW', w, u); } } }
  console.log(`${n - bad}/${n} page×viewport combinations without horizontal scroll`); await b.close(); })();
