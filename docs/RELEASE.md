# Production release runbook

Cloud project: `zbjkauljjdosyuwguuhv` (Supabase). iOS app id: `app.challengebu.ios`,
Apple team `4MBWF4RGV7`.

This covers the two launch blockers that are **account/dashboard** work (the
code/config is already in the repo). Do them before the first TestFlight/App
Store build.

---

## 2. Production email (SMTP) — REQUIRED for real OTP login

Locally, auth emails go to Mailpit/Inbucket. The **hosted** project has no custom
SMTP, so Supabase's built-in mailer is used — which is rate-limited to a handful
of emails/hour and **not usable for real users**. Configure a real provider.

### a) Pick an SMTP provider
Any works; cheapest to start: **Resend** (free tier) or **Brevo**. Create an
account, verify your sending domain (or use their shared sender for testing),
and get SMTP credentials (host, port `587`, username, password) + a verified
**From** address (e.g. `noreply@challengebu.app`).

### b) Configure SMTP on the hosted project
Supabase Dashboard → **Authentication → Emails → SMTP Settings**:
- Enable **Custom SMTP**
- Host / Port (587) / Username / Password from the provider
- **Sender email** = your verified From address, Sender name = `ChallengeBu`

### c) Set the OTP email templates on the hosted project
The app's sign-in shows a **6-digit code** screen, so the emails must contain the
code (`{{ .Token }}`), not just a magic link. Locally this is wired via
`packages/supabase/config.toml` → `packages/supabase/templates/otp-code.html`.
On the hosted project, set the same content in
Dashboard → **Authentication → Emails → Templates**:
- **Confirm signup** → paste the body of `packages/supabase/templates/otp-code.html`
- **Magic Link** → same content
(Both must surface `{{ .Token }}`. Subject e.g. "ChallengeBu giriş kodun".)

### d) Site URL / redirects
Dashboard → **Authentication → URL Configuration**:
- **Site URL** = your production web URL (config.toml's `http://localhost:3000` is
  local-only; the OTP flow uses the code, but magic-link/redirect needs a real URL).
- Add any redirect URLs the app uses.

> Verify: request an OTP from a TestFlight build with a real email — the 6-digit
> code should arrive from your domain within seconds.

---

## 3. APNs production host — REQUIRED for push on TestFlight/App Store

Dev (Xcode) builds use the APNs **sandbox**; TestFlight & App Store builds use
**production** APNs. The push host is a Vault value so it flips without a redeploy.
Currently `apns_host` = sandbox (for dev testing).

**When you ship the production/TestFlight build**, run
`packages/supabase/scripts/set-apns-prod-host.sql` (Dashboard → SQL Editor) to set:
```
apns_host = https://api.push.apple.com
```
⚠️ This makes production push work and **stops** dev/Xcode (sandbox) push. To go
back to local device testing, set it to `https://api.sandbox.push.apple.com`.

(One Vault value = one environment at a time. If you need both simultaneously
later, store the token's environment per row and pick the host accordingly — a
follow-up, not needed for launch.)

---

## Other launch items (not in this runbook — for reference)
- App Store Connect app registration → put the real `ascAppId` in `eas.json`
  (currently `FILL_AFTER_ASC_REGISTRATION`).
- Store metadata: screenshots, description, **Privacy Policy URL** (host real KVKK
  / privacy pages — currently `hazarustun-spec.github.io` spec pages), support URL.
- App Privacy (data-collection disclosure) + export compliance
  (`ITSAppUsesNonExemptEncryption`) + age rating.
- `eas build --profile production` → TestFlight → `eas submit`.
