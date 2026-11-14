-- Test customers for the HQ browser test (never run against a real database).
insert into public.tn_user (id, name, email, "emailVerified", "createdAt") values
 ('a0000000-0000-0000-0000-00000000000a', 'Alice Trader', 'alice@trader.io', true,  now() - interval '20 days'),
 ('b0000000-0000-0000-0000-00000000000b', 'Bob Newbie',   'bob@trader.io',   false, now() - interval '1 hour'),
 ('c0000000-0000-0000-0000-00000000000c', 'Cara Paying',  'cara@trader.io',  true,  now() - interval '3 days'),
 ('d0000000-0000-0000-0000-00000000000d', 'Hidden Test',  'hidden@e2e.test', true,  now() - interval '1 day'),
 ('e0000000-0000-0000-0000-00000000000e', 'Eve Stuck',    'eve@trader.io',   true,  now() - interval '5 days'),
 ('f0000000-0000-0000-0000-00000000000f', '=cmd|calc',    'fiona@trader.io', true,  now() - interval '2 days');
insert into tradenotes.profiles (id, signup_source, onboarding_completed_at) values
 ('a0000000-0000-0000-0000-00000000000a', 'tt-dm', now()), ('b0000000-0000-0000-0000-00000000000b', 'ig-dm', null),
 ('c0000000-0000-0000-0000-00000000000c', 'ig-ad', now()), ('d0000000-0000-0000-0000-00000000000d', null, null),
 ('e0000000-0000-0000-0000-00000000000e', 'tt-organic', now()), ('f0000000-0000-0000-0000-00000000000f', null, null);
insert into tradenotes.subscriptions (user_id, plan, status, current_period_end, is_founding_member) values
 ('a0000000-0000-0000-0000-00000000000a', 'free', 'active', null, false), ('b0000000-0000-0000-0000-00000000000b', 'free', 'active', null, false),
 ('c0000000-0000-0000-0000-00000000000c', 'starter', 'active', now() + interval '3 days', true), ('e0000000-0000-0000-0000-00000000000e', 'free', 'active', null, false);
insert into tradenotes.accounts (id, user_id, name) values
 ('a1000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', 'A'), ('c1000000-0000-0000-0000-00000000000c', 'c0000000-0000-0000-0000-00000000000c', 'C');
insert into tradenotes.trades (user_id, account_id, symbol, side, quantity, entry_price, opened_at) values
 ('a0000000-0000-0000-0000-00000000000a', 'a1000000-0000-0000-0000-00000000000a', 'EURUSD', 'long', 1, 1.1, now() - interval '5 days'),
 ('a0000000-0000-0000-0000-00000000000a', 'a1000000-0000-0000-0000-00000000000a', 'GBPUSD', 'short', 1, 1.3, now() - interval '4 days'),
 ('a0000000-0000-0000-0000-00000000000a', 'a1000000-0000-0000-0000-00000000000a', 'USDJPY', 'long', 1, 150, now() - interval '3 days'),
 ('c0000000-0000-0000-0000-00000000000c', 'c1000000-0000-0000-0000-00000000000c', 'EURUSD', 'long', 1, 1.1, now() - interval '2 days');
