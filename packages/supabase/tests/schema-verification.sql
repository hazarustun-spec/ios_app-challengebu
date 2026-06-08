-- Schema Verification Script
-- Tüm assert'ler başarılı olursa script "OK" döner, hata varsa RAISE EXCEPTION ile durur.

do $$
declare
  expected_table_count constant int := 21;
  expected_court_count constant int := 3;
  expected_dept_min_count constant int := 30;
  expected_badge_min_count constant int := 30;
  actual int;
  tbl_without_rls text;
begin
  -- Table count
  select count(*) into actual from pg_tables where schemaname = 'public';
  if actual <> expected_table_count then
    raise exception 'Expected % public tables, got %', expected_table_count, actual;
  end if;
  raise notice 'PASS: % public tables', actual;

  -- All public tables have RLS
  select string_agg(t.tablename, ', ')
    into tbl_without_rls
  from pg_tables t
  join pg_class c on c.relname = t.tablename and c.relnamespace = (
    select oid from pg_namespace where nspname = 'public'
  )
  where t.schemaname = 'public' and c.relrowsecurity = false;

  if tbl_without_rls is not null then
    raise exception 'Tables without RLS: %', tbl_without_rls;
  end if;
  raise notice 'PASS: all public tables have RLS';

  -- Courts seed
  select count(*) into actual from public.courts;
  if actual <> expected_court_count then
    raise exception 'Expected % courts, got %', expected_court_count, actual;
  end if;
  raise notice 'PASS: % courts seeded', actual;

  -- Departments seed
  select count(*) into actual from public.departments;
  if actual < expected_dept_min_count then
    raise exception 'Expected at least % departments, got %', expected_dept_min_count, actual;
  end if;
  raise notice 'PASS: % departments seeded', actual;

  -- Badges seed
  select count(*) into actual from public.badges;
  if actual < expected_badge_min_count then
    raise exception 'Expected at least % badges, got %', expected_badge_min_count, actual;
  end if;
  raise notice 'PASS: % badges seeded', actual;

  -- is_admin function exists
  if not exists (
    select 1 from pg_proc where proname = 'is_admin' and pronamespace = (
      select oid from pg_namespace where nspname = 'public'
    )
  ) then
    raise exception 'is_admin function not found';
  end if;
  raise notice 'PASS: is_admin function exists';

  -- All expected categories enum values
  if not (select array_agg(enumlabel::text order by enumsortorder) = array[
    'erkek_tek', 'kadin_tek', 'open_tek',
    'erkek_cift', 'kadin_cift', 'karma_cift', 'open_cift'
  ]::text[]
  from pg_enum where enumtypid = (select oid from pg_type where typname = 'match_category')) then
    raise exception 'match_category enum values mismatch';
  end if;
  raise notice 'PASS: match_category enum has 7 values';

  -- Privacy: authenticated must NOT have SELECT on sensitive profile columns
  declare
    leak_count int;
  begin
    select count(*) into leak_count
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'profiles'
      and grantee = 'authenticated'
      and privilege_type = 'SELECT'
      and column_name in ('phone', 'email', 'role');
    if leak_count > 0 then
      raise exception 'Privacy regression: authenticated has SELECT on % sensitive profile column(s)', leak_count;
    end if;
    raise notice 'PASS: authenticated cannot SELECT phone/email/role on profiles';
  end;

  -- Privacy: public_profiles view exists and does NOT expose sensitive columns
  if not exists (
    select 1 from pg_views where schemaname = 'public' and viewname = 'public_profiles'
  ) then
    raise exception 'public_profiles view not found';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'public_profiles'
      and column_name in ('phone', 'email', 'role')
  ) then
    raise exception 'public_profiles view leaks a sensitive column';
  end if;
  raise notice 'PASS: public_profiles view exists and exposes only safe columns';

  raise notice 'ALL VERIFICATIONS PASSED';
end;
$$ language plpgsql;
