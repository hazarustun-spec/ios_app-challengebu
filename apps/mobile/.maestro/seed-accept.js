// seed-accept.js — TWO-USER SEEDING, part 2 of 4.
//
// Runs AFTER the signed-in user sent a direct_challenge in-UI. Replicates the
// accept-match-request edge function from the OPPONENT's side: turn the
// pending match_request into a `matches` row (status awaiting_confirmation)
// and mark the request accepted. Exposes the new match id as output.matchId
// so the flow can deep-link straight to it.
//
//   SQL equivalent (see .maestro/seed/02-accept.sql):
//     with req as (
//       select * from public.match_requests
//       where target_id = :opponentId and status = 'pending'
//       order by created_at desc limit 1)
//     insert into public.matches (match_request_id, category, format, court_id,
//       played_at, is_rated, team_a_player_ids, team_b_player_ids, status)
//     select id, category, format, court_id,
//       (proposed_date || 'T' || proposed_time || 'Z')::timestamptz,
//       is_rated, array[creator_id], array[target_id], 'awaiting_confirmation'
//     from req returning id;
//     update public.match_requests set status='accepted'
//       where id = (select id from req);

var SUPA =
  typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : 'http://127.0.0.1:54321';
var KEY =
  typeof SERVICE_ROLE_KEY !== 'undefined'
    ? SERVICE_ROLE_KEY
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
var OPP_EMAIL =
  typeof OPPONENT_EMAIL !== 'undefined'
    ? OPPONENT_EMAIL
    : 'rakip.test@std.bogazici.edu.tr';

var H = {
  apikey: KEY,
  Authorization: 'Bearer ' + KEY,
  'Content-Type': 'application/json',
};

function rest(path) {
  return json(http.get(SUPA + '/rest/v1/' + path, { headers: H }).body);
}

// Resolve the opponent id from their seeded profile.
var profRows = rest(
  'profiles?select=user_id&email=eq.' + encodeURIComponent(OPP_EMAIL),
);
var opponentId = profRows && profRows.length ? profRows[0].user_id : null;

// Newest pending direct challenge aimed at the opponent.
var reqs = rest(
  'match_requests?select=*&target_id=eq.' +
    opponentId +
    '&status=eq.pending&order=created_at.desc&limit=1',
);
var req = reqs && reqs.length ? reqs[0] : null;

if (!opponentId || !req) {
  output.matchId = 'NO_PENDING_REQUEST';
} else {
  var time = req.proposed_time.length === 5 ? req.proposed_time + ':00' : req.proposed_time;
  var playedAt = new Date(req.proposed_date + 'T' + time + 'Z').toISOString();
  var teamA = req.creator_partner_id
    ? [req.creator_id, req.creator_partner_id]
    : [req.creator_id];
  var teamB = req.target_partner_id
    ? [req.target_id, req.target_partner_id]
    : [req.target_id];

  var ins = http.post(SUPA + '/rest/v1/matches', {
    headers: Object.assign({}, H, { Prefer: 'return=representation' }),
    body: JSON.stringify({
      match_request_id: req.id,
      category: req.category,
      format: req.format,
      court_id: req.court_id,
      played_at: playedAt,
      is_rated: req.is_rated,
      team_a_player_ids: teamA,
      team_b_player_ids: teamB,
      status: 'awaiting_confirmation',
    }),
  });
  var match = json(ins.body)[0];

  // Mark the request accepted (PATCH = update).
  http.request(SUPA + '/rest/v1/match_requests?id=eq.' + req.id, {
    method: 'PATCH',
    headers: H,
    body: JSON.stringify({ status: 'accepted' }),
  });

  output.matchId = match.id;
}
