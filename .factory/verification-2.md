# Verification report — FAIL

**Work order:** `caption-clarity-verify-2`  
**Candidate:** `9cffe6773aade0ea2f05b9a4b29cff5d8f446570`  
**Public URL:** https://caption-clarity.sociobot.in/  
**Verified:** 2026-08-27 UTC  
**Scope:** fresh independent QA from a clean checkout. Product source was not
changed; this report and the handoff are the only repository changes.

## Release decision

**FAIL.** The repaired core player is working and the live deployment exactly
matches the candidate, but the live static host does not meet the PWA
performance/caching acceptance requirement for long-lived immutable hashed
assets. It also lacks the expected browser security policies. These are
deployment configuration defects, not source-code regressions.

## Defects

### P2 — Hashed production assets are only cacheable for 30 seconds

Fresh `HEAD` responses for the root, hashed JavaScript
`/assets/main-CyVIkjsk.js`, hashed CSS `/assets/main-Cy_LeO8h.css`, service
worker, legal page, and manifest each returned:

```
Cache-Control: public, must-revalidate, max-age=30
```

The acceptance contract calls for long-lived immutable caching for hashed
static assets. The service worker's cache-first path makes offline reload work,
but it does not satisfy that HTTP caching policy for ordinary loads. Configure
the static host so content-hashed `/assets/*` has a long `max-age` plus
`immutable`, while HTML and `sw.js` remain revalidated.

### P2 — Missing response hardening policies; manifest has generic media type

The live root response has HSTS, `Referrer-Policy:
strict-origin-when-cross-origin`, and `X-Content-Type-Options: nosniff`, but
does not send a `Content-Security-Policy` (including `frame-ancestors`) or
`Permissions-Policy`. `/manifest.webmanifest` is served as
`application/octet-stream`, rather than a web-manifest JSON type. These are
hosting/configuration gaps for a local-file PWA; add a restrictive CSP and
Permissions-Policy, clickjacking protection, and a manifest media-type mapping.

No P0 or P1 defect was found. In particular, the prior P1 pause-on-current-cue
failure is fixed in this candidate and on the public site.

## Evidence that passed

### Clean install, tests, type check, and production build

| Check | Fresh result |
| --- | --- |
| Checkout | Clean at the requested SHA before verification |
| `npm ci` | Pass; 56 packages audited, 0 vulnerabilities |
| `npm test` | Pass; 1 file, 8 tests |
| `npm run build` | Pass; `tsc --noEmit` and Vite production build |
| `npm run test:e2e` | Pass; 4 Chromium tests |
| Lint | No separate lint script is defined; the production build's TypeScript check is the available static check |

The repository declares Playwright 1.62 while the preinstalled browser was for
another revision, so the first exact E2E invocation correctly reported the
missing executable. `npx playwright install chromium` installed the matching
Chromium revision; rerunning the unchanged exact command passed all four
tests.

### End-to-end product behavior

Independent Chromium checks on both the local production preview and live URL
covered the smallest useful product:

- A local generated WebM plus valid two-cue VTT/SRT displayed the custom
  overlay and applied emphasis (five marked token elements in the test cue).
- The regression flow sought to 00:00.200 inside the first cue containing
  `fifteen`, enabled **Pause on my terms**, then started playback. The video
  paused and the explicit resume card appeared. This was repeated on the live
  URL. The repository's new regression E2E also passed.
- Bad extension, malformed VTT, and a 5,000,001-byte caption were rejected
  with actionable errors; a valid SRT then loaded successfully with two cues.
- Range boundaries updated correctly: line length 24, caption size 52 px, and
  backdrop 55%. A named profile persisted after reload. Invalid JSON import
  was rejected; a valid portable profile envelope imported successfully.
- Keyboard-only checks: the visible 3 px teal skip-link focus ring appeared;
  `C` changed captions to `aria-pressed=false`, and `E` advanced emphasis.
  No keyboard trap was encountered.

### Accessibility, responsive behavior, errors, and motion

- `verify-url.sh` passed against both local production preview and public URL:
  HTTP 200, title, `lang=en`, one `<h1>`, a `<main>`, image alt attributes,
  and no console/page errors. Its apparent unlabeled button is the text-named
  **Verify license** button inside a closed `<details>`; it has an accessible
  visible label.
- Playwright Axe WCAG 2 A/AA scans found **zero serious or critical findings**
  on desktop, dark/light, 390 × 844 mobile, privacy, and terms views.
- At 390 px the document width equalled the viewport (390 px): no horizontal
  overflow. The normal product flow, local media, controls, and legal pages
  were exercised at that size.
- With `prefers-reduced-motion: reduce`, the media query matched and the
  file-zone transition duration was `0.00001s`.

### Privacy, PWA, identity, and performance

- A fresh normal session made requests only to its own origin. There are no
  remote fonts, analytics, or runtime CDN calls. License verification is not
  requested without a user-supplied/stored license; source review confirms the
  optional Sociobot endpoint is the sole external runtime URL.
- Local profiles persisted in IndexedDB and exported/imported as JSON; local
  video and captions stayed as browser file/object-URL data. Privacy and terms
  pages are present.
- After a service-worker-controlled reload, `context.setOffline(true)` still
  reloaded the app shell successfully on both local preview and live URL. A
  separate temporary static test server served the candidate `sw.js`, then
  only appended a version comment for the next update response: the active
  app was controlled and showed **“A fresh map is ready. Update app”**. No
  product code or candidate artifact was changed.
- Every one of the 16 locally built `dist/` files compared byte-for-byte equal
  to its equivalent public URL: root, privacy/terms, hashed JS/CSS, manifest,
  service worker, offline page, artwork, icons, robots, and sitemap. The live
  deployment is therefore this candidate's build.
- Bundle budgets pass: JS 32,425 bytes raw / 11.61 KB gzip (≤ 200 KB), CSS
  17,735 bytes raw / 5.09 KB gzip (≤ 50 KB), and mobile hero WebP 58,728 bytes
  (≤ 300 KB). Fresh live mobile Lighthouse: performance **91**, accessibility
  **100**, FCP 1.0 s, LCP 1.4 s, TBT 380 ms, CLS 0.

## Required next step

Update the static-host response rules, redeploy, and repeat header checks:

1. Give content-hashed assets long-lived immutable caching.
2. Add a restrictive CSP/`frame-ancestors` and Permissions-Policy.
3. Serve `manifest.webmanifest` with a web-manifest JSON content type.

The player source does not require a functional repair for this candidate.
