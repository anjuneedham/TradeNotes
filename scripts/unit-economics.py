"""Reproducible TradeNotes unit-economics model. All inputs are ASSUMPTIONS unless marked documented. Run: python3 scripts/unit-economics.py"""
PRICES = {"free": 0, "standard": 12, "premium": 24}
FEE_PCT, FEE_FIXED = 0.049, 0.40          # HandyPay docs (payment sessions, Free/Brand merchant plan) - documented 2026-11-11
# Variable delivery cost per user per month (estimates): DB storage+compute share, email, bandwidth.
VAR = {"free": 0.01, "standard": 0.02, "premium": 0.03}
def fixed(users):                          # monthly fixed platform cost by scale (estimates; see FEATURE_DELIVERY_COSTS.md)
    vercel = 20 + (0 if users <= 1000 else 20)
    db = 25 + (0 if users <= 1000 else 25)  # Supabase Pro; larger compute add-on beyond ~1k users
    email = 0 if users <= 600 else 20       # Resend free = 3,000 emails/mo
    domain = 1.1
    monitoring = 0 if users <= 1000 else 26
    return vercel + db + email + domain + monitoring
MIX = {"Conservative (92/6/2)": (0.92, 0.06, 0.02), "Base (85/11/4)": (0.85, 0.11, 0.04), "Optimistic (75/17/8)": (0.75, 0.17, 0.08)}
COUNTS = [10, 50, 100, 500, 1000, 5000]
net = {k: v - (v * FEE_PCT + FEE_FIXED if v else 0) for k, v in PRICES.items()}
print("## Per-subscriber monthly contribution")
print("| Tier | Price | HandyPay fee | Net revenue | Variable cost | Contribution | Margin |\n|---|---:|---:|---:|---:|---:|---:|")
for k, p in PRICES.items():
    fee = p - net[k]; c = net[k] - VAR[k]
    print(f"| {k.title()} | ${p:.2f} | ${fee:.2f} | ${net[k]:.2f} | ${VAR[k]:.2f} | ${c:.2f} | {'—' if not p else f'{c/p:.1%}'} |")
for name, (f, s, pm) in MIX.items():
    print(f"\n## Scenario: {name} — share of registered users on Free/Standard/Premium")
    print("| Registered users | Free | Standard | Premium | MRR | Fees | Variable | Fixed | Monthly result |\n|---:|---:|---:|---:|---:|---:|---:|---:|---:|")
    for n in COUNTS:
        ns, np_ = round(n * s), round(n * pm); nf = n - ns - np_
        mrr = ns * 12 + np_ * 24
        fees = ns * (12 - net["standard"]) + np_ * (24 - net["premium"])
        var = nf * VAR["free"] + ns * VAR["standard"] + np_ * VAR["premium"]
        fx = fixed(n); res = mrr - fees - var - fx
        print(f"| {n:,} | {nf:,} | {ns:,} | {np_:,} | ${mrr:,.0f} | ${fees:,.0f} | ${var:,.0f} | ${fx:,.0f} | {'+' if res >= 0 else '−'}${abs(res):,.0f} |")
print("\n## If every count is PAYING customers (illustrative split 70% Standard / 30% Premium)")
print("| Paying customers | Standard | Premium | MRR | Fees | Fixed+variable | Monthly result |\n|---:|---:|---:|---:|---:|---:|---:|")
for n in COUNTS:
    ns = round(n * .7); np_ = n - ns
    mrr = ns * 12 + np_ * 24; fees = ns * (12 - net["standard"]) + np_ * (24 - net["premium"])
    cost = fixed(n * 6) + ns * VAR["standard"] + np_ * VAR["premium"] + n * 5 * VAR["free"]  # assume 5 free users per payer
    print(f"| {n:,} | {ns:,} | {np_:,} | ${mrr:,.0f} | ${fees:,.0f} | ${cost:,.0f} | +${mrr-fees-cost:,.0f} |")
blended = (0.7 * (net["standard"] - VAR["standard"]) + 0.3 * (net["premium"] - VAR["premium"]))
print(f"\nBlended contribution per payer (70/30): ${blended:.2f}. Break-even at launch fixed cost ${fixed(10):.0f}/mo: {fixed(10)/blended:.1f} payers.")
