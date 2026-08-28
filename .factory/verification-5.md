# Caption Clarity — independent verification 5

## Verdict: PASS

Verified on 2026-08-28 UTC against candidate commit
`4511c147195b8436c43b8906b002ebca4c65dd53` and the production URL
<https://caption-clarity.sociobot.in/>. This was a fresh clone of the GitHub
repository at that exact detached commit; no product source was changed during
verification.

## Local release checks

Fresh install and exact production build completed in
`/tmp/caption-clarity-verify-5.AzXEGF`:

```text
npm ci                    55 packages added; 0 vulnerabilities
npm test                  2 files passed; 10 tests passed
npm run build             tsc --noEmit + vite build passed
npx playwright test       7 Chromium tests passed (20.8 s)
```

There is no lint script in `package.json`; `npm run build` includes the
available TypeScript type check. The build emits `dist/` with one initial
JavaScript bundle of 32,425 B raw / 11.61 kB gzip and one stylesheet of
18,013 B raw / 5.13 kB gzip, both within the 200 kB JS and 50 kB CSS budgets.
The 390px hero image is 58,728 B, also within budget.

The first unassisted `npm run test:e2e` attempt was interrupted when the
ephemeral preview process was killed by the command harness after five tests;
the same production preview held open independently then ran all seven tests
successfully. The two PWA-specific tests were also rerun separately and
passed: offline reload and waiting-worker update toast.

## Product journeys and boundaries

Chromium coverage exercised the real local-file job:

- Loaded a generated local WebM plus VTT and SRT captions; rendered and
  emphasized the active `fifteen` cue; saved a named profile, reloaded it, and
  exported its JSON backup.
- Confirmed pause-on-marked-term pauses even when playback begins inside the
  first cue; keyboard `C` toggles captions and `E` rotates emphasis.
- Rejected an unsupported `.txt`, a malformed VTT, and a 5,000,001-byte VTT
  with specific recovery messages, then successfully loaded a valid SRT.
- Confirmed 24-character / 52px / 55% UI limits, and validated import
  recovery. A malformed import was rejected; an imported profile with
  out-of-range values was safely clamped to 72 characters, 20px, 100%, bottom
  position, and 100 terms.
- Confirmed normal local profile persistence and, in a disposable live browser
  profile, that **Clear saved data on this device** removed the
  `caption-clarity` IndexedDB database and all product local-storage keys.

## Browser, accessibility, and PWA

- The complete local suite includes 1440px desktop and 390×844 mobile. Manual
  full-page screenshots of the live page found no mobile horizontal overflow
  or clipped controls; the player/controls stack in task order on mobile.
- Keyboard smoke coverage passed: the skip link receives first focus; it has a
  visible 3px focus outline. All previously reported navigation, disclosure,
  and legal targets were measured at least 44×44 CSS px on desktop and mobile.
- Axe WCAG 2 A/AA passed with **zero violations** for light, dark, mobile,
  privacy, and terms pages; serious and critical findings are therefore zero.
  Live `verify-url.sh` also found title, `lang=en`, exactly one h1, a main
  landmark, and no images missing `alt`; no console or page errors occurred.
  Its simple closed-details scan reports one visually hidden button, but Axe
  confirms the expanded **Verify license** control has an accessible name.
- A reduced-motion Chromium context reported a `0.00001s` hero transition,
  consistent with the motion-reduction policy.
- Local controlled offline reload passed after service-worker installation.
  The synthetic local waiting-worker update flow showed the in-app update
  toast. The deployed suite also passed offline reload; update simulation was
  intentionally local-only and did not mutate production.

## Privacy, network, deployment, and performance

- A fresh live browser session made requests only to
  `https://caption-clarity.sociobot.in` (document, local JS/CSS, icon, and
  first-party hero image). It made no analytics, advertising, CDN, remote-font,
  or other third-party request. The optional license endpoint was not invoked.
- Live headers on the document include CSP with `frame-ancestors 'none'`,
  `object-src 'none'`, and the scoped Sociobot `connect-src`; also
  `Permissions-Policy`, `X-Frame-Options: DENY`, `nosniff`, HSTS, and
  `Referrer-Policy: strict-origin-when-cross-origin`. `sw.js` is
  `no-cache, no-store, must-revalidate`; the manifest is
  `application/manifest+json` with daily revalidation; hashed assets are
  one-year immutable.
- All **16** deployable application files in the fresh `dist/` output matched
  the custom-domain responses byte-for-byte: HTML routes, worker, manifest,
  offline page, robots, sitemap, icons, images, CSS, and JS. The seventeenth
  `dist/staticwebapp.config.json` is Azure Static Web Apps host configuration,
  not a public response body. The live deployment therefore matches the
  candidate product artifact.
- Fresh mobile Lighthouse report: Performance **94**, Accessibility **100**,
  FCP **0.9 s**, LCP **1.4 s**, TBT **290 ms**, CLS **0**. Lighthouse emitted
  `TARGET_CRASHED` only while gathering its final full-page screenshot/BFCache
  artifact after the report had been written; the scores and all independent
  browser checks above completed successfully.

## Defects by severity

None found.

- P0: none
- P1: none
- P2: none
- P3: none

The Lighthouse post-report Chromium artifact crash is an environment/tooling
warning, not a reproducible product failure; it is documented above for
traceability.
