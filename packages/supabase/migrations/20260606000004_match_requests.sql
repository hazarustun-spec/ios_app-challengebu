create type match_request_type as enum ('direct_challenge', 'open_call');
create type match_format as enum ('bu_klasik', 'hizli_tiebreak', 'pro_set_8', '3set_klasik');
create type match_request_status as enum ('pending', 'accepted', 'rejected', 'expired', 'completed');
create type application_status as enum ('pending', 'selected', 'declined');

create table public.match_requests (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(user_id) on delete cascade,
  type match_request_type not null,
  target_id uuid references public.profiles(user_id) on delete cascade,
  category match_category not null,
  format match_format not null,
  is_rated boolean not null default true,
  proposed_date date not null,
  proposed_time time not null,
  court_id uuid not null references public.courts(id),
  creator_partner_id uuid references public.profiles(user_id),
  target_partner_id uuid references public.profiles(user_id),
  status match_request_status not null default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint direct_challenge_has_target check (
    (type = 'direct_challenge' and target_id is not null) or
    (type = 'open_call' and target_id is null)
  )
);

create index match_requests_creator_status_idx on public.match_requests (creator_id, status);
create index match_requests_target_status_idx on public.match_requests (target_id, status);
create index match_requests_type_status_idx on public.match_requests (type, status);
create index match_requests_expires_at_idx on public.match_requests (expires_at) where status = 'pending';
create index match_requests_category_idx on public.match_requests (category);

create trigger match_requests_set_updated_at
  before update on public.match_requests
  for each row
  execute function public.set_updated_at();

alter table public.match_requests enable row level security;

create policy "All authenticated can view match requests"
  on public.match_requests for select
  to authenticated
  using (true);

create policy "Users can create their own match requests"
  on public.match_requests for insert
  to authenticated
  with check (auth.uid() = creator_id);

create policy "Creator can update their own pending requests"
  on public.match_requests for update
  to authenticated
  using (auth.uid() = creator_id and status = 'pending')
  with check (auth.uid() = creator_id);

create policy "Target can accept/reject directed requests"
  on public.match_requests for update
  to authenticated
  using (auth.uid() = target_id and status = 'pending')
  with check (
    auth.uid() = target_id and
    status in ('accepted', 'rejected')
  );

create policy "Admins can do anything"
  on public.match_requests for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table public.open_call_applications (
  id uuid primary key default gen_random_uuid(),
  match_request_id uuid not null references public.match_requests(id) on delete cascade,
  applicant_id uuid not null references public.profiles(user_id) on delete cascade,
  applicant_partner_id uuid references public.profiles(user_id),
  status application_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (match_request_id, applicant_id)
);

create index open_call_apps_match_idx on public.open_call_applications (match_request_id);
create index open_call_apps_applicant_idx on public.open_call_applications (applicant_id);

alter table public.open_call_applications enable row level security;

create policy "Authenticated can view applications"
  on public.open_call_applications for select
  to authenticated
  using (true);

create policy "Users can create their own applications"
  on public.open_call_applications for insert
  to authenticated
  with check (auth.uid() = applicant_id);

create policy "Users can withdraw their own applications"
  on public.open_call_applications for delete
  to authenticated
  using (auth.uid() = applicant_id and status = 'pending');

create policy "Request creator can update application status"
  on public.open_call_applications for update
  to authenticated
  using (
    exists (
      select 1 from public.match_requests
      where id = match_request_id and creator_id = auth.uid()
    )
  );
