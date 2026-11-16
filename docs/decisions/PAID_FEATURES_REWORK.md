# Decision: paid tiers rework, and can one person build news, replay and broker sync for $0?
Written 2026-11-16 for the owner. **Nothing was built, no account opened, no vendor contacted, no code changed.** All web sources were read on 2026-11-16. Labels used throughout:
- **[V]** = read on the vendor's own page today. **[S]** = from a search summary or third-party page only; treat as a lead, not a fact. **[M]** = from my own memory, not checked today. **[?]** = could not verify.
- Effort = working days for one person, my estimate, not measured.

## A. One-page recommendation

**The short answer.** Two of the three capabilities can be had for $0, but only in a narrow form. None of them is the best next use of your time. The feature a prop-firm challenge trader will pay for needs no outside data at all: a **challenge rules tracker** built on trades already in the journal.

| # | Capability | Call | What exactly | Cost to you | Effort |
|---|---|---|---|---|---|
| 1 | **Economic calendar** | **Build (narrow)** | A table of high-impact scheduled events (CPI, jobs report, FOMC, etc.) from official publisher schedules, shown on the calendar and used to tag trades taken near news. **No news headlines.** | $0, or $9.99/year if you take a small vendor feed | 2 to 4 days |
| 2 | **Bar-by-bar replay** | **Skip licensed data. Build "bring your own bars" later.** | User uploads their own candle file; replay runs in their browser. No data is supplied by TradeNotes. | $0 | 5 to 8 days |
| 3 | **Broker auto-sync** | **Skip aggregators. Build one direct connection only when asked for.** | First verify the existing importers with real prop-firm exports. Then, if demand shows, a TopstepX (ProjectX) key sync or cTrader Open API sync. | $0 to you | 0 now; 5 to 10 days per connection later |

**Why not "buy" anything:**
- No free market-data or news tier I found allows showing the data to paying customers. Every one that states a licence says personal use, or sells display rights at $499 to $1,750+ a month.
- The one aggregator with public pricing (SnapTrade, $100/month + $1 to $2 per connected user [V]) does not list Tradovate, NinjaTrader, Rithmic, MetaTrader, cTrader or Topstep on the pages I read [V]. It would sync brokers your target customers do not use.
- Tradovate's own rule is that prop-firm and evaluation accounts are not eligible for API access [S, quoting Tradovate's help centre; my direct fetch of the page failed].

**Recommended order (about 3 to 4 weeks of build, $0 new recurring cost):**
1. **Verify importers with real prop exports** (Tradovate, NinjaTrader, TopstepX, MT5, cTrader). 2 to 3 days once you have files. Biggest scorecard mover (section F) and a precondition for any sync.
2. **Challenge rules tracker** + rule-break cost in challenge terms + challenge fees vs payouts. 5 to 7 days. This is what makes Standard worth $12 to a challenge trader.
3. **Economic calendar + news-window tagging.** 2 to 4 days.
4. **Failed/passed challenge post-mortem** and "would these trades have passed firm X?" (re-runs your logged trades against a rule set; needs no market data). 3 to 4 days.
5. **Bring-your-own-bars replay** (Premium). 5 to 8 days. Only after 1 to 4.
6. **One direct sync**, only if 10+ paying users ask for the same platform. Send the free partner-access emails now (section E).

**What changed since the three memos (checked, not repeated):**
- `MEMO_BROKER_SYNC.md` (no-go): **still holds, and is stronger.** SnapTrade prices are unchanged [V]. The memo judged fit against forex; against prop-firm platforms the fit is worse. New in this document: three $0 direct routes the memo did not consider (TopstepX key, cTrader Open API, MT5 push script).
- `MEMO_REPLAY_DATA.md` (do not buy; own-CSV first): **still holds.** The prop-firm focus adds CME futures to the wish list, which is the most expensive data category (section C). I did not re-check TraderMade or Tiingo; those rows in the memo are two days old.
- `MEMO_AI_SUMMARIES.md` (opt-in Premium pilot): **partly overtaken.** The AI Coach has since shipped on every plan (`src/lib/coach.ts`, `PLANS.*.aiBudgetCents`). Its open items still matter: per READINESS_REVIEW (2026-11-16) the coach has never called the real Claude API in production, and the memo's question about Anthropic's retention terms is still unanswered in the docs.
- `FEATURE_ROADMAP.md` is stale: it lists bar-replay as "P1 (week 1)" and the "Pro anchor". `UNIT_ECONOMICS.md` is stale in two rows: it names Neon (the app runs on Supabase) and budgets $50 to $200/month for market data at 100 users, which buys no display licence I could find.

