# TradeNotes HQ
Owner-only internal operations app. Full documentation: [`../docs/HQ.md`](../docs/HQ.md).

```bash
cd hq && npm install
cp .env.example .env.local     # fill DATABASE_URL, HQ_* values
node scripts/hash-password.mjs # prints HQ_PASSWORD_HASH
npm run dev                    # http://localhost:3200   (applies nothing to the DB; run `node scripts/migrate.mjs` first)
npm test && npm run test:db && bash scripts/run-e2e.sh
```
