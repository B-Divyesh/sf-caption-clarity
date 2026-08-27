# Caption Clarity — repair handoff

## Release status: deployed

Work order: `caption-clarity-repair-1`
Completed: 2026-08-27 UTC

Deployed to `https://caption-clarity.sociobot.in/` as a Standard Azure Static
Web App from commit `f78be23` (deployment
`896b09f7-3faa-4645-a393-2b3eaa3432de`).

## Repair completed

Fixed the P1 defect reported against candidate
`72fd58a828d85920ff7430483bd0b92739d640e2`: when **Pause on my terms** is
enabled, starting playback inside an already-active marked cue now immediately
pauses the video and reveals **Resume video**. The play transition deliberately
re-evaluates the visible cue, so a seek/start in the first matching cue follows
the same rule as a later matching cue.

Added the exact Chromium regression flow from the verifier report:

1. Load a local moving WebM and a VTT whose first cue includes `fifteen`.
2. Seek to `00:00.200` inside that first cue.
3. Enable Pause on my terms and start playback.
4. Assert that the resume card is visible and that the video is paused.

The service-worker cache version was advanced to `caption-clarity-v4` so an
already-installed app receives the changed player bundle and presents its
existing update path.

## Verification

Clean local install and checks:

- `npm ci` — pass; 0 vulnerabilities reported.
- `npm test` — pass; 8 unit tests.
- `npm run build` — pass; TypeScript check and production `dist/` output.
- `npx playwright install chromium` — completed.
- `npm run test:e2e` — pass; 4 Chromium flows:
  - exact first/current matching-cue seek/start pause regression;
  - local WebM + VTT overlay, emphasis, profile persistence, and export;
  - Axe WCAG 2 A/AA checks in light, dark, 390 px mobile, privacy, and terms;
  - service-worker-controlled offline reload.
- `/opt/fleet/lib/verify-url.sh http://127.0.0.1:4173/ …` against the
  production preview — pass; HTTP 200, title/lang/one h1/main/image alt
  checks, and no browser console or page errors.
- Post-deploy `/opt/fleet/lib/verify-url.sh https://caption-clarity.sociobot.in/ …`
  — pass; HTTPS 200 and no browser console or page errors.
- The exact local-WebM/VTT seek/start regression was also replayed against the
  live URL: the first current matching cue paused immediately, the resume card
  was visible, and no console errors were emitted.
- `npx @axe-core/cli` could not launch its separate Selenium Chrome binary in
  this container; the repository's Playwright Axe integration above ran
  successfully against Chromium instead.

Production asset sizes remain within the static PWA budget:

- JavaScript: 32.42 KB raw / 11.61 KB gzip (200 KB budget).
- CSS: 17.73 KB raw / 5.09 KB gzip (50 KB budget).
- Mobile hero: 58.73 KB WebP (300 KB budget).

## Run and deploy

```bash
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Deployment used `/opt/fleet/lib/deploy-static.sh caption-clarity dist`, which
provisions/updates the Standard static site and its custom domain.

## Known gaps / next steps

- The 25% rewind-reduction success target needs a real comprehension study;
  the app intentionally has no user analytics.
- Browser codec support determines local-video compatibility; MP4/H.264 and
  WebM are recommended.
- The factory still needs to register a paid product/return URL before a real
  supporter checkout can complete. Caption functionality is not gated.