## B. Reworked tiers
Prices, trade limits and the founding offer stay as they are in `src/lib/plans.ts`. The change is what each tier is *for*. Status: **Built** = in `origin/main` today (checked in `plans.ts`, `plan-features.ts`, `src/app/app/*`); **<1 wk** = buildable by one person in under a week; **Blocked** = needs something you do not have.

Checked in code: there is **no challenge, prop-firm, drawdown-limit or daily-loss-limit field anywhere** in `src/` or `db/paste/`. The only prop-firm mention in the product is a placeholder ("e.g. Prop firm challenge") in `NewAccountForm.tsx` and two marketing articles.

### Free ($0, 30 trades, 1 account): "see if you are on track"
| Feature | Why it is here | Status |
|---|---|---|
| Journal, dashboard, analytics, filters, 1 insight, 3 coach questions, share links | Unchanged | Built |
| **One challenge tracker, rules typed in by hand** (profit target, max loss, daily loss limit, minimum days) | The hook. A challenge usually runs past 30 trades, so the cap arrives mid-challenge, which is the moment to ask for $12. **Owner decision:** giving the basic tracker away is my recommendation, not a tested fact | <1 wk (part of the 5 to 7 days) |

### Standard ($12): "pass the challenge"
| Feature | The one reason a challenge trader pays | Status |
|---|---|---|
| **Challenge rules tracker with firm presets**: static and end-of-day trailing drawdown, daily loss limit, profit target, minimum days, consistency rule; shows buffer left in dollars | A challenge costs real money to retake; knowing "you have $412 of drawdown left" is worth more than $12 | <1 wk for closed-trade rules. **Intraday trailing drawdown is Blocked**: it depends on open-trade equity highs, which a journal does not have. Show it as "estimate from closed trades" or leave it out |
| **Rule-break cost** in challenge terms ("oversizing cost you $640 = 32% of your drawdown") | Turns a vague habit into a number that threatens the account | Mistake cost and playbook adherence: Built. Challenge framing: <1 wk (1 to 2 days) |
| **Economic calendar + news-window tag** ("7 trades within 5 minutes of high-impact news: -$310") | Many firms restrict news trading [S; rules differ per firm and account type, not checked]. The trader sees whether news trades hurt or broke a rule | <1 wk (2 to 4 days) |
| **Challenge fees vs payouts** (what you paid firms, what they paid you) | Answers "am I actually profitable at this?" | <1 wk (1 to 2 days) |
| Broker import (13 formats), 2,000 trades, 2 accounts | Removes typing | Built; **every fixture is synthetic** (READINESS_REVIEW). Treat as unproven until step 1 |
| Calendar, reviews, playbook, TradeNotes Score, 3 insights, AI Coach about 130 questions | The daily routine | Built. Coach untested against the real API in production. Review reminders: code exists, live only when `CRON_SECRET` is set |
| Screenshots 500 MB | Evidence for reviews | Built; real bucket unverified |

### Premium ($24): "run several accounts and learn from the ones you lose"
| Feature | The one reason | Status |
|---|---|---|
| **Up to 10 accounts, each with its own tracker, on one board** | Funded traders run several evaluations and funded accounts at once; 2 is not enough | Accounts: Built. Board: <1 wk (1 to 2 days) |
| **Challenge post-mortem** when an account is marked failed or passed: which rule ended it, the trades that did it, what it cost, filled into a review | A failed challenge is the most expensive lesson they buy; this is the receipt | <1 wk (2 to 3 days; reuses reviews and the coach) |
| **"Would I have passed?"**: re-run logged trades against another firm's rules | Choose the next firm on evidence, before paying its fee | <1 wk (2 days after the tracker) |
| **Replay on your own bars** | Practise the setup that failed, without supplied data | 5 to 8 days; not Blocked, but just over a week |
| Strategy comparison, manual backtest log, all insights, unlimited trades, AI Coach about 260 questions, 2 GB screenshots | Unchanged | Built |
| Licensed chart replay (data supplied by TradeNotes) | n/a | **Blocked** (licence cost, section C) |
| Automatic broker sync | n/a | **Blocked** for Tradovate and Rithmic (partner approval); buildable for TopstepX and cTrader (section G) |

