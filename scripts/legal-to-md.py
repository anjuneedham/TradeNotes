"""Regenerate docs/legal/*.md review copies from the live legal pages (JSX). Run: python3 scripts/legal-to-md.py"""
import re, pathlib
VALUES = {"PLANS.free.name": "Free", "PLANS.starter.name": "Standard", "PLANS.pro.name": "Premium", "PLANS.free.tradeLimit": "50",
          "PLANS.starter.monthly": "12", "PLANS.pro.monthly": "24", "LEGAL.productName": "TradeNotes", "LEGAL.paymentProvider": "HandyPay",
          "LEGAL.refundDays": "14 [refundDays — confirm]", "LEGAL.deletionDays": "30 [deletionDays — confirm]", "LEGAL.governingLaw": "the laws of Jamaica [confirm with counsel]",
          "LEGAL.country": "Jamaica", "LEGAL.effectiveDate": "11 November 2026"}
PAGES = {"terms": "TERMS_OF_SERVICE", "privacy": "PRIVACY_POLICY", "subscription": "SUBSCRIPTION_POLICY", "disclaimer": "TRADING_RISK_DISCLOSURE"}
head = "> **DRAFT — not reviewed by a lawyer.** Generated from `src/app/(marketing)/legal/{p}/page.tsx` by `scripts/legal-to-md.py`. Values in [brackets] come from `src/lib/legal.ts`; `[businessName]` and `[supportEmail]` are still unset. See LEGAL_INFORMATION_SOURCES.md.\n\n"
for p, out in PAGES.items():
    src = pathlib.Path(f"src/app/(marketing)/legal/{p}/page.tsx").read_text()
    body = src[src.index("<LegalShell"):src.rindex("</LegalShell>")]
    title = re.search(r'title="([^"]+)"', body).group(1)
    body = body[body.index(">", body.index("title=")) + 1:]
    body = re.sub(r"\{LEGAL\.refundDays > 0\s*\?\s*(<p>.*?</p>)\s*:\s*<p>.*?</p>\}", r"\1", body, flags=re.S)
    for k, v in VALUES.items(): body = body.replace("{" + k + "}", v)
    body = re.sub(r"\{PLANS\.starter\.tradeLimit[^}]*\}", "2,000", body)
    body = re.sub(r"<h2>(.*?)</h2>", r"\n## \1\n", body)
    body = re.sub(r"<li>", "\n- ", body)
    body = re.sub(r"</?(strong|b)>", "**", body); body = re.sub(r"</?em>", "_", body)
    body = re.sub(r"<p>", "\n", body)
    body = re.sub(r"<[^>]+>", "", body)
    body = re.sub(r"\{(?:LEGAL|PLANS)\.([a-zA-Z.]+)[^}]*\}", r"[\1]", body)
    body = re.sub(r"\{(mail|who)\}", lambda m: "[supportEmail]" if m.group(1) == "mail" else "[businessName]", body)
    body = re.sub(r"\{GRACE_DAYS\}", "3", body)
    body = body.replace("&amp;", "&").replace("&apos;", "'")
    body = re.sub(r"\{[^{}]*\?\s*", "", body); body = re.sub(r"\s*:\s*\n?\s*Payments are not refundable[^}]*\}", "", body)
    body = re.sub(r"\n\s+", "\n", body); body = re.sub(r"\n{3,}", "\n\n", body)
    body = re.sub(r"The data controller is .*", "The data controller is **[businessName]**, Jamaica [, address — optional]. Contact for any privacy question or request: [supportEmail]. [Registered with the Office of the Information Commissioner of Jamaica: dpaRegistrationNumber — once registered.]", body)
    pathlib.Path(f"docs/legal/{out}.md").write_text(f"# {title}\n" + head.format(p=p) + body.strip() + "\n")
    print("wrote", out)
