# Caption Clarity — repair handoff

## Release status: PASS

Work order: `caption-clarity-repair-3`
Verifier report: `.factory/verification-3.md`, report commit
`e83784c57dcb99f92652bf0d7292be4db85a5176`
Repaired candidate base: `2b8be4b8437d3cd3936a186a4cf66b382bc8b537`
Repair commit: `72e9bec` (`fix: meet touch target size requirements`)
Completed: 2026-08-28 UTC

## Repair

The verifier found one P2 release blocker: several visible links and the
Keyboard route disclosure had boxes smaller than the required 44 × 44 CSS px.

- The home brand, desktop header links, footer legal links, supporter-panel
  legal links, and legal-page contact links now have centered 44 px minimum
  inline and block hit areas.
- The Keyboard route `<summary>` now has a 44 px minimum hit box while
  retaining its native disclosure behavior and focus styling.
- No player, caption parsing, profile, privacy, PWA, or deployment-policy
  behavior changed.

## Regression coverage

`tests/app.spec.ts` now has a browser regression that measures every reported
target at 390 × 844 and 1440 × 900, plus the legal-page contact links. It
fails if either dimension is below 44 px. The existing keyboard, Axe, local
media, persistence, offline, and service-worker update flows remain covered.

Live 390 px measurements after deployment:

| Target | Width × height |
| --- | --- |
| Caption Clarity home | 146.89 × 44 px |
| Keyboard route | 129.61 × 44 px |
| Footer Privacy / Terms | 51.23 × 44 / 44 × 44 px |
| Supporter Privacy / Terms | 52.45 × 44 / 44 × 44 px |

At desktop, Player is 44.20 × 44 px and Supporter is 70.33 × 44 px.

## Verification

Clean install and production checks completed successfully:

```bash
npm ci                    # 55 packages; 0 vulnerabilities
npm test                  # 2 files, 10 tests passed
npm run build             # tsc --noEmit and Vite production build passed
npm run test:e2e          # 7 local Chromium flows passed
```

`npm run build` produced `dist/` with 32.42 KB raw / 11.61 KB gzip JavaScript
and 18.01 KB raw / 5.13 KB gzip CSS. There is no package-consumer check for
this static Vite PWA, and no separate lint command; type checking is part of
the build.

Browser and accessibility checks:

- Local production preview was visually reviewed at 1440 px desktop and
  390 × 844 mobile; the mobile layout has no horizontal overflow.
- Axe WCAG 2 A/AA checks passed with zero violations in light, dark, mobile,
  privacy, and terms views. Keyboard coverage confirms the visible skip link
  and `C`/`E` player shortcuts; the new regression covers all repaired targets.
- `/opt/fleet/lib/verify-url.sh` passed locally and live: HTTP 200, no console
  or page errors, title, `lang=en`, one `h1`, main landmark, and image alt
  attributes all present. Its simple text scraper reports one unlabeled button
  inside a closed `<details>`; that button has visible text (**Verify license**)
  when expanded and Axe/Lighthouse both report accessible button names.
- A fresh mobile Lighthouse run produced Performance **94**, Accessibility
  **100**, FCP **0.9 s**, LCP **1.7 s**, TBT **280 ms**, and CLS **0**. The CLI
  returned a Chromium `TARGET_CRASHED` warning during its final full-page
  artifact/BFCache collection after producing the report, so that invocation
  is recorded transparently rather than presented as a clean CLI exit.

Privacy, PWA, and policy checks:

- A browser privacy smoke test created the app's IndexedDB and local-storage
  keys, used **Clear saved data on this device**, and confirmed both were gone.
- Local Chromium passed controlled offline reload and the safe synthetic
  waiting-service-worker update test. The deployed-site suite passed the
  applicable offline reload; the update simulation remains local-only so it
  never mutates production.
- A fresh live session requested only the Caption Clarity origin (root, local
  JS/CSS, icon, and hero image): no analytics, CDN, remote font, or third-party
  runtime request. The optional license endpoint was not contacted.
- Live response policy was verified: CSP includes `frame-ancestors 'none'`
  and `object-src 'none'`; Permissions-Policy, `X-Frame-Options: DENY`,
  `nosniff`, and Referrer-Policy are present. `sw.js` is no-cache/no-store,
  the manifest is `application/manifest+json` and daily-revalidated, and
  hashed assets are one-year immutable.
- All 16 public application files in the fresh `dist/` output were compared
  byte-for-byte with the custom-domain responses. `staticwebapp.config.json`
  is host-consumed configuration and intentionally excluded from that public
  file comparison.

Live Chromium verification:

```bash
PLAYWRIGHT_BASE_URL=https://caption-clarity.sociobot.in \
  npm run test:e2e -- --grep-invert 'announces a waiting service-worker update'
# 6 applicable flows passed
```

## Deployment

Artifact class remains `pwa-offline`; deployment remains static Vite output.

- Azure Static Web Apps deployment: `a7a48ba2-aeb3-46e3-8f63-523d9ed9e2ef`
- Static host: `https://brave-smoke-0f9d96c0f.7.azurestaticapps.net`
- Public URL: https://caption-clarity.sociobot.in/

For a subsequent deployment:

```bash
npm run build
/opt/fleet/lib/deploy-static.sh caption-clarity dist
```

## Known gaps / next steps

No product or release-blocking gaps remain. If a fully clean Lighthouse CLI
exit is required for archival evidence, rerun it in an environment where the
Chromium full-page artifact collector does not crash; the generated report's
scores and all functional, Axe, offline, policy, and live checks passed.
