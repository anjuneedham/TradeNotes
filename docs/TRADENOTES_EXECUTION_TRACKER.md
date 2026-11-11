# TradeNotes execution tracker
Updated 2026-11-11. Statuses: NOT STARTED · IN PROGRESS · BLOCKED · COMPLETE (exists) · VERIFIED (passed its checks). Owner: O = Opus, F = founder, Fa = Fable.

## Phase 0 — Handover
| Task | Pri | Status | Owner | Deps | Evidence | Next action |
|---|---|---|---|---|---|---|
| Find + integrate Fable's work | P0 | VERIFIED | O | — | Fast-forward of `ccr-1a791cba-pqxtyk`; 38/38 e2e before changes | — |
| FABLE_HANDOVER_REVIEW | P0 | COMPLETE | O | — | docs/handover/ | — |

## Phase 1 — Technical audit
| Repo map, architecture, feature inventory | P0 | COMPLETE | O | — | docs/audit/ | — |
| Security audit incl. cross-account re-test | P0 | VERIFIED | O | — | MULTI_ACCOUNT_TESTS (53+37+42 checks) | — |
| Next.js / dependency vulnerabilities | P0 | VERIFIED | O | — | `npm audit` 0 | Keep Next 15.5.x current |
| Database audit + review | P1 | COMPLETE | O | — | DATABASE_AUDIT/REVIEW | — |
| Launch gaps | P0 | COMPLETE | O | — | LAUNCH_GAPS | — |

## Phase 2 — Architecture and integration
| Contracts for Fable H-1…H-20 | P0 | COMPLETE | O | — | FABLE_HANDOVER_REVIEW table | — |

## Phase 3 — Subscriptions
| Tier matrix (validated Fable proposal) | P0 | COMPLETE | O | — | FINAL_SUBSCRIPTION_TIER_MATRIX | F: founding-offer decision |
| Costs + unit economics | P1 | COMPLETE | O | — | scripts/unit-economics.py | Replace estimates with invoices |
| Provider evaluation | P0 | COMPLETE | O | — | PAYMENT_PROVIDER_EVALUATION | F: fee/payout/MoR in writing |
| Billing schema | P0 | VERIFIED | O | — | migrate ×2, test-paste, verify-db 42 | — |
| Lifecycle + webhook + checkout + cancel/resume/portal | P0 | VERIFIED (vs fake) | O | — | 23 unit + 37 e2e | — |
| Real HandyPay test-mode run | P0 | **BLOCKED** | F→O | test key + webhook secret | — | F: follow PAYMENT_TEST_REPORT |
| In-app plan switch, coupons, annual | P3 | NOT STARTED | O | HandyPay capability | — | After launch |

## Phase 4 — Technical fixes
| Futures save bug (H-1) | P0 | VERIFIED | O | — | e2e | — |
| PostCSS advisory | P1 | VERIFIED | O | — | audit 0 | — |
| FK indexes | P2 | VERIFIED | O | — | migrate/test-paste | — |
| Error monitoring | P1 | BLOCKED | O | F: Sentry account | — | F: create account |
| DB TLS verification | P1 | BLOCKED | F | CA PEM | — | F: add `DATABASE_SSL_CA` |

## Phase 5 — Product integration
| Trade edit (H-2) | P0 | VERIFIED | O | — | e2e (prefill, recalc, forged id) | — |
| Billing UI automated states (H-3) | P0 | VERIFIED (vs fake) | O | — | e2e-billing | — |
| Export + delete account (H-6) | P1 | VERIFIED | O | — | e2e | — |
| Change password signed-in, edit account (H-6) | P2 | NOT STARTED | O | — | — | Next round |
| Timezone (H-5) | P2 | NOT STARTED | O | — | — | Next round |
| CSV import UI (H-12) | P1 | NOT STARTED | O | — | parser tested | **Next engineering task** |
| Multiple accounts (H-12) | P2 | NOT STARTED | O+Fa | — | — | After import |
| Landing screenshots | P2 | NOT STARTED | Fa | live domain | — | — |

## Phase 6 — Email and legal
| Templates + billing emails | P0 | VERIFIED (vs fake) | O | — | 11 unit + e2e | — |
| Resend live + DNS (SPF/DKIM/DMARC) | P0 | **BLOCKED** | F | domain | RESEND_SETUP | F: buy domain, verify in Resend |
| Legal drafts (4) + subscription page | P0 | COMPLETE | O | — | docs/legal + /legal/subscription | — |
| Business name + support email | P0 | **BLOCKED** | F | — | LEGAL_INFORMATION_SOURCES | F: provide values |
| Counsel review, DPA registration | P1 | BLOCKED | F | lawyer | — | — |

## Phase 7 — QA
| Full automated QA | P0 | VERIFIED | O | — | QA_TEST_RESULTS (all green) | Re-run on live domain |
| Real devices, real inbox, real provider | P1 | BLOCKED | F | domain, keys | — | — |

## Phase 8 — Product score
| Scorecard | P1 | COMPLETE | O | — | 6.1 → 6.9 | Re-score after C1–C3 |

## Phase 9 — Content
| Strategy, guidelines, master plan, 7-day plan | P1 | COMPLETE | O | — | docs/content | — |
| VIDEO_001–015 full packages | P0 | COMPLETE | O | — | docs/content/videos | F: approve scripts, produce |
| VIDEO_016–060 draft packages | P2 | COMPLETE (draft) | O | — | — | Refine after week-1 data |
| Videos rendered/voiced | P1 | NOT STARTED | F | animation tool | — | — |

## Phase 10 — Launch
| Ad strategy, briefs, tracking, 5-day plan | P2 | COMPLETE | O | — | docs/marketing; tracking SQL tested | — |
| Domain setup checklist | P0 | COMPLETE | O | — | DOMAIN_SETUP | F: execute |
| Merge to main / production deploy | P0 | **BLOCKED** | F | approval | previews READY | F: approve |
| Business model | P2 | COMPLETE | O | — | TRADENOTES_BUSINESS_MODEL | — |
