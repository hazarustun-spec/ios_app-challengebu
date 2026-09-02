-- Rebrand the Bagel badge description to match the current generic format
-- name ("Klasik"). The badge description carried a stale university-specific
-- prefix; this update removes the last on-screen reference that tied the app
-- to a single institution.

update public.badges
   set description_tr = '4-0 Klasik veya 6-0 set ile kazan'
 where code = 'bagel';
