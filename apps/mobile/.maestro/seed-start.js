// seed-start.js — TWO-USER SEEDING, part 3 of 4.
//
// The "Maçı Başlat" lobby (app/match/[id]/start.tsx) needs BOTH participants
// in matches.started_by before it plays the burst and advances to score
// entry. The signed-in user adds themselves in-UI (start_match RPC); this
// script adds the OPPONENT, completing the handshake. The start screen's
// realtime UPDATE subscription then fires and routes to /score.
//
//   SQL equivalent (see .maestro/seed/03-start.sql):
//     update public.matches
//       set started_by = team_a_player_ids || team_b_player_ids
//     where id = :matchId;   -- (here we re-derive the match by opponent)

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

var profRows = rest(
  'profiles?select=user_id&email=eq.' + encodeURIComponent(OPP_EMAIL),
);
var opponentId = profRows && profRows.length ? profRows[0].user_id : null;

// Newest unscored match the opponent is in (team B). cs = array contains.
var matches = rest(
  'matches?select=id,team_a_player_ids,team_b_player_ids&team_b_player_ids=cs.' +
    encodeURIComponent('{' + opponentId + '}') +
    '&status=eq.awaiting_confirmation&winner_team=is.null&order=created_at.desc&limit=1',
);
var m = matches && matches.length ? matches[0] : null;

if (m) {
  var both = m.team_a_player_ids.concat(m.team_b_player_ids);
  http.request(SUPA + '/rest/v1/matches?id=eq.' + m.id, {
    method: 'PATCH',
    headers: H,
    body: JSON.stringify({ started_by: both }),
  });
  output.startedMatchId = m.id;
} else {
  output.startedMatchId = 'NO_MATCH';
}
