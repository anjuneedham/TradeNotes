# SEO status — 2026-11-12 (live at tradenotes.dev, commit ef05825)
**Rating: 6.5 / 10** (was 4). Technical SEO is now complete; what remains is content and authority, which take time, plus Search Console submission.
| Area | Before | Now | Evidence |
|---|---|---|---|
| Crawl and indexing | 4 | **8** | robots.txt (blocks /app, /api, /partners/stats, auth pages), sitemap.xml (8 public pages), canonical on every public page, noindex on login/signup/app |
| On-page basics | 6 | **8** | unique title and description per page; one H1; "trading journal" in homepage intro |
| Social and rich results | 1 | **8** | Open Graph and Twitter cards with a generated 1200x630 image on every public page; JSON-LD (Organization, SoftwareApplication, FAQPage) |
| Content depth | 3 | 3 | /learn is still one page |
| Speed and mobile | 8 | 8 | ~0.2 s server response, small pages (Core Web Vitals not measured) |
| Authority | 1 | 1 | new domain, no backlinks |
CI fails if canonical, og:image, robots.txt, sitemap.xml or /og disappear.

## Owner actions
1. Google Search Console -> Add property -> Domain `tradenotes.dev` -> copy the TXT verification value; ask Claude to add it to Vercel DNS (or add it yourself); Verify; Sitemaps -> submit `https://tradenotes.dev/sitemap.xml`.
2. Bing Webmaster Tools -> import from Search Console.
3. Check a shared link preview (paste https://tradenotes.dev/pricing in WhatsApp/Slack/X) to see the card.
4. Run Google PageSpeed Insights on / and /pricing and record the scores.

## Next (content and authority)
Turn /learn into articles (what is R-multiple, expectancy, profit factor, trading journal template), broker import guides (one page per supported broker once presets ship), "journal vs spreadsheet" comparison, free calculators, directory listings, partner mentions. Keep claims truthful.

## Known content issue
`/pricing` FAQ "How does upgrading work?" still says plans are switched on by hand. Update it after the real payment test confirms automatic activation, because the FAQPage markup repeats that text.

## Public demo and share links (added 2026-11-13, Phase 3)
Rules (enforced by `src/lib/seo.ts`, `src/lib/seo.test.ts`, and the "Smoke test public pages" step in `.github/workflows/ci.yml`):
| Path | Indexed? | Why |
|---|---|---|
| `/demo`, `/demo/analytics` | **Yes**, in `sitemap.xml` (priority 0.8 and 0.6), canonical set | Real, useful pages for "trading journal demo" searches. Fictional sample data, labelled SAMPLE DATA on every page |
| `/demo/trades/<id>` | **No** (`noindex, follow`), not in the sitemap | One sample trade is thin content. Still linked from the demo and checked in CI (200 and noindex) |
| `/r/<token>` (share links) | **No** (`noindex, nofollow, noarchive` meta AND `X-Robots-Tag` header, `Cache-Control: no-store`, `Referrer-Policy: no-referrer`) | Private by design. Deliberately **not** in robots.txt: a crawler that finds a link must be able to read its noindex. Revoked, expired and unknown links are all 404 |
| `/app/quick`, `/manifest.webmanifest` | App is already disallowed; the manifest is public (200 in CI) | Home-screen install for quick-log |
CI fails if: the demo pages are not 200, any demo page lacks the text `SAMPLE DATA`, `/demo` leaves the sitemap, a demo trade page loses `noindex`, the manifest loses `start_url`, `/r/<junk>` stops being 404, or `/r/*` loses its `X-Robots-Tag`.
Linked from: the landing page hero ("See a live demo"), the landing "What you get" section, and the pricing page intro.
Owner action: after the next deploy, resubmit `https://tradenotes.dev/sitemap.xml` in Search Console (it now lists two more URLs). Do not add `/r/` to robots.txt.
