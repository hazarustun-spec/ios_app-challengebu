-- Courts
insert into public.courts (name, display_order) values
  ('Kort 1', 1),
  ('Kort 2', 2),
  ('Bebek Kort', 3);

-- Departments are seeded via migration 20260611000002_departments_full_seed.sql
-- (full university lisans + lisansüstü list grouped by faculty / enstitü). The legacy
-- block here was removed to avoid duplicate inserts after `supabase db reset`.

-- Badges catalog is seeded via migration 20260608000001_seed_badges.sql
-- (35 MVP badges across 7 categories). The legacy seed block was removed
-- to avoid duplicate `code` collisions with the migration insert.
