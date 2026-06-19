-- Accepting an open-call applicant must ALSO create the upcoming match (so it
-- shows in "Yaklaşan" and drops out of the pending İlanlar feed) — mirroring the
-- direct-challenge accept-match-request flow. The previous RPC only flipped the
-- request to 'accepted' + set target_id, leaving the accepted match invisible.

create or replace function public.accept_match_application(
  p_request_id uuid,
  p_applicant_user_id uuid
) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  r record;
  v_applicant_partner uuid;
  v_played_at timestamptz;
  v_time text;
  v_team_a uuid[];
  v_team_b uuid[];
begin
  select status, creator_id, creator_partner_id, category, format, court_id,
         is_rated, proposed_date, proposed_time
    into r
    from public.match_requests
    where id = p_request_id
    for update;

  if r.creator_id is null then
    raise exception 'Request not found' using errcode = '42704';
  end if;
  if r.creator_id <> uid then
    raise exception 'Only request creator can accept applications' using errcode = '42501';
  end if;
  if r.status <> 'pending' then
    raise exception 'Request is not pending' using errcode = 'P0001';
  end if;

  select applicant_partner_id into v_applicant_partner
    from public.match_request_applications
    where request_id = p_request_id and applicant_id = p_applicant_user_id;
  if not found then
    raise exception 'No application found for that applicant' using errcode = '42704';
  end if;

  update public.match_requests
    set target_id = p_applicant_user_id,
        target_partner_id = v_applicant_partner,
        status = 'accepted',
        accepted_at = now()
    where id = p_request_id;

  -- Build the upcoming match (awaiting score + confirmation).
  v_time := r.proposed_time::text;
  if length(v_time) = 5 then v_time := v_time || ':00'; end if;
  v_played_at := (r.proposed_date::text || ' ' || v_time)::timestamptz;
  v_team_a := array_remove(array[r.creator_id, r.creator_partner_id], null);
  v_team_b := array_remove(array[p_applicant_user_id, v_applicant_partner], null);

  insert into public.matches (
    match_request_id, category, format, court_id, played_at, is_rated,
    team_a_player_ids, team_b_player_ids, status
  ) values (
    p_request_id, r.category, r.format, r.court_id, v_played_at, r.is_rated,
    v_team_a, v_team_b, 'awaiting_confirmation'
  );
end;
$$;

revoke all on function public.accept_match_application(uuid, uuid) from public;
grant execute on function public.accept_match_application(uuid, uuid) to authenticated;
