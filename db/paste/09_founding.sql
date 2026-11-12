-- 09: Founding-member offer (idempotent; additive only). A seat is RESERVED when a user starts a discounted checkout
-- (founding_claimed_at) and CONFIRMED when the payment webhook sets is_founding_member = true. Writes: owner connection only.
alter table tradenotes.subscriptions add column if not exists founding_claimed_at timestamptz;
