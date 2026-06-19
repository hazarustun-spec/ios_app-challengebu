-- Strip the trailing " Bölümü" / " Bölümleri" suffix from department names so
-- the picker and profile show just the department (e.g. "İşletme" instead of
-- "İşletme Bölümü", "Sosyoloji" instead of "Sosyoloji Bölümü"). Non-department
-- units (… Birimi / … Programı / … Koordinatörlüğü / "Hukuk") are left intact —
-- only the explicit "Bölüm" suffix is removed.

update public.departments
set name = regexp_replace(name, '\s*Bölüm(ü|leri)$', '')
where name ~ '\s*Bölüm(ü|leri)$';
