# TradeNotes design system

## Direction: "Ledger"
TradeNotes is a notebook for people making decisions with money. The interface should look like a well-kept ledger: quiet surfaces, figures set in a monospaced face so columns line up, and colour used only where it carries meaning.

| Principle | In practice |
|---|---|
| **Figures first** | Money, counts, prices and dates are set in IBM Plex Mono with tabular numerals. Labels are small and grey; numbers are large |
| **Colour means something** | Green and red are reserved for results. Amber is reserved for "needs attention". Blue is for links, focus and the chart line. Nothing else is coloured |
| **Ink on paper** | The primary button is the text colour inverted (light on dark, dark on light) — not a brand colour competing with results |
| **Say it plainly** | Every restriction, limit and unbuilt feature is stated in words. No disabled-looking mystery controls |
| **Flat and ruled** | 1 px borders, 8 px radius on cards, 6 px on controls. No gradients, no glass, no drop shadows except the chart tooltip |
| **Calm** | No animation beyond colour transitions; `prefers-reduced-motion` removes those too |

Deliberately avoided: gradient hero, glassmorphism, decorative charts, pill-shaped everything, a second accent colour, illustration.

## Colour tokens (`src/app/globals.css`)
| Token | Dark | Light | Use |
|---|---|---|---|
| `bg` | `#0d0f11` | `#f6f5f1` | Page |
| `panel` | `#14171a` | `#ffffff` | Cards, sidebar |
| `raised` | `#1c2024` | `#efede7` | Selected state, inset read-outs, neutral notices |
| `border` | `#272c32` | `#dfdcd3` | Dividers, card edges (decorative) |
| `border-strong` | `#3a414a` | `#c4c0b5` | Emphasised edges, chart zero line |
| `field` | `#5f6975` | `#8a857a` | Input borders (≥3:1 against the surface) |
| `fg` | `#e8eaed` | `#17191c` | Text, primary button fill |
| `muted` | `#98a1ac` | `#5a626d` | Secondary text |
| `accent` | `#86a4f7` | `#2c50c4` | Links, focus ring, chart line, "your plan" |
| `win` | `#45d083` | `#14753a` | Positive result |
| `loss` | `#f47070` | `#bf2b2b` | Negative result, errors, destructive |
| `warn` | `#e2b34f` | `#8f5a06` | Small-sample and limit warnings, "in development" |

Measured contrast (WCAG): every text colour is ≥ 4.9:1 on every surface it is used on in both themes (lowest: `win` on `raised`, light, 4.93). Input borders are 3.2–3.7:1.

**Themes.** Dark is the default. Light follows the device (`prefers-color-scheme`). Inside the app a user can force either from Settings; the choice is a cookie on that device. Marketing and auth pages always follow the device.

## Typography
| Role | Face | Size / weight |
|---|---|---|
| Interface | IBM Plex Sans (variable, self-hosted) | — |
| Figures (`.fig`) | IBM Plex Mono 400/500, tabular | — |
| Marketing H1 | Sans | 36 → 48 px, 600, tight tracking |
| Page title | Sans | 24 px, 600 |
| Section title | Sans | 18–20 px, 600 |
| Card title | Sans | 14 px, 500 |
| Body | Sans | 14 px (16 px in inputs on phones, which prevents iOS zoom) |
| Hint / caption | Sans | 12 px, muted |
| Eyebrow | Sans | 11 px, uppercase, wide tracking |
| Headline figure | Mono | 20 → 24 px, 500 |

## Spacing, grid, breakpoints
- 4 px base. Common steps: 8, 12, 16, 20, 24, 40, 64.
- Cards: 16 px padding on phones, 20 px from 640 px. Gaps between cards: 12 px.
- Content width: 1152 px max (marketing and app); forms 672 px; reading text 768 px; settings and billing 896 px.
- Breakpoints (Tailwind defaults): `sm` 640, `md` 768 (sidebar appears, tab bar goes), `lg` 1024 (multi-column dashboards; journal table replaces cards).

