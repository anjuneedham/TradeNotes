// Asks real Chromium (not a guess) whether the signed-in quick-log page is installable: loads the manifest and prints the browser own installability errors.
// Needs a running app (BASE_URL, default http://localhost:3111) and a virtual display:  xvfb-run -a node scripts/check-installable.js
// (Headless Chromium and incognito contexts never load manifests, so this uses a persistent profile and a headed browser.) Exit 1 on any error.
const { chromium } = require("playwright");
const BASE = process.env.BASE_URL || "http://localhost:3111";
const os = require("os"), fs = require("fs"), path = require("path");
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pw-profile-"));
  const ctx = await chromium.launchPersistentContext(dir, { channel: "chromium", headless: false, viewport: { width: 390, height: 844 } });
  const p = ctx.pages()[0] || await ctx.newPage();
  const email = `inst${Date.now()}@e2e.test`;
  await p.goto(BASE + "/signup");
  await p.getByLabel("Email").fill(email); await p.getByLabel("Password").fill("correct-horse-battery");
  await p.getByRole("button", { name: "Create account" }).click();
  await p.waitForURL("**/app/onboarding"); await p.getByRole("button", { name: "Continue" }).click(); await p.waitForURL(BASE + "/app");
  const cdp = await ctx.newCDPSession(p); await cdp.send("Page.enable");
  let bad = 0;
  for (const path of ["/app/quick", "/app"]) {
    await p.goto(BASE + "" + path, { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
    const link = await p.locator('link[rel=manifest]').count();
    const m = await cdp.send("Page.getAppManifest"); const r = await cdp.send("Page.getInstallabilityErrors");
    console.log(path.padEnd(11), "-> now at", p.url().replace(BASE + "", ""), "| link[rel=manifest]:", link, "| manifest:", m.url ? "loaded" : "NOT loaded", "| installability errors:", JSON.stringify(r.installabilityErrors.map((e) => e.errorId))); if (r.installabilityErrors.length || !m.url) bad++;
  }
  await ctx.close(); fs.rmSync(dir, { recursive: true, force: true });
  console.log(bad ? "NOT installable" : "installable: no errors from Chromium on the signed-in pages"); process.exit(bad ? 1 : 0);
})();
