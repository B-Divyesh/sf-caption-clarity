# Verification report — FAIL

**Work order:** `caption-clarity-verify-3`  
**Candidate:** `2b8be4b8437d3cd3936a186a4cf66b382bc8b537`  
**Public URL:** https://caption-clarity.sociobot.in/  
**Verified:** 2026-08-27 UTC  
**Scope:** independent QA from a clean checkout at the requested SHA. Product
source was not changed; this report and the handoff are the only changes made.

## Release decision

**FAIL.** The candidate is genuinely deployed and its local-file caption
player, persistence, privacy behavior, PWA shell, headers, and performance all
passed fresh checks. It nevertheless misses the factory accessibility
acceptance requirement that every touch/click target be at least 44 × 44 CSS
pixels. This is a P2 release blocker; no P0 or P1 defect was found.

## Defects

### P2 — Multiple visible interactive targets are smaller than 44 × 44 CSS px

Fresh Chromium bounding-box measurements at **390 × 844** found:

| Interactive element | Measured size |
| --- | --- |
| Caption Clarity home link | 147 × 36 px |
| Keyboard route `<summary>` | 122 × 22 px |
| Footer Privacy link | 51 × 14 px |
| Footer Terms link | 37 × 14 px |
| Support-panel Privacy / Terms links | 52 × 25 / 44 × 25 px |

At desktop width, the visible **Player** and **Supporter** header links were
44 × 23 and 70 × 23 px respectively; the footer legal links were also below
44 px high. These are semantic, keyboard-operable links/disclosures with a
visible focus ring, but do not meet the supplied 44 × 44 touch-target
acceptance rule. Give these controls a 44 px minimum interactive box (without
shrinking their adjacent spacing) and reverify at 390 px.

## Evidence that passed

### Clean install, static checks, and build

| Check | Fresh result |
| --- | --- |
| Requested checkout | Clean at `2b8be4b8437d3cd3936a186a4cf66b382bc8b537` before QA |
| `npm ci` | Pass; 56 packages audited, 0 vulnerabilities |
| `npm test` | Pass; 2 files, 10 tests |
| Type/lint | `npm run build` runs `tsc --noEmit`; no separate lint script is defined |
| Exact production build | Pass; Vite emitted `dist/` |
| `npm run test:e2e` | Pass; all 6 local Chromium flows |

The first browser invocation could not launch because the clean install's
Playwright 1.62.1 expected a Chromium revision not present in
`$PLAYWRIGHT_BROWSERS_PATH`. As permitted by the work order,
`npx playwright install chromium` installed that exact revision; rerunning the
unchanged command passed all six tests.

### End-to-end product behavior and recovery

- A generated local WebM plus a two-cue VTT rendered the custom overlay and
  emphasized configured terms. Starting at 00:00.200 inside the first marked
  cue with **Pause on my terms** enabled paused video and showed the explicit
  resume card. The same flow passed against the live URL.
- Valid WebVTT and SRT loaded. Wrong extension, malformed/backwards VTT, and a
  5,000,001-byte VTT produced clear actionable errors; a valid SRT immediately
  recovered the session (`recover.srt`, 1 cue, error hidden).
- Range boundary checks produced 24 characters, 52 px, and 55% respectively.
  Invalid profile JSON was rejected; valid imported values were safely clamped
  (line 72, size 20, backdrop 100, invalid position changed to bottom).
  Profile saving, reload persistence, JSON export, and import passed.
- A term containing `<img src=x onerror=alert(1)>` remained escaped text in
  the preview, with zero inserted images. There were no console or page
  errors during these checks.
- Keyboard-only behavior passed: the first Tab reached the skip link and made
  it visibly appear; C toggled captions (`aria-pressed=false`) and E advanced
  emphasis. No keyboard trap was encountered.

### Accessibility, responsive behavior, and motion

- The repository's Axe WCAG 2 A/AA scans passed with **zero violations** on
  light, dark, desktop, 390 px mobile, privacy, and terms pages. Thus there
  were zero serious/critical Axe findings.
- At 390 × 844, document scroll width was 390 px: no horizontal overflow. The
  local-file flow and controls were exercised at that width. Screenshots were
  visually reviewed at both 1440 px desktop and 390 px mobile.
- `prefers-reduced-motion: reduce` changed UI transition duration to 0.00001s;
  no looping animation was observed.
- Live mobile Lighthouse: **Performance 91**, **Accessibility 100**, FCP 1.1
  s, LCP 1.5 s, TBT 390 ms, CLS 0. Local mobile reruns scored 89/90/90
  Performance and 100 Accessibility (the live score and two of three local
  samples meet the 90 target; the one-point local variance is recorded for
  transparency).

### PWA, privacy, policies, live identity, and budgets

- On both local preview and live production, a service-worker-controlled
  browser context reloaded the app after `context.setOffline(true)`. The live
  registration was active with root scope and no waiting worker. The local
  update simulation (a temporary `dist/sw.js` comment, restored in `finally`)
  showed **A fresh map is ready. Update app**; no deployed artifact was
  modified.
- Fresh normal live browsing made requests only to
  `https://caption-clarity.sociobot.in`; no analytics, third-party font, CDN,
  or remote script request occurred. Source and CSP review confirm the sole
  optional external endpoint is the Sociobot license verification API, which
  is not called without a stored/supplied license. Profiles use IndexedDB;
  video/caption files are local object-URL/session data. The privacy-page
  clear-data action removed both Caption Clarity local-storage keys and the
  IndexedDB database in a fresh browser profile.
- Live root, legal pages, manifest, service worker, offline page, all four
  icons, both images, JS, CSS, robots, and sitemap (16 application files) were
  byte-for-byte identical to the fresh candidate `dist/` output. The public
  deployment therefore matches this candidate.
- Live headers passed: restrictive CSP including `frame-ancestors 'none'` and
  `object-src 'none'`, `Permissions-Policy`, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, and `Referrer-Policy` are present.
  Manifest is `application/manifest+json`; `sw.js` is no-cache/no-store; the
  content-hashed JS is `max-age=31536000, immutable`; HTML/legal pages are
  revalidated.
- Budget check passed: JS 32,425 bytes raw / 11.61 KB gzip (under 200 KB), CSS
  17,735 bytes raw / 5.09 KB gzip (under 50 KB), and mobile hero WebP 58,728
  bytes (under 300 KB). No remote fonts are shipped.

## Required next step

Increase the hit boxes for header/footer/legal links and the shortcut
disclosure to at least 44 × 44 CSS px, retain visible focus and mobile
spacing, then run the same 390 px touch-target measurement and regression
suite. No player, deployment-policy, or privacy repair is otherwise indicated
by this verification.
