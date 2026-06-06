create table public.courts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index courts_display_order_idx on public.courts (display_order);

alter table public.courts enable row level security;

create policy "Courts viewable by all authenticated"
  on public.courts for select
  to authenticated
  using (true);

create policy "Only admins manage courts"
  on public.courts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  faculty text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index departments_name_idx on public.departments (name);
create index departments_faculty_idx on public.departments (faculty);

alter table public.departments enable row level security;

create policy "Departments viewable by all authenticated"
  on public.departments for select
  to authenticated
  using (true);

create policy "Only admins manage departments"
  on public.departments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Now add the FK from profiles → departments
alter table public.profiles
  add constraint profiles_department_fk
  foreign key (department_id) references public.departments(id);
