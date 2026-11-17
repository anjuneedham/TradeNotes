# Decision memo: broker auto-sync through an aggregator (for example SnapTrade)
Written 2026-11-14 for the owner. **Nothing was built, no account was opened, no vendor was contacted.** Sources were read on 2026-11-14 through a page-fetch tool; the pages show no publication dates unless stated. Anything I could not read is marked UNVERIFIED.

## Recommendation (short)
**NO-GO now. Revisit when the conditions at the end are met.** Cost is small and the privacy design is workable, but the brokers we could verify are mostly stock and crypto brokers, while TradeNotes' stated primary market is forex (docs/DECISIONS.md, 2026-11-08) and its presets cover MT4/MT5, cTrader, Tradovate and NinjaTrader. On the pages I read, SnapTrade lists none of those four. Sync would be built for a market segment we do not mainly serve.

## Why a trader wants it
Broker sync is the most common reason traders choose Tradezella, TraderSync and similar tools (docs/READINESS_REVIEW.md lists it as the #1 purchase driver; that is our own earlier judgement, not a measured fact). It removes the export-and-upload step and the "my CSV format is not supported" support request.

## What SnapTrade offers (verified from the vendor's own pages, 2026-11-14)
Source: https://snaptrade.com/pricing, https://snaptrade.com/personal, https://snaptrade.com/brokerage-integrations (pages 1 and 2 of the grid), broker pages for IBKR, Alpaca, Schwab, Robinhood, https://snaptrade.com/security, https://snaptrade.com/privacy-policy (last updated 2024-01-31 per the page).

### Pricing (USD, billed monthly)
| Plan | Price | Notes |
|---|---|---|
| Build | $0 | Up to 5 brokerage connections; real-time data, trading included. For development |
| Launch, real-time | $100/month + $2 per connected user/month | Trading included where the broker supports it; manual sync included |
| Launch, daily | $100/month + $1 per connected user/month | Read only; manual sync $0.05 per sync |
| Custom | quote | Volume discounts, higher rate limits |
| Personal | $0 "for a limited time" | Own accounts only, up to 20 connections; not usable for our customers |
- "Connected user" = a user who has connected at least one brokerage account; several broker connections count once. The page says there is no extra charge for specific brokerages.
- Third-party listings quote different numbers (for example $1 per user in one directory). I used the vendor page.
- UNVERIFIED: rate limits on Launch, history depth, how the "limited time" Personal price ends.

### Brokers (partial list)
Read from the grid: Interactive Brokers (Flex Query: the user pastes a Query ID and token; read only), Alpaca (OAuth, read/trade), Schwab (OAuth, read/trade), Robinhood (OAuth, read only), Webull US and Webull Canada, Binance, Coinbase, Kraken are listed. **Tradovate, NinjaTrader, MetaTrader (MT4/MT5), cTrader and Bybit did not appear on the two grid pages I read.** UNVERIFIED: page 3 of the grid, the per-broker capability list (the "Broker Access Guide" page returned no content), and whether any futures or forex broker is on it. History depth per broker is not stated anywhere I read.

## Cost to TradeNotes (arithmetic from the table above; assumptions stated)
Assumption: only paying Standard ($12) and Premium ($24) users get sync; daily read-only data is enough for a journal.
| Connected users | Daily plan | Real-time plan | Cost as share of revenue if all are Premium ($24) | If all Standard ($12) |
|---|---|---|---|---|
| 0 | $100 | $100 | n/a (fixed cost) | n/a |
| 25 | $125 | $150 | 20.8% / 25.0% | 41.7% / 50.0% |
| 100 | $200 | $300 | 8.3% / 12.5% | 16.7% / 25.0% |
| 500 | $600 | $1,100 | 5.0% / 9.2% | 10.0% / 18.3% |
Per-user variable cost is $1 or $2 per month, which is 4% to 17% of a plan price; **the $100 base fee is the real barrier at our size**: it equals about 4 Premium or 8 Standard subscribers' monthly revenue before any other cost. Payment fees (HandyPay) are not included. This is a **new recurring paid vendor**, which the standing rules forbid without the owner's written approval.

## Privacy and security
- **Credentials.** SnapTrade's security page says it uses OAuth "where possible"; where a broker has no OAuth, SnapTrade "can only facilitate the connection using account credentials", which it says are encrypted with AWS KMS. So **TradeNotes would not receive or store broker passwords, but a new processor might hold them for some brokers.** My reading of the broker pages: Alpaca, Schwab, Robinhood use OAuth; IBKR uses a read-only Flex token. Which brokers need passwords is UNVERIFIED.
- **Marketing claims affected.** The landing page now says "It doesn't connect to your broker or place trades" (src/app/(marketing)/page.tsx:135). That sentence would become false and must change on the day sync launches. Earlier docs also list "no broker credentials stored" as a trust point; it would have to be reworded to the true, narrower statement.
- **Consent.** Each user must start the connection themselves, see which broker and which data (positions, transactions, balances), and be able to disconnect and delete. Read-only scope only; no trading, ever (SnapTrade supports trading; we would not use it, and the daily plan blocks it).
- **New data category and a new processor.** Imported trades are already ours; new are the broker account identifiers, a SnapTrade user id and secret per customer (secret must be encrypted at rest and never logged), connection status. SnapTrade becomes a sub-processor and receives the user's broker authorisation. The Privacy Policy (src/app/(marketing)/legal/privacy) and docs/LEGAL_FILL_IN.md must list it, with hosting location.
- **Gaps in the vendor's own statements (UNVERIFIED):** retention periods for end-user data (their policy says it does not cover end users of partners' products and does not give periods), named sub-processors, hosting region (the policy only says "including the United States"), whether a data processing agreement is offered (the Developer Terms and Terms & Conditions were not read), the SOC 2 auditor and report date (the site claims "SOC 2 Type II"; I saw no report). Ask for the report and a DPA before any decision.
- Jamaica: the owner's own Data Protection Act position (registration still open) should be settled first, since transfers to a US processor are involved. Ask the lawyer.