**Wording rule:** every tracker number is "based on the trades you logged". TradeNotes is not the firm's record, and a late or missing import makes it wrong. Say so on the page.

## C. Unit economics per capability
Repo assumptions (`UNIT_ECONOMICS.md`, `AFFILIATE_PROGRAM.md`): blended revenue per paying user about **$15/month after payment fees** (fees assumed about 5%; HandyPay's rate card is still unconfirmed). So **100 paying = about $1,500/month, 1,000 paying = about $15,000/month**. Two things lower this in year 1, by my arithmetic: the first 100 seats pay half (about $750/month if all 100 are founding members), and partner-referred customers cost 30% for 12 months.

| Capability, option | Monthly cost at 0 users | At 100 paying | At 1,000 paying | Share of revenue (100 / 1,000) |
|---|---|---|---|---|
| Challenge tracker, rule-break cost, post-mortem | $0 | $0 | $0 | 0% |
| Calendar from official schedules | $0 | $0 | $0 | 0% |
| Calendar via financecalendar.com Starter ($9.99/year [V]) | $0.83 | $0.83 | $0.83 | 0.06% / 0.006% |
| Replay, user's own bars, in the browser | $0 | $0 | $0 | 0% |
| Replay, licensed forex/crypto display (Twelve Data Venture $499 [S]; TraderMade Live GBP 399 per the 11-14 memo) | about $500 | about $500 | about $500 | 33% / 3.3% |
| Replay, licensed CME futures (Databento Plus $1,750 + exchange fees, annual contract [V for the plan price]) | $1,750+ | $1,750+ | $1,750+ | 117%+ / 11.7%+ |
| Broker sync, SnapTrade daily ($100 + $1 per connected user [V]); **assumes half of paying users connect** | $100 | $150 | $600 | 10% / 4% |
| Broker sync, TopstepX key (the *trader* pays Topstep $14.50 to $29/month [V]) | $0 | $0 | $0 | 0% |
| Broker sync, cTrader Open API (free [V]) | $0 | $0 | $0 | 0% |
| Broker sync, MetaApi for MT4/MT5 ($30 or $100/month plan + usage per account [S]; per-account rate **[?]**) | $30+ | unknown | unknown | cannot compute |

Reading it: every $0 row stays $0 because the cost does not grow with users (one calendar fetch a day is shared by everyone; replay runs on the user's device). The licensed rows are fixed fees that only make sense near 1,000 paying users, and even there the futures licence costs more than the feature is likely to earn. The existing AI Coach is the only per-user cost in the product (capped at $2 Standard / $4 Premium a month in `plans.ts`, up to 17% of the price if a user spends the whole allowance); the post-mortem should draw on that same allowance and add no new cap.

## D. Free infrastructure: what truly costs $0, and where it stops
| Thing | Really $0? | Ceiling |
|---|---|---|
| **Vercel** | **No.** Hobby is for non-commercial use only [S, quoting Vercel's fair-use page]; the repo already budgets Pro at $20/month. Hobby cron runs at most once a day [S, quoting Vercel docs] | Pro is your one unavoidable bill |
| **Supabase Free** | Yes | 500 MB database, 1 GB file storage, 2 projects, **paused after 1 week without activity, no automatic backups** [S, quoting supabase.com/pricing]. My rough estimate: 500 MB is several hundred thousand trades, so the limit arrives somewhere near 1,000 active users. The missing backups are the real reason to pay (about $25/month [M]) once customers do |
| **Scheduler** | Yes | The repo already runs a GitHub Actions cron (`.github/workflows/review-reminders.yml`). Enough for one calendar refresh a day. Free minutes for private repos are limited [M] |
| **Resend** | Yes | 100 emails/day, about 3,000/month (repo docs) |
| **BLS release calendar** | Yes | Official `.ics` at bls.gov/schedule/news_release/bls.ics [V]. US only (jobs, CPI, PPI). I did not read the BLS copyright page; US federal works are generally public domain [M] |
| **Fed (FOMC), ECB, BoE, ONS schedules** | Yes | Published on their sites; no single API. Typing in about 15 event types a quarter by hand is 30 minutes. Reuse terms not read today **[?]** |
| **FRED API** | Yes, with conditions [V] | Must show the notice "This product uses the FRED API but is not endorsed or certified by the Federal Reserve Bank of St. Louis" and link its terms; series marked Copyright need the owner's permission; no numeric rate limit published |
| **financecalendar.com** | Free tier is 10 requests/day, 100/month, no numbers; Starter $9.99/year gives 1,000/day [V] | Customer-facing paid apps allowed with a visible attribution link [V]. **Young vendor** (launched 2026-08-31, run by Awareness Days Ltd, no uptime promise) [V]. Use as a convenience, never as the only source |
| **cTrader Open API** | Yes: "offered for free" [V] | 50 requests/second, 5/second for history [V]. Spotware may change pricing without notice [V] |
| **TopstepX / ProjectX API** | $0 to you | The trader pays $29/month, or $14.50 with code "topstep" [V] |
| **Chart library** (TradingView Lightweight Charts) | Yes | Apache-2.0 with an attribution requirement [M] |
| **Databento $125 credit** | One-off, expires 6 months after signup [V] | Fine for your own research. Not a licence to show CME data to customers |
| **SnapTrade Build** | $0 | 5 connections; development only [V] |
| **User's own files** (CSV exports, candle files) | Yes | The ceiling is your support time, not money |

**What is never $0:** showing someone else's price data or news text to paying users.

## E. Risks
**Data licensing (highest).**
- Free tiers that say personal or non-commercial: Finnhub (free licence "Personal Use"; economic calendar is premium-only) [S, quoting Finnhub's pricing and docs pages; my fetch returned only the page title], Financial Modeling Prep ("Displaying or redistributing data sourced from FMP requires a specific Data Display and Licensing Agreement"; calendar not in the free plan) [S, quoting FMP's pricing page; direct fetch returned 403], Alpha Vantage (25 requests/day, personal) [S], Massive individual plans ("personal and non-professional use"; customer-facing display needs Business) [S, quoting massive.com/stocks].
- **Forex Factory's weekly JSON file:** undocumented, no API terms; its Notices page is reported to forbid copying or redistributing calendar schedules without written consent [S; direct fetch returned 403]. Do not use it. Asking Fair Economy, Inc. for written permission costs one email.
- **Binance public archive:** CC BY-NC-SA 4.0; commercial use needs a signed enterprise licence (Binance Vision Dataset Terms v1.0, updated 2026-08-26) [S]. **Dukascopy:** personal, non-commercial [S]. **HistData:** no licence text found **[?]**. Do not ship any of these as supplied data.
- Own-bars replay moves the risk to the user: they may upload data their source forbids re-using. Terms must say they are responsible; have the lawyer approve the sentence (already noted in the replay memo).
- News headlines: I found no free news API with a confirmed commercial display licence. Link out instead.

**Broker and prop-firm terms.**
- Tradovate: API needs a live funded account of $1,000+ and a paid add-on (about $25/month [S, third-party]); prop and evaluation accounts are excluded [S]; third-party app credentials go only to approved NinjaTrader Ecosystem partners [S, forum post about 18 months old]. Competitors do sync Apex accounts through Tradovate, so a partner route exists, but cost and waiting time are **[?]**.
- Rithmic: production access needs a conformance review; fees are set by the broker **[?]**. It is a persistent connection, a poor fit for Vercel functions.
- Topstep: private servers may "watch and record" but not trade; API not allowed on Live Funded accounts; third-party apps are "not endorsed" and at the user's own risk [V]. Whether the API returns past trades is not stated on the help page **[?]**; ask dashboardapi@topstep.com before building.
- Crypto exchange keys: Bybit keys without a bound IP expire after 90 days [S, quoting Bybit EU help]; a fixed outbound IP on Vercel is a paid Pro feature [S]. Binance has banned accounts over "unauthorized third-party tools" [S, The Block; tools not named]. Low prop-firm relevance; skip.
- A browser extension that reads the trader's own platform page stores no credentials, but breaks whenever the platform changes its page and may breach that platform's terms **[?]**.

**Credentials.** Never store a broker password. In order of safety: user-uploaded file (nothing stored) > OAuth token (cTrader) > user-generated read-only key (TopstepX). Any token must be encrypted at rest with a key held outside the database, never logged, never sent to the browser, deleted on disconnect and on account deletion, and covered by the two-user isolation checks in `scripts/verify-db.mjs`. MetaApi-style services need the trader's MetaTrader login handed to a third party: a new processor and the worst option here. The landing page says "It doesn't connect to your broker or place trades" (noted in the broker memo); that line must change the day any sync ships.

**Financial-advice wording.** The tracker reports what happened against rules the user typed in. Avoid "you should", "safe to trade", "you will pass". Use "based on the trades you logged", "estimate", "check your firm's dashboard; it is the record that counts". Firm presets are a convenience and can go out of date: show "rules last checked on <date>" and let the user edit them. Do not use firms' logos or suggest endorsement. The calendar shows scheduled events only: no forecasts presented as views, no "expect volatility" text. The coach's existing "not financial advice" line stays.

**Operational.** A solo founder cannot support broken sync at 2 a.m. Each direct connection is a standing maintenance promise; the importers are not.

## F. Gap list: why the industry score is 6.7
Scorecard rows and current scores are from READINESS_REVIEW.md (2026-11-15 table: 1.5 + 2.0 + 1.3 + 0.4 + 0.7 + 0.8 = 6.7). "Lift" is my estimate of the weighted gain.

| Row (weight) | Now | Target | What is still missing | What closes it | Lift |
|---|---|---|---|---|---|
| Data capture and import (25%) | 6 | 8 | No importer checked against a real export; no auto-sync; fees are one number; no import validation report; Thinkorswim and Tradovate exports carry no commissions | Step 1 (real exports); a validation report; later one direct sync | up to +0.5 |
| Analytics depth (25%) | 8.0 | 8 | At target by the table. Still no MAE/MFE, no saved views, no timing on real Supabase | Not a priority | 0 |
| Review and journaling (20%) | 6.5 | 8 | No goals, no free-form daily journal, no checklist in the new-trade form, reminder emails not confirmed live | The challenge tracker is "goals" for this audience; post-mortem; turn reminders on | up to +0.3 |
| Visual evidence (10%) | 4 | 8 | Screenshots never run against the real bucket; no annotations | Owner creates and tests the bucket; own-bars replay adds chart context | up to +0.3 |
| Multiple accounts (10%) | 7 | 8 | No currency conversion in the combined view; no grouping by firm or challenge status | Premium challenge board | +0.1 |
| Trust, speed, mobile (10%) | 8 | 9 | No accessibility audit, no real-phone test | A half-day each | +0.05 to +0.1 |

**Three things this table shows:**
1. Of the three capabilities you asked about, **only broker sync maps to a scorecard row** (capture). The calendar and replay are not on the scorecard; they sell Premium but will not move 6.7 by the table as written.
2. The cheapest gains are **verification, not features**: real exports (+0.5) and a working screenshot bucket (+0.2 to +0.3) cost $0 and a few days.
3. Doing everything in section A's order lands at roughly **7.8 to 8.0** by my arithmetic. The score also stays capped by what READINESS_REVIEW already lists: no completed payment, 1 real user, 0 real trades.

## G. Option tables (evidence)
Cost columns are what TradeNotes pays per month. "Prop fit" = do challenge traders trade where this works? Platform line-ups are from third-party comparisons [S]: Topstep new accounts on TopstepX (start date disputed between sources); Apex on Rithmic, Tradovate, NinjaTrader, WealthCharts; FTMO, FundedNext, The5ers on MT4/MT5 and cTrader, some with DXtrade or Match-Trader.

### G1. News and economic calendar
| Option | 0 / 100 / 1,000 users | Licence risk | Days | Prop fit | Verdict |
|---|---|---|---|---|---|
| Official schedules (BLS .ics, Fed, ECB, BoE) in your own table | $0 / $0 / $0 | Low | 2 to 4 | High: these are the events firms' news rules refer to | **Build** |
| financecalendar.com Starter | $0.83 flat | Low to medium (new vendor) | 1 | High | Optional helper |
| FRED API (release dates) | $0 | Low with the notice | 1 to 2 | Medium (US only) | Optional |
| Finnhub | Free tier unusable; paid All-in-One $3,500/month [S] | High on free | n/a | n/a | Skip |
| Financial Modeling Prep | Free: 250 calls/day, no calendar; Starter $19 to $29 [S, sources disagree]; display needs a quote-only agreement | High | n/a | n/a | Skip |
| Alpha Vantage news | Free 25/day; paid $49.99+ [S] | High (personal) | n/a | Low | Skip |
| Massive (ex-Polygon) | Business plan; price **[?]** ($999 currencies per the 11-14 memo; $1,599 to $2,499 stocks in third-party pages) | Low on Business | n/a | Low | Skip |
| Trading Economics | Calendar API reported Enterprise-only; Standard $149 to $199 [S, sources disagree] | Priced separately | n/a | High | Skip |
| Forex Factory JSON | $0 | **High** | 1 | High | **Do not use** without written consent |
| News headlines (Marketaux, NewsAPI and similar) | Free tiers about 100/day [S] | Commercial display unconfirmed **[?]** | 2 | Low | Skip; link out |

### G2. Replay data
| Option | 0 / 100 / 1,000 users | Licence risk | Days | Prop fit | Verdict |
|---|---|---|---|---|---|
| User's own bars (CSV from MT5, NinjaTrader, TradingView), replay in the browser | $0 / $0 / $0 | Low (on the user) | 5 to 8 | High: works for futures and forex alike | **Build later** |
| Link out to the replay in the trader's own charting tool | $0 | None | 0.5 | High | Do now (one line on the backtest page) |
| Databento (CME futures) | Historical is pay-per-use; $125 one-off credit; Standard $199 is personal; **external distribution starts at Plus $1,750/month, annual** [V]. "Most datasets can be redistributed after 24 hours", but rights "depend on the dataset" [V]; whether delayed CME bars shown in an app need Plus is **[?]** | Low only on Plus | 8 to 12 | High | **Skip** (ask sales the one question if curious) |
| Twelve Data | Venture "external display" $499 [S]; the 11-14 memo found the page contradicting itself | Medium | 6 to 10 | Medium (forex) | Skip |
| TraderMade, Tiingo, Massive Currencies | See MEMO_REPLAY_DATA.md; not re-checked today | n/a | n/a | Medium | Skip |
| Alpaca | Free IEX feed; redistribution terms not found **[?]** | Unknown | n/a | Low (US stocks) | Skip |
| Alpha Vantage | Personal [S] | High | n/a | Low | Skip |
| Binance bulk archive | $0 | **High** (non-commercial) | n/a | Low | Do not use |
| Dukascopy, HistData | $0 | High / unknown | n/a | Medium | Do not use as supplied data |

### G3. Broker connections
| Option | 0 / 100 / 1,000 users | Terms / credential risk | Days | Prop fit | Verdict |
|---|---|---|---|---|---|
| **Verify and polish the existing 13 importers** | $0 | None | 2 to 3 + files from real traders | High | **Do first** |
| TopstepX (ProjectX) key pasted by the user | $0 (user pays $14.50 to $29) | Medium: read-only server use allowed [V]; trade-history access **[?]**; the user's fee limits take-up | 5 to 8 | High for Topstep | Build on demand |
| cTrader Open API (OAuth) | $0 [V] | Low to medium: personal data only for the app's stated purpose, explicit consent [V]; app approval step **[?]** | 6 to 10 | Medium to high (FTMO-style firms) | Build on demand |
| MT4/MT5 script that pushes closed deals to TradeNotes | $0 | Low on credentials; per-firm rules on installed scripts **[?]**; needs a Windows machine to build [M] | 5 to 7 | High (most CFD prop firms) | Later |
| Email or file forwarding of statements | $0 if the inbound-mail provider has a free tier **[?]** | Low | 4 to 6 | Medium | Later |
| Browser extension reading the trader's own platform page | $0 (small one-off store fee [M]) | Medium to high; breaks often | 7 to 10 per 2 platforms | High | Avoid unless nothing else works |
| Tradovate API | $0 if approved | **Blocked**: partner approval; prop accounts excluded on personal keys [S] | 8 to 12 after approval | High (Apex) | Send the partner request; do not plan on it |
| Rithmic | **[?]** | **Blocked**: conformance, broker fees | 15+ | High (Apex) | Skip |
| SnapTrade | $100 / $150 / $600 (daily plan, half connected) [V] | Low | 10 to 15 (memo) | **Very low**: stock and crypto brokers | Skip |
| Plaid-style bank and brokerage aggregators | Not researched in depth **[?]** | n/a | n/a | Very low (retail brokerages) | Skip |
| MetaApi (MT4/MT5 cloud) | $30+ plus usage; exact per-account rate **[?]** | High: trader's MT login goes to a third party | 6 to 10 | High | Skip |
| Alpaca OAuth; Binance, Bybit read-only keys | $0 | Low to medium (Bybit 90-day key expiry [S]) | 3 to 5 each | Low | Skip |

## H. What I could not verify
1. Finnhub's and FMP's own pricing and terms pages (blocked to my reader); the statements above come from search summaries quoting them.
2. Forex Factory's Notices text (403); only a competitor's summary.
3. Tradovate's help-centre article (page error); the "$1,000 live account, add-on, no prop accounts" rule comes from a search summary quoting it; the $25 fee is third-party.
4. SnapTrade's third page of brokers (pages 1 and 2 returned the same 46 to 50 names).
5. MetaApi per-account usage price; whether it still has a free tier (sources conflict).
6. Whether the TopstepX API returns historical trades; whether Topstep's new accounts are TopstepX-only and since when.
7. Databento: which plans carry "commercial use" and "delayed distribution" (the table's ticks did not load); CME's own display fees.
8. Twelve Data Venture price; Massive Business price; Trading Economics prices (all conflicting third-party figures).
9. Dukascopy and HistData terms; Alpaca's market-data agreement; Marketaux commercial terms.
10. Each prop firm's news-trading rule and platform list (third-party comparisons only).
11. cTrader's application approval step; reuse terms for Fed, ECB, BoE and ONS schedules; the BLS copyright page.
12. Items marked [M] (GitHub Actions minutes, Supabase Pro price, chart-library licence, browser-store fee).
13. Every effort figure is an estimate. No prototype was built.

## Sources (all read 2026-11-16)
- SnapTrade: https://snaptrade.com/pricing , https://snaptrade.com/brokerage-integrations , https://snaptrade.com/faq
- Databento: https://databento.com/pricing , https://databento.com/docs/portal/live-data , https://databento.com/blog/introducing-new-cme-pricing-plans
- Topstep: https://help.topstep.com/en/articles/11187768-topstepx-api-access
- cTrader: https://help.ctrader.com/open-api/ , https://help.ctrader.com/open-api/terms-of-use/
- Tradovate: https://support.tradovate.com/s/article/Tradovate-API-Access?language=en_US (not readable; via search), https://community.tradovate.com/t/api-access-for-3rd-party-app-development/11941 , https://community.tradovate.com/t/api-access-for-propfirm-accounts/10348
- Rithmic: https://www.rithmic.com/products/api-suite
- MetaApi: https://metaapi.cloud/ , https://www.metatraderapi.net/blog/metaapi-pricing-cost-comparison-mt4-mt5/ (a competitor's page)
- Calendar: https://www.bls.gov/schedule/news_release/ , https://fred.stlouisfed.org/docs/api/terms_of_use.html , https://www.financecalendar.com/api/ , https://fxmacrodata.com/articles/fxmacrodata-vs-forex-factory (competitor's summary of Forex Factory's terms)
- Finnhub: https://finnhub.io/pricing , https://finnhub.io/docs/api/market-news , https://bhanueso.dev/blips/economic-calendar-network-tab/
- FMP: https://site.financialmodelingprep.com/developer/docs/pricing , https://site.financialmodelingprep.com/insights/platform/can-you-use-fmp-data-in-a-public-app-website-or-client-dashboard (both via search)
- Trading Economics: https://tradingeconomics.com/api/ , https://fxmacrodata.com/articles/best-macroeconomic-data-apis-2026
- Alpha Vantage, Twelve Data, free-tier licences: https://www.moneyflock.com/contents/articles/free-stock-api-commercial-use-licensing , https://qveris.ai/guides/free-financial-api-comparison
- Massive: https://massive.com/stocks , https://narwhalapi.com/compare/massive-review
- Binance archive terms: https://data.binance.vision/Binance_Vision-Terms_of_Use.pdf , https://github.com/binance/binance-public-data/issues/478
- Dukascopy (secondary): https://fxmacrodata.com/articles/fxmacrodata-vs-dukascopy-historical-data ; HistData: https://www.histdata.com/
- Exchange keys: https://www.bybit.eu/en-EU/learn/bybit-guide/what-is-api-trading-and-how-to-set-it-up-on-bybit-eu , https://vercel.com/kb/guide/can-i-get-a-fixed-ip-address
- Hosting limits: https://vercel.com/docs/cron-jobs/usage-and-pricing , https://supabase.com/pricing
- Prop platforms and competing journals: https://www.tradesviz.com/blog/prop-firm-compliance-tracking/ , https://www.tradezella.com/solutions/prop-firm-traders , https://proptradingvibes.com/blog/topstep-trading-platforms , https://www.quantvps.com/blog/best-forex-prop-firms
