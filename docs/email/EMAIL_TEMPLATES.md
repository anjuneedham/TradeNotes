# Email templates
Code: `src/lib/email-templates.ts` — `render(id, data)` → `{ subject, html, text }`; `sendTemplate(to, id, data)`.

## Design (follows Fable's light palette)
Paper background `#f6f5f1`, white card with `#dfdcd3` border and 10 px radius, ink `#17191c`, muted `#5a626d`, one blue accent `#2c50c4` for the single button, IBM Plex Sans with system fallbacks, max width 520 px, table layout for email-client support, `color-scheme: light`. No images, no tracking pixels. Every button also shows its link as text. Footer: "TradeNotes — a trading journal. Not financial advice." + support email when set.

## Catalogue
| Id | Subject | Data | Button |
|---|---|---|---|
| welcome | Welcome to TradeNotes | — | Log a trade |
| verify_email | Confirm your TradeNotes email | url | Confirm email |
| reset_password | Reset your TradeNotes password | url | Reset password |
| subscription_confirmed | Your TradeNotes {Plan} plan is active | plan, periodEnd | View your plan |
| payment_failed | Your TradeNotes payment didn't go through | plan, periodEnd | Update payment |
| cancellation_scheduled | Your TradeNotes subscription is cancelled | plan, periodEnd | Plan & billing |
| subscription_ended | Your TradeNotes plan has ended | plan | See plans |
| account_notice | Important information about your TradeNotes account | message | Open TradeNotes |

## Rules (enforced by tests)
All values HTML-escaped; no `<img>`; no "guarantee"/"profit" wording; dates in UTC long form. Adding a template = add a case in `content()` and to the test list.
