# Performance audit (2026-11-11)
| Check | Result | Evidence |
|---|---|---|
| Production build | Succeeds locally and on Vercel | 3 preview deployments of this branch READY (commits 288b697, d6e1174, 7ccc6c1) |
| TypeScript | 0 errors | `npx tsc --noEmit` |
| Lint | 0 errors | `npm run lint` exit 0 |
| Dependency vulnerabilities | 0 | `npm audit --omit=dev` |
| JS per page (first load) | 103 kB shared; most pages 103–108 kB; trade form 138 kB | `next build` route table |
| Marketing pages | Static (prerendered) | build: ○ landing, pricing, learn, legal |
| Local response time (prod build) | `/` 70 ms, `/pricing` 13 ms, `/login` 70 ms | curl, localhost |
| Fonts | Self-hosted IBM Plex (no third-party request) | Fable |
| Images | No raster images in UI (SVG chart) — `next/image` not used | code |
| Dashboard query, 10,000 trades (RLS on) | **55 ms** with current planner statistics | `EXPLAIN ANALYZE` as `app_user` |
| Same, immediately after a bulk insert (stale stats) | 1.7 s | measured; autovacuum ANALYZE fixes it — relevant only after a future CSV import of thousands of rows (run `ANALYZE` after imports) |
| Dashboard compute | All trades evaluated in Node per view (≤10,000 cap with notice) | Acceptable at launch; move to SQL aggregation when any account passes ~5,000 trades |
| Mobile | No horizontal scroll at 390 px on dashboard and trade form | e2e |
| Runtime errors | 0 browser JS errors across e2e | e2e "no browser JS errors" |

## Not measured
Real-device Lighthouse/Core Web Vitals on the live domain (domain not attached; `*.vercel.app` is behind Vercel login). Slow-network behaviour (pages are server-rendered with no skeletons; forms show "Saving…").

## Recommendations (none block beta)
1. Run Lighthouse on the live domain once attached.
2. Add `ANALYZE tradenotes.trades` after CSV import when that feature ships.
3. SQL aggregation for dashboard when needed (Fable H-9).
