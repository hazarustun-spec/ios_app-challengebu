// seed-opponent.js — TWO-USER SEEDING, part 1 of 4.
//
// A single device/simulator can only be signed in as ONE user, but a full
// match lifecycle needs a second player (the opponent) to accept, start, and
// confirm. We therefore SEED that opponent (and later their actions) directly
// against the LOCAL Supabase stack, while the signed-in user drives their own
// half in-UI.
//
// WHY REST AND NOT psql: Maestro's runScript JS sandbox only exposes `http`
// (see get-otp.js) — there is no shell, so we cannot run
//   psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
// from here. Instead we use the LOCAL service-role REST + GoTrue admin API,
// which performs the exact same writes. The equivalent SQL is shown in
// comments and mirrored in .maestro/seed/*.sql for anyone driving seeding
// from psql instead.
//
// This script: create the opponent auth user + an ACTIVE 'kadin' profile so
// Alice's default kadin_tek challenge can target them. Idempotent.
//
//   SQL equivalent:
//     -- auth user via GoTrue admin (cannot be done in raw SQL safely)
//     insert into public.profiles (user_id, first_name, last_name, email,
//       pronoun, gender_category, class_year, skill_self_assessment,
//       dominant_hand)
//     values (:uid, 'Rakip', 'Test', :email, 'she/her', 'kadin', '2',
//       'orta', 'sag')
//     on conflict (user_id) do nothing;

var SUPA =
  typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : 'http://127.0.0.1:54321';
var KEY =
  typeof SERVICE_ROLE_KEY !== 'undefined'
    ? SERVICE_ROLE_KEY
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
var OPP_EMAIL =
  typeof OPPONENT_EMAIL !== 'undefined'
    ? OPPONENT_EMAIL
    : 'rakip.test@example.edu.tr';

var H = {
  apikey: KEY,
  Authorization: 'Bearer ' + KEY,
  'Content-Type': 'application/json',
};

// 1. Create the opponent auth user (idempotent: 422 if already registered).
var created = http.post(SUPA + '/auth/v1/admin/users', {
  headers: H,
  body: JSON.stringify({
    email: OPP_EMAIL,
    password: 'Passw0rd!seed',
    email_confirm: true,
  }),
});

var opponentId = null;
if (created.ok) {
  opponentId = json(created.body).id;
} else {
  // Already exists — look the id up from an existing profile, else the admin
  // user list (filtered by email client-side).
  var prof = http.get(
    SUPA +
      '/rest/v1/profiles?select=user_id&email=eq.' +
      encodeURIComponent(OPP_EMAIL),
    { headers: H },
  );
  var rows = json(prof.body);
  if (rows && rows.length > 0) {
    opponentId = rows[0].user_id;
  } else {
    var list = http.get(SUPA + '/auth/v1/admin/users?per_page=200', {
      headers: H,
    });
    var users = (json(list.body).users || []).filter(function (u) {
      return u.email === OPP_EMAIL;
    });
    if (users.length > 0) opponentId = users[0].id;
  }
}

if (!opponentId) {
  output.opponentId = 'SEED_FAILED';
} else {
  // 2. Upsert an ACTIVE 'kadin' profile (Prefer merge-duplicates → re-runnable).
  http.post(SUPA + '/rest/v1/profiles', {
    headers: Object.assign({}, H, {
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify({
      user_id: opponentId,
      first_name: 'Rakip',
      last_name: 'Test',
      email: OPP_EMAIL,
      pronoun: 'she/her',
      gender_category: 'kadin',
      class_year: '2',
      skill_self_assessment: 'orta',
      dominant_hand: 'sag',
      status: 'active',
    }),
  });
  output.opponentId = opponentId;
}
