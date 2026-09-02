# App Store Review — Response for the 12 Aug 2026 rejection

## Reviewer message (paste into App Store Connect → Resolution Center)

Copy the block below into the reply field for the current submission.

---

Hi App Review Team,

Thank you for the detailed feedback. We took both findings seriously and
have addressed the root cause in build 37 (v1.1.0). Below is a summary of
what changed and how it resolves each guideline.

**Guideline 2.1(a) — Performance / App Completeness**

You reported that the app appeared to only allow "Bogazici University"
email holders to sign up.

The previous build gated sign-up to a fixed list of that single
university's e-mail sub-domains. That gate has been replaced with a
generic check that accepts **any e-mail address ending in the Turkish
academic top-level `.edu.tr`** — the standard suffix all Turkish
universities share, not a per-institution allow-list.

- The sign-in screen no longer shows any university-specific quick-fill
  chips (the previous UI displayed
  `@std.bogazici.edu.tr`, `@bogazici.edu.tr`, and
  `@alumni.bogazici.edu.tr` chips as a helper).
- The e-mail hint text now reads
  ".edu.tr uzantılı üniversite e-postaları kabul edilir."
- The dedicated App Review demo account (`appreview42@proton.me`) still
  signs in on a single tap so a reviewer can proceed without a
  university mailbox. Steps are documented in the App Review Notes.

**Guideline 4.1(b) — Design / Copycats**

You reported that the app appeared to resemble Boğaziçi University
without authorization.

We are not affiliated with, endorsed by, sponsored by, or a copy of any
specific university. The rejection wording referenced the single
university whose e-mail domains were listed in the sign-in UI. We have
removed every reference that could suggest such an affiliation:

- The sign-in screen no longer names or lists any university-specific
  domain (only the generic `.edu.tr` gate).
- App Store metadata (name, subtitle, description, keywords, promotional
  text, release notes) contains no university name, logo, or branding.
- Legal documents (Privacy Policy, KVKK notice, Terms) have been
  re-titled and their bodies rewritten so they no longer reference any
  specific university.
- The website (shimal.app/challengebu) has been updated to match.
- In-app copy that carried a stale university-specific prefix (for
  example the "Bagel" achievement description) has been rewritten in
  the app and in the production database.

"ChallengeBu!" is our own product name; it is not derived from any
university's brand or acronym. The app is an independent community
tennis ladder for university players (of any Turkish university) and
does not use another party's name, logo, colors, marketing text, or
visual assets.

We appreciate your review and are happy to provide any further
information you need.

Thanks,
Hazar Üstün
hazarustun@gmail.com

---

## Release notes (App Store Connect → "What's New in This Version")

Note: since v1.0 has not yet been released to the public, App Store
Connect will *skip* the release-notes upload on this submission (it is
still the first version). The text below is kept for reference; on the
first update after v1.0 launches, paste it into the "What's New" field.

```
Bu sürüm, uygulamayı tek bir üniversiteye özel olmaktan çıkarır:
• Kayıt artık .edu.tr uzantılı tüm üniversite e-postalarına açık.
• Giriş ekranı, arayüz ve yasal metinler kurumdan bağımsız hale getirildi.
• Kart adları, rozet açıklamaları ve destek metni sadeleştirildi.
Küçük hata düzeltmeleri ve stabilite iyileştirmeleri.
```

---

## App Review Notes (already in the current submission)

`apps/mobile/fastlane/metadata/review_information/notes.txt` was
regenerated and pushed to App Store Connect on this submission via
`fastlane metadata`. It documents:

- The single-tap review-account sign-in (no OTP mailbox needed).
- The generic `.edu.tr` gate for real users.
- Pre-seeded review data (leaderboard, matches, notifications,
  messaging + block/report).
- Full match lifecycle steps (start → score → confirm).
- iPad compatibility-mode note.
- Guideline 1.2 messaging Report/Block flow.
- Demo video URL.

No further changes to that file are required for this submission.
