# Domain setup — tradenotes.dev
Nothing here has been done; DNS and purchases need the founder.

1. **Buy** `tradenotes.dev` (Vercel → Domains → Buy; ~$9.99 first year, ~$13 renewal — compare renewal prices elsewhere). Do a quick trademark search first (LEGAL_REQUIREMENTS).
2. **Attach** to project `tradenotes` → Settings → Domains → add `tradenotes.dev` and `www.tradenotes.dev` (redirect www → apex). `.dev` is HTTPS-only; Vercel issues the certificate automatically.
3. **Env vars already point at it** (`BETTER_AUTH_URL`, `NEXT_PUBLIC_SITE_URL`). Redeploy after attaching.
4. **Smoke test** on `https://tradenotes.dev`: sign up → onboarding → log trade → dashboard → billing → log out/in.
5. **Email DNS** (Resend SPF/MX/DKIM + your DMARC) — see `docs/email/RESEND_SETUP.md`.
6. **Support mailbox**: create `support@tradenotes.dev` (e.g. forwarding via your registrar or a mail host) and put it in `src/lib/legal.ts`.
7. **HandyPay webhook URL**: `https://tradenotes.dev/api/webhooks/handypay`.
8. Optional: Vercel Web Analytics (cookieless) — if added, update the Privacy Policy.