## Components
| Component | Rules |
|---|---|
| **Button — primary** (`btnCls`) | `fg` fill, `bg` text. One per view. 44 px tall on phones, 40 px from 640 px |
| **Button — secondary** (`btnGhostCls`) | Border only |
| **Button — destructive** (`ConfirmDelete`) | Always two steps: "Delete" → "Confirm delete / Cancel" |
| **Input / select / textarea** (`inputCls`) | `field` border, accent border on focus, red border when `aria-invalid` |
| **Field** | Label above (500 weight), then control, then error (red, `role="alert"`) or hint (muted). Never placeholder-as-label |
| **Choice chips** | For multi-select tags. The real checkbox covers the chip, so keyboard and screen readers work |
| **Segmented control** | Radio pair (direction) or link group (date range). Selected = `raised` fill |
| **Card** | Panel + 1 px border, 8 px radius. Never nested more than once |
| **Stat** | Label, figure, optional hint with "Learn more". Hints hide when explanations are off |
| **Table** | Header row muted 12 px; numeric columns right-aligned in mono; row dividers only. More than four columns → cards below 1024 px |
| **Breakdown** | Table + a 4 px bar per row scaled to the largest absolute value in that table; green/red by sign; the signed figure is always printed |
| **Badge** | 11 px uppercase, bordered. Tones: neutral, accent, win, loss, warn |
| **Notice** | `info` (neutral), `warn` (amber), `error` (red, `role="alert"`), `ok` (green, `role="status"`) |
| **Empty state** | Dashed border, one sentence, one action |
| **Meter** | 6 px bar; turns amber at 80 %, red at 100 % |
| **Navigation** | Desktop: 216 px sidebar — logo, Log trade, four destinations, guide + log out at the bottom. Phone: top bar + five-slot bottom bar with Log trade in the centre |
| **Tooltip** | Only on the chart (crosshair + read-out). Elsewhere explanations are visible text, not hover-only |
| **Subscription indicators** | "Your plan" badge (accent), "Active" badge (green), usage meter, amber panel when lapsed or at limit |

### Not built yet (specified for when they are needed)
| Component | Specification |
|---|---|
| **Modal** | Avoid. Use a page or an inline two-step control. If one becomes necessary: native `<dialog>`, focus trapped, Escape closes, max 480 px, full-width sheet from the bottom on phones |
| **Drawer** | Reserve for future journal filters on phones: bottom sheet, 80 % height, Apply/Clear at the bottom |
| **Toast** | Not used. Confirmations are inline `Notice kind="ok"` at the top of the destination page, which also works without JavaScript |
| **Loading** | Server-rendered pages need no skeletons today. Submit buttons show "Saving…" and disable. When a route becomes slow, add `loading.tsx` with grey blocks matching the final layout — no spinners |

## Charts
One chart type today: a single-series line (cumulative net P&L).
- Line in `accent`, 2 px; green/red are not used for the line because they are reserved for results in text.
- Y-axis prints max, min and zero; dashed zero line; no gridlines.
- Hover or touch shows a crosshair and a read-out (trade number, date, cumulative, this trade).
- An `aria-label` states the trade count, end value, low and high.
- Below two closed trades the chart is replaced by a sentence.
- Never draw a chart of illustrative data inside the signed-in app.

## Accessibility baseline
- Visible 2 px focus ring on every interactive element.
- Touch targets ≥ 44 px on phones (buttons, inputs, tabs, chips ≥ 36 px with spacing).
- Skip link on marketing and app layouts; landmarks (`header`, `nav` with labels, `main`, `footer`).
- One `h1` per page; headings in order.
- Errors: summary at the top of the form plus per-field text; fields marked `aria-invalid`.
- Results are signed and labelled, so they do not depend on colour.
- `prefers-reduced-motion` respected.
- Not yet verified: a full screen-reader pass (see QA).

## Voice
Short, concrete, second person. State what happened and what to do next. Never promise results. Unbuilt things are "in development — not available yet", never "coming soon!".
