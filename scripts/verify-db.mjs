// Build-time database verification: structure + security + two-user isolation. Prints a report; exits 1 on any FAIL.
// Behaviour tests run inside a transaction that is ROLLED BACK, so nothing is written to the database.
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { connect } from "./db-connect.mjs";

const c = await connect("verify");
let pass = 0, fail = 0, skip = 0;
const ok = (name, cond, detail = "") => { if (cond) { pass++; console.log(`[verify] PASS  ${name}`); } else { fail++; console.log(`[verify] FAIL  ${name}${detail ? "  -> " + detail : ""}`); } };
const skipped = (name, why) => { skip++; console.log(`[verify] SKIP  ${name} (${why})`); };
const q = async (sql, p) => (await c.query(sql, p)).rows;
const n = async (sql, p) => (await q(sql, p))[0].n;
let sp = 0;
/** true if the statement raised an error (expected for forbidden actions). Uses a savepoint so the transaction survives. */
async function errors(sql, p) { const s = `sp${++sp}`; await c.query(`savepoint ${s}`); try { await c.query(sql, p); await c.query(`release savepoint ${s}`); return false; } catch { await c.query(`rollback to savepoint ${s}`); return true; } }

// ---------- 1. structure ----------
const colSql = `select table_schema||'.'||table_name||'.'||column_name||'|'||data_type||'|'||is_nullable||'|'||coalesce(numeric_precision::text,'')||'|'||coalesce(numeric_scale::text,'')||'|'||coalesce(character_maximum_length::text,'') as c
  from information_schema.columns where table_schema='tradenotes' or (table_schema='public' and table_name like 'tn\\_%') order by 1`;
const actual = new Set((await q(colSql)).map((r) => r.c));
const expected = fs.readFileSync(path.join(process.cwd(), "db", "expected-columns.txt"), "utf8").split("\n").filter(Boolean);
const missing = expected.filter((e) => !actual.has(e));
ok(`all ${expected.length} expected columns present with the right types`, missing.length === 0, missing.slice(0, 5).join(" ; "));

const tables = await q(`select n.nspname s, c.relname t, c.relrowsecurity rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and (n.nspname='tradenotes' or (n.nspname='public' and c.relname like 'tn\\_%'))`);
ok("22 TradeNotes tables exist", tables.length === 22, String(tables.length));
ok("row-level security enabled on every TradeNotes table", tables.every((t) => t.rls), tables.filter((t) => !t.rls).map((t) => t.t).join(","));
const pol = await q(`select tablename t, count(*)::int k from pg_policies where schemaname='tradenotes' group by 1`);
const polMap = Object.fromEntries(pol.map((r) => [r.t, r.k]));
ok("policies: profiles=2, subscriptions=1, payments=1, 9 user tables=1 each, audit_log=0, billing_events=0", polMap.profiles === 2 && polMap.subscriptions === 1 && ["accounts","strategies","imports","trades","trade_exits","trade_screenshots","reviews","playbook_items","trade_checks"].every((t) => polMap[t] === 1) && polMap.payments === 1 && !polMap.audit_log && !polMap.billing_events && !polMap.affiliates && !polMap.referrals && !polMap.commissions, JSON.stringify(polMap));
const trg = (await q(`select tgname from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='tradenotes' and not t.tgisinternal`)).map((r) => r.tgname);
const wantTrg = ["profiles_protect_admin","profiles_protect_counters","exits_owner","shots_owner","shots_count","trades_refs","imports_refs","reviews_cap","playbook_items_refs","trade_checks_refs"];
ok("safety triggers present", wantTrg.every((t) => trg.includes(t)), `have: ${trg.join(",")}`);
const fns = await q(`select p.proname, p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='tradenotes'`);
const fm = Object.fromEntries(fns.map((f) => [f.proname, f.prosecdef]));
ok("functions present; ownership checks + ensure_user are SECURITY DEFINER", ["uid","protect_admin_flag","check_trade_owner","check_trade_refs","check_import_refs","ensure_user"].every((f) => f in fm) && ["check_trade_owner","check_trade_refs","check_import_refs","ensure_user"].every((f) => fm[f] === true), JSON.stringify(fm));
ok("role app_user exists", (await n("select count(*)::int n from pg_roles where rolname='app_user'")) === 1);

