// get-otp.js — fetch the latest 6-digit OTP for the EMAIL account from the
// LOCAL Mailpit inbox (Supabase local mail catcher on :54324) and expose each
// digit as output.d0..d5 (+ output.otp).
//
// Adapted verbatim from qa/maestro/get-otp.js — the email-OTP login technique
// is unchanged for the current app (app.challengebu.ios); only the .maestro
// location moved. The 6-box OTP input auto-advances focus per digit, so we
// expose each digit separately for individual `inputText` steps (typing all 6
// at once drops characters).
var inbox = typeof EMAIL !== 'undefined' ? EMAIL : 'alice@std.bogazici.edu.tr';
var listRes = http.get('http://127.0.0.1:54324/api/v1/messages');
var data = json(listRes.body);
var msgs = (data.messages || []).filter(function (m) {
  return JSON.stringify(m.To).indexOf(inbox) >= 0;
});
if (msgs.length === 0) {
  output.otp = 'NOCODE';
} else {
  var mid = msgs[0].ID;
  var msg = json(http.get('http://127.0.0.1:54324/api/v1/message/' + mid).body);
  var text = (msg.Text || '') + ' ' + (msg.HTML || '');
  // Prefer the labelled code ("code: 862385") over any 6-digit run that may
  // appear inside the magic-link token URL.
  var match =
    text.match(/code:\s*(\d{6})/i) ||
    text.match(/kod:\s*(\d{6})/i) ||
    text.match(/(\d{6})/);
  var otp = match ? match[1] : '000000';
  output.otp = otp;
  for (var i = 0; i < 6; i++) {
    output['d' + i] = otp.charAt(i);
  }
}
