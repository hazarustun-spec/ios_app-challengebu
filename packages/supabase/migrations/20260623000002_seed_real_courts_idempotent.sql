-- The real Boğaziçi courts were created by RENAMING seed.sql placeholders
-- ('Kort 1/2', 'Bebek Kort') in 20260619000003. But seed.sql only runs on a
-- local `db reset` — on a cloud `db push` (migrations only) those placeholders
-- never exist, so only the INSERT'd 'Anadolu Hisarı' survived and Bebek/BURC 1/2
-- were missing. Seed the real courts idempotently so the catalog is identical on
-- local, cloud, and every future deploy.
insert into public.courts (name, display_order, is_active)
select v.name, v.ord, true
from (values ('Bebek', 10), ('BURC 1', 20), ('BURC 2', 30)) as v(name, ord)
where not exists (select 1 from public.courts c where c.name = v.name);
