# TradeNotes digital products plan

**Why:** free products grow the email list (the audience you own); paid products make money from people not ready for a subscription; partners (affiliates) can sell them too. Every product points back to the TradeNotes app, where the real value is automatic tracking.

**Rules:** educational only. No signals, no "guaranteed" or "funded in 30 days" claims, no fake results or testimonials. Every product says "not financial advice". Sample data is always labelled.

## Stage 1: free (lead magnets). Goal: 100 emails
| Product | Status | Where |
|---|---|---|
| Trading journal template (CSV for Excel / Google Sheets, R column) | **Built** | `/free` → `public/downloads/tradenotes-journal-template.csv` |
| 30-trade review checklist (printable page) | **Built** | `/free/review-checklist` |
| R-multiple + prop firm challenge calculator | **Built** (inside article 1) | `/learn/r-multiple-prop-firm-challenge` |
| Prop firm challenge risk planner (one page per firm rule set, generic) | Next | article 6 |
| Trading plan template | Next | article 14 |
| 7-day email course "Journal like a funded trader" | Next: needs the email sender below | email list |

**Missing piece to use the list: sending.** Emails are stored in `tradenotes.leads` (with consent and an unsubscribe token; unsubscribe page `/free/unsubscribe?t=<token>`). Nothing sends to them yet. Next build: a weekly tips email through Resend (already set up for account email), with the unsubscribe link in every message. Do this once the list has ~25 emails.

## Stage 2: paid digital products (once 100+ emails and 1+ paying subscriber)
Sell on the TradeNotes site (Handypay checkout links, same as plans) or a store like Gumroad / Lemon Squeezy (handles VAT and delivery).
| Product | Price | What it is | Upsell |
|---|---|---|---|
| Prop Firm Challenge Playbook (PDF + sheet) | $19 | risk plan, daily loss rules, review routine, worked R maths for typical rule sets | 1 month TradeNotes Premium included |
| Trading Journal Pro spreadsheet | $12 | Google Sheets with automatic R, expectancy, setup and mistake breakdowns | "Outgrow the sheet? Import it into TradeNotes" |
| Trading psychology workbook | $15 | 30 daily prompts plus a tilt/rules checklist | journal prompts are built into TradeNotes |
| Bundle | $35 | all three + 3 months Premium | |

Rule: a paid product must be something the buyer can't get free from the blog. The blog explains; the product does the work for them.

## Stage 3: "TradeNotes Partners" affiliate brand
The partner programme already pays 30% of subscription cash for 12 months (`docs/AFFILIATE_PROGRAM.md`). Extend it to digital products:
- Same `?ref=code` links. Products pay **40%** (no ongoing cost to you, so you can be more generous).
- Give partners a ready kit: the free template and checklist with their link, 3 captions, and 2 short video scripts.
- Best partners: prop-firm Discords and trading educators (they want free resources to give their members).
- Do NOT resell other companies' trading products (signals, bots, courses) under the TradeNotes name. It risks your reputation and the "honest numbers" brand. If you add third-party affiliate links later (brokers, prop firms), disclose them clearly and pick only regulated firms.

## Order of work
1. Now: article 1 + free template/checklist (built). DM partners with the free kit.
2. Weeks 1–4: 12 articles (scheduled), weekly email once 25+ emails.
3. When there are 100 emails and a first subscriber: build the $19 playbook, sell to the list, give partners 40%.
4. Review monthly: emails gained per article, email → signup rate, signup → paid rate.
