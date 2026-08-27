# Caption Clarity — build handoff

Work order: `caption-clarity-build-1`

Completed: 2026-08-27

## What shipped

- A production Vite + TypeScript PWA with static output in `dist/`.
- End-to-end local viewing: choose or drag a browser-playable video plus WebVTT/SRT captions, then render a synchronized HTML caption overlay without uploading either file.
- Robust caption parsing for VTT/SRT timestamps, identifiers, cue settings, multiline cues, common VTT markup/entities, malformed/empty input, and exclusive cue end times.
- Adjustable caption profile: user terms, terms-only/guided/more emphasis, line length, type size, backdrop strength, top/middle/bottom position, and pause-on-term.
- Multiple named profiles in IndexedDB, active-profile persistence, JSON export/import, and clear local-data control.
- Native video controls plus Space, left/right arrow, C, and E keyboard shortcuts.
- File, empty, codec/error, save/import, online/offline, paused-keyword, and app-update states.
- Light/dark treatment, 390 px phone layout, safe-area padding, visible focus, reduced-motion fallback, and a topographic cartography visual system.
- Original generated topographic hero, responsive WebP exports (58 KB and 137 KB), hand-authored app mark, and 192/512/maskable PWA icons. Prompt and provenance are in `.factory/design.md` and `assets/src/`.
- Install manifest and a hand-written service worker that precaches the app shell, discovers hashed production assets, caches runtime assets, provides navigation fallback, cleans versioned caches, and exposes an update toast.
- Optional $12 Trail Supporter license flow through the production Sociobot endpoint: hosted buy link, return-token capture/URL cleanup, local token storage, daily cached verification, offline-safe cached unlock, paste-to-restore, revoke messaging, remove-device control, and cosmetic palettes only. No accessibility or caption feature is gated.
- Dedicated `/privacy/` and `/terms/` pages, robots/sitemap, a complete README, and MIT license.

## Verification

Clean dependency install and audit:

- `npm ci` — pass
- `npm audit --omit=dev` — 0 vulnerabilities

Quality gates:

- `npm test` — pass, 8 unit tests
- `npm run build` — pass; `dist/index.html` present
- `npm run test:e2e` — pass, 3 Chromium flows
  - generated a local WebM, loaded two VTT cues, rendered emphasis, saved/reloaded a profile, and exported JSON
  - Axe WCAG 2 A/AA: 0 violations in light, dark, 390 px mobile, privacy, and terms views
  - 390 px horizontal overflow check: pass
  - Playwright `context.setOffline(true)` reload: pass after service-worker control
  - console error assertion on the core flow: pass

Production asset budgets from the Vite build:

- JavaScript: 32.39 KB raw / 11.61 KB gzip (budget 200 KB)
- CSS: 17.73 KB raw / 5.09 KB gzip (budget 50 KB)
- Mobile hero: 58 KB WebP (budget 300 KB)
- No web fonts or runtime CDN scripts

Lighthouse 13 mobile against `npm run preview`:

- Performance 97
- Accessibility 100
- Best Practices 100
- SEO 100
- LCP 1.7 s, CLS 0, Total Blocking Time 170 ms, Speed Index 0.9 s
- INP is not available in a single-load lab run; TBT is recorded as the lab responsiveness proxy.

## Run

```bash
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Static deploy root: `dist/`.

## Known gaps and next steps

- The 25% rewind-reduction success target needs a real 30-minute comprehension study; the app instruments no users or analytics by design.
- Playback format support follows the browser. MP4/H.264 and WebM are recommended; unsupported codecs produce an actionable error.
- Caption Clarity styles supplied captions but cannot repair wrong/missing words and does not perform speech recognition or audiological personalization.
- The factory still needs to register the paid product/return URL before a real checkout can complete. No product ID or secret is hardcoded. The UI and verifier follow the production API contract, but a paid token was not available for a live purchase test.
- iOS/Android install prompts vary by browser; the installable web manifest and maskable icons are present. No native Capacitor wrapper was needed for this static PWA.
