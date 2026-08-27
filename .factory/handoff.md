# Caption Clarity — repair handoff

## Release status: deployed and verified

Work order: `caption-clarity-repair-2`
Completed: 2026-08-27 UTC
Product deployment: commit `ec56512` to https://caption-clarity.sociobot.in/
Azure Static Web Apps deployment: `1624a059-9e30-45a9-876b-c0075ca97f8b`

The independent verifier's two P2 release blockers from
`.factory/verification-2.md` are repaired. The deployed player behavior that
already passed was preserved.

## Repair

- Added `public/staticwebapp.config.json`, which Vite ships at the deploy
  root. It gives Vite's content-hashed `/assets/*` files
  `Cache-Control: public, max-age=31536000, immutable`; `sw.js` uses
  no-cache/no-store revalidation; and the manifest revalidates daily.
- Moved the two intentionally named, updateable hero images from `/assets/` to
  `/images/`, so the immutable route contains only content-hashed build
  output. Their existing short host cache remains correct for files whose
  names do not change with content.
- Added a restrictive local-file-PWA CSP, including `frame-ancestors 'none'`,
  `object-src 'none'`, local Blob media/image support, and the only intentional
  external connection (`https://api.sociobot.in` for an optional license
  verification). Added Permissions-Policy, DENY framing, and a
  `.webmanifest` → `application/manifest+json` mapping.
- Advanced the service-worker cache name to `caption-clarity-v5` because its
  precache image paths changed.

## Regression coverage

- `src/hosting-config.test.ts` asserts immutable hashed asset policy,
  revalidated app entry points, CSP/frame protection, Permissions-Policy, and
  manifest MIME mapping (10 unit tests total).
- The Chromium suite now checks the visible skip-link focus path and the `C`
  / `E` player shortcuts, as well as the existing exact first/current cue
  pause regression.
- The suite now changes only the temporary built `sw.js`, requests a worker
  update, and asserts the visible **A fresh map is ready** update toast. The
  original temporary file is restored in `finally`.
- `PLAYWRIGHT_BASE_URL` permits the same browser assertions to run against a
  deployed site without changing the default local preview flow.

## Verification

Clean install and production checks:

```bash
npm ci
npm test                 # pass: 2 files, 10 tests
npm run build            # pass: TypeScript check and dist/ build
npx playwright install chromium
npm run test:e2e         # pass: 6 Chromium flows, local production preview
```

Additional completed checks:

- Azure Static Web Apps CLI emulation served the built artifact with the
  intended cache rules, MIME type, CSP, Permissions-Policy, and framing
  protection. `verify-url.sh` passed on that configured local server with no
  console/page errors, title/lang/one-h1/main/alt checks passing.
- The post-deploy live response has immutable one-year caching on both hashed
  JS/CSS, revalidates `sw.js`, serves the manifest as
  `application/manifest+json`, and sends CSP, Permissions-Policy,
  `X-Frame-Options: DENY`, `Referrer-Policy`, and `nosniff`.
- `PLAYWRIGHT_BASE_URL=https://caption-clarity.sociobot.in npm run test:e2e --
  --grep-invert 'announces a waiting service-worker update'` passed all five
  applicable live Chromium flows: cue pause, local files/profile/export,
  desktop + 390px Axe scans, keyboard, and controlled offline reload.
- The local six-flow run includes the safe synthetic worker-update test above.
  It does not mutate the deployed site.
- `/opt/fleet/lib/verify-url.sh` passed on the live URL: HTTP 200, title,
  `lang=en`, one h1, main landmark, image alt attributes, and no browser
  console/page errors. The helper reports one text-named button inside closed
  `<details>` as unlabeled; its visible name is **Verify license** and Axe
  passes.
- A fresh live browser session requested only
  `https://caption-clarity.sociobot.in`; no analytics, CDN, remote-font, or
  third-party runtime request occurred. The optional license endpoint was not
  contacted.
- All 16 public application files in `dist/` compared byte-for-byte equal to
  the deployed custom-domain responses. `staticwebapp.config.json` is consumed
  by the host rather than exposed as a public application file.
- Output budget remains well below limits: JS 32.42 KB raw / 11.61 KB gzip;
  CSS 17.73 KB raw / 5.09 KB gzip; mobile hero 58.73 KB WebP.

## Known gap

The fresh local Lighthouse CLI attempted in this container crashed its browser
tab during artifact collection, so it is not claimed as a new clean score.
The independent verification immediately before this repair recorded live
mobile Performance 91 and Accessibility 100; this repair did not increase
bundle or image bytes. All functional, Axe, offline, header, and live-identity
checks above passed.

## Deployment

The product remains a static Vite PWA. Deploy a fresh build with:

```bash
npm run build
/opt/fleet/lib/deploy-static.sh caption-clarity dist
```

Do not remove `public/staticwebapp.config.json`: it is the response-policy
contract that repairs the verifier's release blockers.
