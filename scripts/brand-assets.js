// Regenerates James's profile art into public/brand (SVG masters + PNG exports). Run: node scripts/brand-assets.js
const { chromium } = require("playwright");
const fs = require("node:fs");
const J = (fg, bg, ac) => `<g fill="none" stroke="${fg}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><circle cx="60" cy="26" r="17" fill="${bg}"/><circle cx="55" cy="28" r="1.8" fill="${fg}" stroke="none"/><circle cx="66" cy="28" r="1.8" fill="${fg}" stroke="none"/><path d="M53 32q7 6 14 0" stroke-width="3"/><path d="M60 43v44M60 87l-17 33M60 87l17 33"/><rect x="44" y="64" width="34" height="26" rx="3" fill="${ac}" stroke="${ac}"/><path d="M61 64v26" stroke="${bg}" stroke-width="2"/><path d="M60 56L50 70M60 56L76 70"/><path d="M82 58l-12 12" stroke="${fg}" stroke-width="3"/></g>`;
const FG = "#e6edf3", BG = "#0b0f14", AC = "#3b82f6";
// Avatar: square; James sits well inside the centre so circular crops (YouTube, Instagram, TikTok, X) never clip him.
const avatar = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800"><rect width="800" height="800" fill="${BG}"/><g transform="translate(180 130) scale(3.6)">${J(FG, BG, AC)}</g></svg>`;
// Banner: 2560x1440 with the safe area (1546x423, centred) holding everything that matters.
const banner = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2560 1440" width="2560" height="1440"><rect width="2560" height="1440" fill="${BG}"/><g transform="translate(850 520) scale(2.6)">${J(FG, BG, AC)}</g><text x="1260" y="680" font-family="Inter,Helvetica,Arial,sans-serif" font-size="110" font-weight="700" fill="${FG}">James writes</text><text x="1260" y="800" font-family="Inter,Helvetica,Arial,sans-serif" font-size="110" font-weight="700" fill="${FG}">his notes.</text><text x="1260" y="880" font-family="Inter,Helvetica,Arial,sans-serif" font-size="46" fill="#8b98a5">A short article or story, every day. Not financial advice.</text></svg>`;
(async () => {
  fs.mkdirSync("public/brand", { recursive: true });
  fs.writeFileSync("public/brand/james-avatar.svg", avatar); fs.writeFileSync("public/brand/james-banner.svg", banner);
  const b = await chromium.launch();
  for (const [name, svg, w, h] of [["james-avatar", avatar, 800, 800], ["james-banner", banner, 2560, 1440]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(`<body style="margin:0">${svg}</body>`); await p.screenshot({ path: `public/brand/${name}.png` }); await p.close();
  }
  await b.close(); console.log("brand assets written to public/brand");
})();