// ---------- 2. behaviour (rolled back) ----------
const A = randomUUID(), B = randomUUID();
try {
  await c.query("begin");
  await c.query("insert into public.tn_user (id,name,email) values ($1,'A',$2),($3,'B',$4)", [A, `a-${A}@verify.invalid`, B, `b-${B}@verify.invalid`]);
  const as = async (id) => { await c.query("reset role"); await c.query("set local role app_user"); await c.query("select set_config('app.user_id',$1,true)", [id]); };
  const none = async () => { await c.query("reset role"); await c.query("set local role app_user"); await c.query("select set_config('app.user_id','',true)"); };

  await as(A);
  await q("select tradenotes.ensure_user()"); await q("select tradenotes.ensure_user()");
  const [acct] = await q("select id from tradenotes.accounts");
  ok("ensure_user is idempotent (A has exactly 1 account)", (await n("select count(*)::int n from tradenotes.accounts")) === 1);
  const [t] = await q("insert into tradenotes.trades (user_id,account_id,symbol,side,quantity,entry_price,opened_at) values ($1,$2,'EURUSD','long',1,1.1,now()) returning id", [A, acct.id]);
  await q("insert into tradenotes.trade_exits (trade_id,user_id,quantity,price) values ($1,$2,1,1.2)", [t.id, A]);
  const [st] = await q("insert into tradenotes.strategies (user_id,name) values ($1,'S') returning id", [A]);
  ok("A sees own trade and exit", (await n("select count(*)::int n from tradenotes.trades")) === 1 && (await n("select count(*)::int n from tradenotes.trade_exits")) === 1);

  await as(B); await q("select tradenotes.ensure_user()");
  ok("B sees none of A's trades / exits / strategies", (await n("select count(*)::int n from tradenotes.trades")) === 0 && (await n("select count(*)::int n from tradenotes.trade_exits")) === 0 && (await n("select count(*)::int n from tradenotes.strategies")) === 0);
  ok("B sees only own account, profile, subscription", (await n("select count(*)::int n from tradenotes.accounts")) === 1 && (await n("select count(*)::int n from tradenotes.profiles")) === 1 && (await n("select count(*)::int n from tradenotes.subscriptions")) === 1);
  ok("B cannot update or delete A's trades", (await c.query("update tradenotes.trades set symbol='HACK'")).rowCount === 0 && (await c.query("delete from tradenotes.trades")).rowCount === 0);
  const [bacct] = await q("select id from tradenotes.accounts");
  ok("B cannot attach an exit to A's trade", await errors("insert into tradenotes.trade_exits (trade_id,user_id,quantity,price) values ($1,$2,1,1)", [t.id, B]));
  ok("B cannot put a trade into A's account", await errors("insert into tradenotes.trades (user_id,account_id,symbol,side,quantity,entry_price,opened_at) values ($1,$2,'X','long',1,1,now())", [B, acct.id]));
  ok("B cannot use A's strategy", await errors("insert into tradenotes.trades (user_id,account_id,strategy_id,symbol,side,quantity,entry_price,opened_at) values ($1,$2,$3,'X','long',1,1,now())", [B, bacct.id, st.id]));
  // Screenshots (phase 1): rows are per-user, path must embed the owner's id and trade id, max 5 per trade.
  await as(A);
  const shot = (u, tr) => `${u}/${tr}/${randomUUID()}.png`;
  ok("A can record a screenshot for own trade", !(await errors("insert into tradenotes.trade_screenshots (trade_id,user_id,storage_path,size_bytes,content_type) values ($1,$2,$3,1000,'image/png')", [t.id, A, shot(A, t.id)])));
  ok("screenshot path must be <own user>/<trade>/<uuid>.<ext>", (await errors("insert into tradenotes.trade_screenshots (trade_id,user_id,storage_path) values ($1,$2,$3)", [t.id, A, shot(B, t.id)])) && (await errors("insert into tradenotes.trade_screenshots (trade_id,user_id,storage_path) values ($1,$2,$3)", [t.id, A, `${A}/${t.id}/../x.png`])));
  for (let i = 0; i < 4; i++) await q("insert into tradenotes.trade_screenshots (trade_id,user_id,storage_path,size_bytes) values ($1,$2,$3,10)", [t.id, A, shot(A, t.id)]);
  ok("a 6th screenshot on one trade is refused by the database", await errors("insert into tradenotes.trade_screenshots (trade_id,user_id,storage_path) values ($1,$2,$3)", [t.id, A, shot(A, t.id)]));
  ok("uploads are counted per user (rate window = 5 after 5 uploads)", (await n("select shot_window_count::int n from tradenotes.profiles where id = $1", [A])) === 5);
  ok("a user cannot reset their own upload counter", await errors("update tradenotes.profiles set shot_window_count = 0 where id = $1", [A]));
  // On plain Postgres this falls back to our own screenshot rows (>= 1040 here); on Supabase it reads the project's real storage, which can be
  // empty (0). Either way the call must work for app_user and return a non-negative number.
  const used = Number((await q("select tradenotes.storage_used_bytes() as b"))[0].b);
  ok("app_user can read total storage used (aggregate only)", Number.isFinite(used) && used >= 0, String(used));
  await as(B);
  ok("B sees none of A's screenshots", (await n("select count(*)::int n from tradenotes.trade_screenshots")) === 0);
  ok("B cannot attach a screenshot to A's trade", await errors("insert into tradenotes.trade_screenshots (trade_id,user_id,storage_path) values ($1,$2,$3)", [t.id, B, shot(B, t.id)]));
  ok("B cannot delete or relabel A's screenshots", (await c.query("delete from tradenotes.trade_screenshots")).rowCount === 0 && (await c.query("update tradenotes.trade_screenshots set caption='x'")).rowCount === 0);
  ok("B cannot change A's time zone or see A's profile", (await c.query("update tradenotes.profiles set timezone='UTC' where id=$1", [A])).rowCount === 0);
  // Reviews (phase 2): per-user rows; period day/week/month; week starts Monday, month on the 1st; text caps; 2,000 per user.
  await as(A);
  ok("A can save a day, a week and a month review", !(await errors("insert into tradenotes.reviews (user_id, period, period_start, went_well) values ($1,'day','2026-11-11','a'), ($1,'week','2026-11-09','b'), ($1,'month','2026-11-01','c')", [A])));
  ok("a second review for the same period is refused (one per period)", await errors("insert into tradenotes.reviews (user_id, period, period_start) values ($1,'week','2026-11-09')", [A]));
  ok("a week must start on a Monday and a month on the 1st; unknown periods are refused", (await errors("insert into tradenotes.reviews (user_id, period, period_start) values ($1,'week','2026-11-10')", [A])) && (await errors("insert into tradenotes.reviews (user_id, period, period_start) values ($1,'month','2026-11-15')", [A])) && (await errors("insert into tradenotes.reviews (user_id, period, period_start) values ($1,'year','2026-01-01')", [A])));
  ok("over-long review text is refused", await errors("insert into tradenotes.reviews (user_id, period, period_start, went_well) values ($1,'day','2026-11-12',repeat('x', 5001))", [A]));
  const upd1 = await c.query("update tradenotes.reviews set rule_breaks = 'edited' where period = 'day'");
  ok("A can edit own review", upd1.rowCount === 1);
  ok("a user cannot hold more than 2,000 reviews", !(await errors("insert into tradenotes.reviews (user_id, period, period_start) select $1, 'day', date '2000-01-01' + g from generate_series(0, 1996) g", [A])) && (await n("select count(*)::int n from tradenotes.reviews")) === 2000 && (await errors("insert into tradenotes.reviews (user_id, period, period_start) values ($1,'day','1999-01-01')", [A])));
  ok("editing an existing review still works when the user is at the 2,000 limit (upsert)", !(await errors("insert into tradenotes.reviews (user_id, period, period_start, went_well) values ($1,'day','2026-11-11','edited at the cap') on conflict (user_id, period, period_start) do update set went_well = excluded.went_well", [A])) && (await n("select count(*)::int n from tradenotes.reviews where went_well = 'edited at the cap'")) === 1);
  await as(B);
  ok("B sees none of A's reviews", (await n("select count(*)::int n from tradenotes.reviews")) === 0);
  ok("B cannot edit or delete A's reviews", (await c.query("update tradenotes.reviews set went_well = 'hacked'")).rowCount === 0 && (await c.query("delete from tradenotes.reviews")).rowCount === 0);
  ok("B cannot write a review as A", await errors("insert into tradenotes.reviews (user_id, period, period_start) values ($1,'day','2026-11-20')", [A]));
  // Playbook (phase 2): items belong to a strategy of the same user; checks link a trade and an item of the same user.
  await as(A);
  const [pi] = await q("insert into tradenotes.playbook_items (user_id, strategy_id, text, position) values ($1,$2,'Wait for the retest',1) returning id", [A, st.id]);
  ok("A can add a playbook item to own strategy and tick it on own trade", !(await errors("insert into tradenotes.trade_checks (trade_id,item_id,user_id,followed) values ($1,$2,$3,true)", [t.id, pi.id, A])));
  ok("a check is one row per trade and item (a second insert is refused)", await errors("insert into tradenotes.trade_checks (trade_id,item_id,user_id,followed) values ($1,$2,$3,false)", [t.id, pi.id, A]));
  ok("playbook item text must be 1 to 200 characters", (await errors("insert into tradenotes.playbook_items (user_id, strategy_id, text) values ($1,$2,'')", [A, st.id])) && (await errors("insert into tradenotes.playbook_items (user_id, strategy_id, text) values ($1,$2,repeat('x',201))", [A, st.id])));
  ok("a strategy cannot hold more than 80 playbook items", !(await errors("insert into tradenotes.playbook_items (user_id, strategy_id, text) select $1, $2, 'item ' || g from generate_series(1, 79) g", [A, st.id])) && (await errors("insert into tradenotes.playbook_items (user_id, strategy_id, text) values ($1,$2,'one too many')", [A, st.id])));
  await as(B);
  ok("B sees none of A's playbook items or checks", (await n("select count(*)::int n from tradenotes.playbook_items")) === 0 && (await n("select count(*)::int n from tradenotes.trade_checks")) === 0);
  ok("B cannot edit or delete A's playbook items or checks", (await c.query("update tradenotes.playbook_items set text = 'x'")).rowCount === 0 && (await c.query("delete from tradenotes.playbook_items")).rowCount === 0 && (await c.query("update tradenotes.trade_checks set followed = false")).rowCount === 0 && (await c.query("delete from tradenotes.trade_checks")).rowCount === 0);
  ok("B cannot add an item to A's strategy", await errors("insert into tradenotes.playbook_items (user_id, strategy_id, text) values ($1,$2,'hijack')", [B, st.id]));
  ok("B cannot tick an item on A's trade, or tick A's item on own trade", (await errors("insert into tradenotes.trade_checks (trade_id,item_id,user_id,followed) values ($1,$2,$3,true)", [t.id, pi.id, B])) && (await errors("insert into tradenotes.trade_checks (trade_id,item_id,user_id,followed) select (select id from tradenotes.trades limit 1), $1, $2, true", [pi.id, B])));
  ok("B cannot write a playbook row as A", (await errors("insert into tradenotes.playbook_items (user_id, strategy_id, text) values ($1,$2,'forged')", [A, st.id])) && (await errors("insert into tradenotes.trade_checks (trade_id,item_id,user_id,followed) values ($1,$2,$3,true)", [t.id, pi.id, A])));
  ok("B cannot make themselves admin", await errors("update tradenotes.profiles set is_admin = true"));
  const upd = await (async () => { try { await c.query("savepoint su"); const r = await c.query("update tradenotes.subscriptions set plan='pro'"); await c.query("release savepoint su"); return r.rowCount; } catch { await c.query("rollback to savepoint su"); return 0; } })();
  ok("self-upgrade changed 0 rows", upd === 0, String(upd));
  ok("B cannot insert a paid subscription row", await errors("insert into tradenotes.subscriptions (user_id,plan) values ($1,'pro')", [B]));
  ok("B cannot insert a payment record", await errors("insert into tradenotes.payments (id,user_id,amount_cents,currency,status) values ('x',$1,100,'USD','paid')", [B]));
  ok("B cannot read or write billing events", (await errors("select 1 from tradenotes.billing_events")) && (await errors("insert into tradenotes.billing_events (id,type,payload) values ('e','t','{}')")));
  ok("B cannot read or write affiliate tables", (await errors("select 1 from tradenotes.affiliates")) && (await errors("select 1 from tradenotes.referrals")) && (await errors("select 1 from tradenotes.commissions")) && (await errors("insert into tradenotes.commissions (affiliate_id,payment_id,base_cents,commission_cents,payable_after) values (gen_random_uuid(),'x',1,1,now())")));
  await c.query("reset role");
  await c.query("insert into tradenotes.payments (id,user_id,amount_cents,currency,status) values ($1,$2,2400,'USD','paid')", [`verify-${A}`, A]);
  await as(B);
  ok("B cannot see A's payment history", (await n("select count(*)::int n from tradenotes.payments")) === 0);
  await as(A);
  ok("A sees own payment history", (await n("select count(*)::int n from tradenotes.payments")) === 1);
  await as(B);
  ok("B cannot write the audit log", await errors("insert into tradenotes.audit_log (action) values ('x')"));
  ok("app code cannot read login tables (users, sessions, accounts)", (await errors("select 1 from public.tn_user")) && (await errors("select 1 from public.tn_session")) && (await errors("select 1 from public.tn_account")));
  await none();
  ok("no signed-in user => sees no trades or accounts", (await n("select count(*)::int n from tradenotes.trades")) === 0 && (await n("select count(*)::int n from tradenotes.accounts")) === 0);
  ok("ensure_user refuses without a signed-in user", await errors("select tradenotes.ensure_user()"));

  for (const role of ["anon", "authenticated"]) {
    await c.query("reset role");
    let can = true; try { await c.query("savepoint r"); await c.query(`set local role ${role}`); await c.query("release savepoint r"); } catch { await c.query("rollback to savepoint r"); can = false; }
    if (!can) { skipped(`${role} API role checks`, "role not present or not switchable"); continue; }
    for (const tbl of ["public.tn_user","public.tn_session","public.tn_account","public.tn_verification","public.tn_rate_limit","tradenotes.trades","tradenotes.profiles","tradenotes.subscriptions"]) {
      await c.query("reset role"); await c.query(`set local role ${role}`);
      ok(`${role} (public API key) cannot read ${tbl}`, await errors(`select 1 from ${tbl} limit 1`));
    }
  }
} finally {
  await c.query("rollback").catch(() => {});
  await c.end().catch(() => {});
}
console.log(`[verify] ${pass} passed, ${fail} failed, ${skip} skipped (isolation test rolled back; nothing written)`);
process.exit(fail ? 1 : 0);