## Legal and terms impact
- Terms: describe sync as a convenience with possible gaps and delays, no guarantee that imported data matches the broker's records, user must have the right to connect the account, user can disconnect at any time.
- Disclaimer: unchanged in spirit (still not advice), but remove "no broker connection" wording.
- Broker terms: some brokers restrict third-party access; OAuth brokers approve apps individually. Compliance is partly the aggregator's job; confirm in SnapTrade's Developer Terms (not read).
- Order of work: lawyer sees the new processor and wording before launch, not after.

## Engineering effort (estimate, not measured)
| Piece | Rough size |
|---|---|
| Server-side connect flow, SnapTrade user registration, secrets storage (one new user table with RLS, isolation checks) | 3 to 4 days |
| Map SnapTrade activity to trades (fills to round trips, partial exits, fees, time zones, dedupe against CSV imports) | 4 to 6 days; the hardest part, because broker activity is fills, not trades |
| Scheduled sync (needs a free scheduler; the repo already has a GitHub Actions cron for reminders) | 1 to 2 days |
| Disconnect, deletion cascade, account deletion purge at SnapTrade | 1 day |
| Tests, fixtures from the vendor sandbox, e2e at 390px, two-user isolation, privacy/terms/pricing copy | 3 to 4 days |
About 2 to 3 weeks for one engineer, plus ongoing support when a broker connection breaks (this is a real recurring cost, not a one-off).

## Go / no-go
**No-go today.** Conditions to revisit (all should hold):
1. The owner approves the recurring cost in writing (minimum $100/month plus $1 to $2 per connected user).
2. At least **~15 paying users** ask for sync, or sync is the top stated reason for churn (so the base fee is covered by demand, not hope).
3. SnapTrade's list (page 3 and the access guide, or a sales answer) shows the brokers **our customers actually use**; if the core users are on MT4/MT5, cTrader or Tradovate and those are not supported, do not buy.
4. SnapTrade provides a DPA, retention terms, hosting region and its SOC 2 report; the lawyer approves the wording.
5. Real broker exports for the existing importers are verified first (Phase 1 fixtures are synthetic); sync on top of unverified import mapping would multiply errors.
Cheaper alternative while waiting: keep improving CSV presets and add a "request your broker" form so the demand is measured.
