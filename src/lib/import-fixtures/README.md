# Broker import fixtures
Synthetic, anonymised samples built to the column layout of each broker's export (as documented/commonly exported in 2026).
No real account numbers, names or trades. Expected totals are hand-calculated in `src/lib/broker-import.test.ts`.
They are **not** byte-for-byte copies of real exports: before advertising a preset as verified, import a real export from that broker
and compare the totals to the broker's own report (owner checklist in docs/QA_RESULTS_2026-11-12.md).
