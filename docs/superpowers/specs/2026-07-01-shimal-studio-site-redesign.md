# shimal.app studio site redesign

**Date:** 2026-07-01
**Branch:** plan-8-ui-redesign

## Goal
Turn `shimal.app` into a professional **mobile software studio** landing page, based on the
Claude Design template `Shimal.dc.html` (imported via the claude_design MCP), and unify the
existing ChallengeBu sub-pages under the same visual system.

## Decisions (confirmed with the user)
- **Language:** English for the studio homepage; ChallengeBu + legal pages stay Turkish.
- **Honesty:** Only ChallengeBu is a real product. No fake claims.
  - Astrology app shown as *coming soon* (in development), not live.
  - The design's "5 apps · 2 live" stats replaced with qualitative facts: `Native · 2025 · İstanbul`.
  - LinkedIn / X contact cards removed — email only (`hello@shimal.app`).
  - ChallengeBu is not on the App Store yet → button reads "Coming to the App Store" and links to `/challengebu`.
- **Scope:** Also re-skin the ChallengeBu page + legal pages to match.
- **Hosting:** GitHub Pages; `website/` is the site root.

## Visual system
- Background `#f1f1ee`, ink `#111`, accent `#2626F5` (studio) / `#2270BC` (ChallengeBu page).
- Helvetica Neue / system font stack (dropped Google Fonts → faster, unified).
- White rounded cards (`#e2e2dd` borders), dashed borders for "coming soon".
- Signature elements: blue SHI/MAL hero block, scrolling black marquee.

## Files
- `website/index.html` — new studio homepage (self-contained; template loops unrolled to static HTML).
- `website/challengebu/icon.png` — real app icon (from `xcode-icons/Icon-1024.png`).
- `website/challengebu/style.css` — rewritten to the studio design system.
- `website/challengebu/index.html` — re-skinned; content preserved.
- `website/challengebu/gizlilik.html`, `kosullar.html` — re-skinned; legal text unchanged.

## Conversion note
The source `Shimal.dc.html` is a Claude Design `x-dc` template (`sc-for` loops, `image-slot`
placeholders, a `DCLogic` render class). It requires the Claude Design runtime, so it was
converted to plain static HTML/CSS: loops unrolled, data hardcoded honestly, `image-slot`
replaced with the real icon and simple placeholder tiles.

## Open follow-ups (defaults chosen; easy to change)
- Services grid keeps all four (iOS / Android / Product design / Backend). Trim to iOS-only if the studio is iOS-focused.
- Location assumed İstanbul.
- Real App Store URL to be wired into the ChallengeBu card once the app is published.
