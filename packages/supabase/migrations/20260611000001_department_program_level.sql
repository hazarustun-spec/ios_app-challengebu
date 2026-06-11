-- Plan 8 Phase D polish: distinguish lisans vs lisansüstü programs

create type department_program_level as enum ('lisans', 'lisansustu');

alter table public.departments
  add column program_level department_program_level not null default 'lisans';

-- Most existing rows are lisans; the seed in step 2 will override as needed.
comment on column public.departments.program_level is
  'Onboarding filters by this — undergraduates pick from lisans, graduates from lisansustu.';

create index departments_program_level_idx
  on public.departments (program_level, display_order);
