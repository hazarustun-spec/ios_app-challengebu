# Supabase OTP + Magic Link Setup (Plan 8 Phase A7)

Plan 8 sign-in screen requires Supabase to issue BOTH a 6-digit OTP code AND a magic link in the same email so users can pick the path that suits them (iOS Mail one-time-code AutoFill for the code, or tap-to-open for the link).

Backend setup is via the Supabase Studio dashboard (no migration). Do this once per environment (local dev, staging, production).

## 1. Enable Email + OTP

1. Open project → **Authentication** → **Providers** → **Email**
2. Set:
   - **Enable Email Provider** = ON
   - **Confirm email** = OFF (users sign in immediately on OTP verify; no separate confirmation step)
   - **Secure email change** = ON (default)
   - **Secure password change** = leave default
3. Scroll to "Email OTP" — set:
   - **Enable Email OTP** = ON
   - **OTP Expiration** = 600 seconds (10 minutes — gives slow mail servers a window)
4. Save

## 2. Update the Magic Link email template

1. **Authentication** → **Email Templates** → **Magic Link**
2. Verify the template body contains BOTH `.Token` AND `.ConfirmationURL`. If it doesn't, replace with:

   ```
   <h2>Tennis Challenger giriş kodun</h2>
   <p>Aşağıdaki 6 haneli kodu uygulamaya gir:</p>
   <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; font-family: monospace;">{{ .Token }}</p>
   <p>Veya doğrudan tıkla:</p>
   <p><a href="{{ .ConfirmationURL }}">Giriş yap</a></p>
   <p>Kod 10 dakika içinde geçerli.</p>
   ```
3. Save

## 3. Set redirect URLs

1. **Authentication** → **URL Configuration**
2. Add to **Redirect URLs**:
   - `tenniskampus://auth/callback`
   - (For local dev only) `http://localhost:8081/--/auth/callback` if you also test via Expo Web
3. Save

## 4. Verify

From a local Expo client:
1. Tap "Üniversite e-postanla başla" on welcome
2. Enter a valid `@example.edu.tr` / `@example.edu.tr` / etc. address
3. Check Mailpit (local dev) at `http://127.0.0.1:54324` — confirm the mail has both the 6-digit code AND a tappable link
4. Enter the code in the app's OTP screen → confirm sign-in succeeds

## Notes

- **Local dev:** Supabase CLI auto-provisions the auth provider with sane defaults. The above template change must be made via the local Studio at `http://127.0.0.1:54323` if you've customized auth config — otherwise the defaults work.
- **Production:** Apply the same steps in the production Supabase project before launching. Document the production project ID in the team handoff.
- **No DB migration:** This configuration is entirely runtime state managed by Supabase Auth — no SQL changes needed.
