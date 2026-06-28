// seed-confirm.js — TWO-USER SEEDING, part 4 of 4.
//
// After the signed-in user submits the final score in-UI, the match sits at
// status awaiting_confirmation with winner_team set. Both players must confirm.
// This script settles the match from the OPPONENT's side AND finalizes it so
// the flow can assert a confirmed end-state.
//
// NOTE: production confirmation goes through the confirm-match edge function,
// which also applies ELO + badges once BOTH sides confirm. This E2E asserts
// VISIBLE UI states, not ELO math, so we set the terminal row directly
// (confirmed_by = both players, status = confirmed). If you need real ELO
// effects, call the confirm-match function for each participant instead.
//
//   SQL equivalent (see .maestro/seed/04-confirm.sql):
//     update public.matches set
//       confirmed_by = team_a_player_ids || team_b_player_ids,
//       confirmed_at = now(),
//       status = case when winner_team = 'void' then 'voided' else 'confirmed' end
//     where id = :matchId;

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

// Newest scored-but-unconfirmed match the opponent is in.
var matches = rest(
  'matches?select=id,team_a_player_ids,team_b_player_ids,winner_team&team_b_player_ids=cs.' +
    encodeURIComponent('{' + opponentId + '}') +
    '&status=eq.awaiting_confirmation&winner_team=not.is.null&order=created_at.desc&limit=1',
);
var m = matches && matches.length ? matches[0] : null;

if (m) {
  var both = m.team_a_player_ids.concat(m.team_b_player_ids);
  http.request(SUPA + '/rest/v1/matches?id=eq.' + m.id, {
    method: 'PATCH',
    headers: H,
    body: JSON.stringify({
      confirmed_by: both,
      confirmed_at: new Date().toISOString(),
      status: m.winner_team === 'void' ? 'voided' : 'confirmed',
    }),
  });
  output.confirmedMatchId = m.id;
} else {
  output.confirmedMatchId = 'NO_MATCH';
}
