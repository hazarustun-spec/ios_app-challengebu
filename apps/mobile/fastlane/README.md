# Fastlane — App Store metadata & screenshots (deliver)

Metadata-as-code for App Store Connect. The text lives in `metadata/tr/*.txt` and
the screenshots in `screenshots/tr/*.png`, so a release is one command instead of
pasting in the ASC web UI.

## Regenerate screenshots (automated, via Maestro)

Screenshots are captured by `../.maestro/screenshots.yaml` on an **iPhone 16 Pro
Max** simulator (6.9" = 1320×2868, the App Store size). Maestro 2.x needs **JDK 17+**.

```sh
# prereqs: Supabase stack + Mailpit + Metro running; app installed on the Pro Max sim
export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
export PATH="$JAVA_HOME/bin:$HOME/.maestro/bin:$PATH"
maestro --device <ProMax-UDID> test \
  -e EMAIL=hazar.ustun@std.bogazici.edu.tr ../.maestro/screenshots.yaml
# then copy shots/*.png → fastlane/screenshots/tr/
```

The flow logs in only if logged out (reuses the session otherwise), dismisses the
dev-client + notification dialogs, and captures: Home (ELO hero), Leaderboard,
Profile, New-match cards.

## Upload to App Store Connect (deliver)

Needs an **App Store Connect API key** (ASC → Users and Access → Integrations →
generate a `.p8`). Then:

```sh
fastlane deliver --api_key_path /path/to/AuthKey.p8 \
  --app_identifier app.challengebu.ios
```

`deliver` reads `metadata/tr/` + `screenshots/tr/` and pushes them. Review in ASC
before submitting. (Not yet run — set up the API key first.)

## Still required in the ASC web UI (deliver doesn't cover)
- App Privacy (data-collection disclosure), Age rating, Category.
- Support URL + Privacy Policy URL.
- A reviewer demo account (the app gates login to Boğaziçi university emails).
