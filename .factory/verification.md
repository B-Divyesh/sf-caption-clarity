# Verification report — FAIL

**Work order:** `caption-clarity-verify-1`  
**Candidate:** `72fd58a828d85920ff7430483bd0b92739d640e2` (`main` at start of verification)  
**Public URL:** https://caption-clarity.sociobot.in/  
**Verified:** 2026-08-27 UTC  
**Scope:** independent, read-only product QA. Product source was not changed.

## Release decision

**FAIL.** The advertised core `Pause on my terms` control fails for a normal
starting condition: playback can start inside the first/current cue that
contains a marked term without pausing or displaying the resume card. This
does not meet the brief's required pause-on-keyword profile behavior.

## Reproducible release blocker

### P1 — Pause-on-term misses the current/first matching cue

1. Load a browser-playable local WebM and this valid VTT:

   ```vtt
   WEBVTT

   00:00:00.000 --> 00:00:01.200
   We meet at fifteen.
   ```

2. Enable **Pause on my terms** (the default profile includes `fifteen`).
3. Seek to `00:00.200`, where that cue is already visible, then start
   playback with Space or the video control.

Fresh Chromium evidence from an animated two-second local WebM, 400 ms after
starting: `duration: 1.999701`, `paused: false`, `time: 0.625977`,
`pauseCardHidden: true`, cue text `We meet at fifteen.` The player continued
through the marked term with no pause card.

Control case: a non-matching first cue followed by a matching cue paused at
the transition (`paused: true`, `time: 0.60179`, `pauseCardHidden: false`).
Thus the feature works only when a cue changes after playback starts; it
misses the current cue because it has already been rendered.

This is a common local-player flow, including starting a newly loaded video
whose first caption contains a term, and it defeats the specific assistance
setting promised by the product and researched brief.

## Other defects and deployment observations

### P2 — Static-host cache policy is not immutable/long-lived

Live HTML, hashed JS, CSS, images, `sw.js`, manifest, and legal pages all
returned `Cache-Control: public, must-revalidate, max-age=30`. The PWA service
worker makes offline use work, but the deployment does not provide the
factory PWA guidance's long-lived immutable cache policy for hashed assets.

### P2 — Missing browser security policies on the live response

The root response has HSTS (`max-age=10886400`), `Referrer-Policy:
strict-origin-when-cross-origin`, and `X-Content-Type-Options: nosniff`, but
no Content-Security-Policy/`frame-ancestors` or Permissions-Policy. The
manifest is also served as `application/octet-stream` rather than a manifest
JSON media type. These were not the cause of the functional failure, but they
are deployment hardening gaps for a local-file application.

### P3 — Lighthouse runner cleanup instability

Mobile Lighthouse recorded Performance 92 and Accessibility 100, with FCP
1.1 s, LCP 1.4 s, TBT 340 ms, and CLS 0, then reported `Browser tab has
unexpectedly crashed` during final artifact collection. Treat those scores as
informational rather than a clean Lighthouse gate. This was not reproduced in
the Playwright browser checks.

## Evidence of checks that passed

### Clean checkout, tests, and build

An isolated detached worktree at exactly the candidate SHA was created at
`/tmp/caption-clarity-verify-72fd58a`.

| Check | Result |
| --- | --- |
| `npm ci` | Pass; 56 audited packages, 0 vulnerabilities |
| `npm test` | Pass; 1 file, 8 tests |
| `npm run build` | Pass; TypeScript check and Vite production build |
| `npm run test:e2e` | Pass; 3 Chromium tests after installing the declared Playwright browser |
| Output JS | 32.39 kB raw / 11.61 kB gzip (under 200 kB) |
| Output CSS | 17.73 kB raw / 5.09 kB gzip (under 50 kB) |
| Mobile hero | 58 kB WebP (under 300 kB) |

There is no separate lint script; the exact build command includes
`tsc --noEmit`.

### Product behavior

- Existing end-to-end tests passed: local generated WebM + VTT overlay and
  emphasis, profile save/reload, JSON export, light/dark/mobile/legal Axe,
  and offline reload.
- Independent browser probes accepted valid two-cue SRT after rejecting a
  wrong extension, malformed VTT, and a 5,000,001-byte caption file. They
  verified recovery with a valid import after invalid JSON.
- Both line-length boundaries (24, 72) and caption-size boundaries (20, 52)
  updated their displayed values. Imported and newly saved profiles persisted
  through reload.
- Keyboard `C` changed captions from `aria-pressed=true` to `false`; `E`
  advanced guided emphasis to more. Native video controls remain available.
- At 390 x 844 CSS px, there was no horizontal overflow. A visual mobile
  review found the player and controls stack in task order.

### Accessibility and motion

- Exactly one `main` and one `h1`; document `lang=en`; descriptive title;
  skip link present.
- Keyboard focus revealed the skip link with a teal 3 px visible outline.
- Axe WCAG 2 A/AA serious/critical findings: none on desktop, 390 px mobile,
  privacy, or terms. The live 390 px page also had none.
- In a `prefers-reduced-motion: reduce` context, the file-zone transition was
  `0.00001s` and the media query matched.

### PWA, privacy, and live deployment identity

- Local and live service-worker-controlled pages reloaded successfully while
  Playwright network was offline.
- A controlled synthetic new `sw.js` response on the production build caused
  the in-app update toast, **“A fresh map is ready. Update app”**, to appear;
  a controller was active. This validates the update-notification path without
  changing the candidate.
- A normal fresh live session made no outbound requests: only the
  caption-clarity origin loaded. There are no remote fonts, analytics, or
  runtime CDN calls. License verification is not invoked without a stored
  license; source review confirms that only that optional action contacts the
  stated Sociobot API.
- The live 390 px page loaded with HTTP 200, no console errors, no page
  errors, no horizontal overflow, no serious/critical Axe finding, and a
  successful offline reload.
- Every one of the 16 files in the freshly built `dist/` compared byte-for-byte
  equal to its public URL counterpart: app HTML, privacy/terms, manifest,
  service worker, offline page, JS/CSS, hero assets, icons, robots, and
  sitemap. The live deployment therefore matches this candidate's build.

## Required next step

Fix and regress-test pause-on-term when playback begins in an already active
matching cue (including the first cue at time zero), then repeat this
verification. The release must remain **FAIL** until that core flow pauses and
offers the explicit resume action.
