-- HQ schema checks. Prints PASS/FAIL lines. Run after the customer schema + hq schema are applied.
\set ON_ERROR_STOP on
create temp table res (name text, ok boolean);
create or replace function pg_temp.expect_error(sql text) returns boolean language plpgsql as $$ begin execute sql; return false; exception when others then return true; end $$;
create or replace function pg_temp.expect_error_as(role_name text, sql text) returns boolean language plpgsql as $$
begin
  execute format('set local role %I', role_name);
  begin execute sql; execute 'reset role'; return false; exception when others then execute 'reset role'; return true; end;
end $$;

begin;
insert into res select 'every hq table has row-level security on', bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='hq' and c.relkind='r';
insert into res select 'hq has the expected 15 tables', count(*) = 15 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='hq' and c.relkind='r';
insert into res select 'anon cannot read hq.prospects', pg_temp.expect_error_as('anon', 'select 1 from hq.prospects');
insert into res select 'authenticated cannot read hq.customer_meta', pg_temp.expect_error_as('authenticated', 'select 1 from hq.customer_meta');
insert into res select 'authenticated cannot write hq.settings', pg_temp.expect_error_as('authenticated', $$insert into hq.settings(key,value) values ('x','1')$$);
insert into res select 'app_user (customer-request role) cannot read hq.messages', pg_temp.expect_error_as('app_user', 'select 1 from hq.messages');
insert into res select 'anon cannot see the hq schema objects (usage revoked)', not has_schema_privilege('anon', 'hq', 'usage') and not has_schema_privilege('authenticated', 'hq', 'usage') and not has_schema_privilege('app_user', 'hq', 'usage');

insert into hq.prospects (id, platform, handle) values ('00000000-0000-0000-0000-000000000001', 'tiktok', 'Sam_FX');
insert into res select 'handles are unique per platform, case-insensitive', pg_temp.expect_error($$insert into hq.prospects (platform, handle) values ('tiktok', 'sam_fx')$$);
insert into res select 'same handle on another platform is allowed', not pg_temp.expect_error($$insert into hq.prospects (platform, handle) values ('instagram', 'sam_fx')$$);
insert into res select 'unknown stage rejected', pg_temp.expect_error($$update hq.prospects set stage = 'closed_won'$$);
insert into hq.touches (prospect_id, kind, body) values ('00000000-0000-0000-0000-000000000001', 'dm', 'Hey Sam, saw your post');
insert into res select 'DB refuses the identical DM text twice', pg_temp.expect_error($$insert into hq.touches (prospect_id, kind, body) values ('00000000-0000-0000-0000-000000000001', 'followup', 'Hey Sam, saw your post')$$);
insert into hq.touches (prospect_id, kind, body) values ('00000000-0000-0000-0000-000000000001', 'followup', 'Bumping this');
insert into res select 'DB allows only ONE follow-up per prospect', pg_temp.expect_error($$insert into hq.touches (prospect_id, kind, body) values ('00000000-0000-0000-0000-000000000001', 'followup', 'Another bump')$$);
insert into res select 'many replies/notes are fine', not pg_temp.expect_error($$insert into hq.touches (prospect_id, kind, body) values ('00000000-0000-0000-0000-000000000001', 'reply', 'ok'), ('00000000-0000-0000-0000-000000000001', 'reply', 'ok')$$);
insert into res select 'bad link tag rejected', pg_temp.expect_error($$insert into hq.touches (prospect_id, kind, body, link_tag) values ('00000000-0000-0000-0000-000000000001', 'note', 'x', 'Bad Tag!')$$);

insert into res select 'post percentages must be 0-100', pg_temp.expect_error($$insert into hq.posts (platform, view_rate_3s) values ('tiktok', 140)$$);
insert into res select 'negative views rejected', pg_temp.expect_error($$insert into hq.posts (platform, views) values ('tiktok', -1)$$);
insert into res select 'content status must be in the pipeline', pg_temp.expect_error($$insert into hq.content_items (format, title, status) values ('F1', 't', 'published')$$);
insert into hq.content_items (idea_no, format, title) values (1, 'F1', 'a');
insert into res select 'idea numbers are unique', pg_temp.expect_error($$insert into hq.content_items (idea_no, format, title) values (1, 'F2', 'b')$$);

insert into public.tn_user (id, name, email) values ('00000000-0000-0000-0000-0000000000aa', 'T', 'cascade@verify.invalid');
insert into hq.customer_meta (user_id, notes) values ('00000000-0000-0000-0000-0000000000aa', 'n');
insert into hq.messages (user_id, step, subject, status) values ('00000000-0000-0000-0000-0000000000aa', 'd0', 's', 'sent');
insert into res select 'a nurture step cannot be sent twice', pg_temp.expect_error($$insert into hq.messages (user_id, step, subject, status) values ('00000000-0000-0000-0000-0000000000aa', 'd0', 's', 'sent')$$);
insert into hq.messages (user_id, step, subject, status) values ('00000000-0000-0000-0000-0000000000aa', 'd2', 's', 'failed');
insert into res select 'a failed attempt does not block a retry', not pg_temp.expect_error($$insert into hq.messages (user_id, step, subject, status) values ('00000000-0000-0000-0000-0000000000aa', 'd2', 's', 'sent')$$);
delete from public.tn_user where id = '00000000-0000-0000-0000-0000000000aa';
insert into res select 'deleting a customer erases their HQ notes and email log', (select count(*) from hq.customer_meta) = 0 and (select count(*) from hq.messages) = 0;
select case when ok then 'PASS' else 'FAIL' end || '  ' || name as line from res order by ok, name;
rollback;
