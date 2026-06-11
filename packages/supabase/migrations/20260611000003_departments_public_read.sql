-- Plan 8 Phase D polish: departments are reference data (no PII) so allow
-- anon read. Onboarding flows that haven't yet completed auth bootstrap
-- (e.g., dev shortcuts) need to populate the department dropdown.

create policy "Departments viewable publicly"
  on public.departments for select
  to anon
  using (true);
