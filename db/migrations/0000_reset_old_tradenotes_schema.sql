-- ONE-TIME, ONLY for the shared Supabase project (ref rocawrsurnfikzreajwo) where an EARLIER, ABANDONED version of the `tradenotes`
-- schema was applied on 2026-11-08 (10 tables, verified 0 rows on 2026-11-10). Run this BEFORE 0001_init.sql there.
-- It does nothing on a fresh database. It only touches the `tradenotes` schema; Agriloop's tables are in `public` and are not affected.
-- Before running, confirm the tables are still empty:  select count(*) from tradenotes.trades;  select count(*) from tradenotes.profiles;
drop schema if exists tradenotes cascade;
