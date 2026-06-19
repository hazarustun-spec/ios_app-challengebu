-- Real Boğaziçi tennis courts (replacing the "Kort 1/2" placeholders) + the
-- first competitive season (Yaz 2026). Idempotent so it is safe on reset.

-- Courts: keep "Bebek Kort", rename the two placeholders, add Anadolu Hisarı.
update public.courts set name = 'Burç Kort 1', display_order = 20 where name = 'Kort 1';
update public.courts set name = 'Burç Kort 2', display_order = 30 where name = 'Kort 2';
update public.courts set display_order = 10 where name = 'Bebek Kort';
insert into public.courts (name, display_order, is_active)
values ('Anadolu Hisarı Kort', 40, true)
on conflict (name) do nothing;

-- First season — Yaz 2026: 6 Temmuz → 27 Eylül 2026 (Europe/Istanbul, +03).
-- Finale = last week (20–27 Eylül). Status 'active' so the full season
-- experience is testable now; the season_lifecycle cron will move it to
-- 'finale' on 20 Eylül and 'closed' after 27 Eylül.
insert into public.seasons
  (name, year, starts_at, ends_at, finale_starts_at, finale_ends_at, status)
values
  ('yaz', 2026,
   '2026-07-06 00:00:00+03', '2026-09-27 23:59:59+03',
   '2026-09-20 00:00:00+03', '2026-09-27 23:59:59+03',
   'active')
on conflict (name, year) do nothing;
