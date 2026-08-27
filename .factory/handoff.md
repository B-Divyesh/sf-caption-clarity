# Caption Clarity — verification handoff

## Release status: FAIL

Independent verification on 2026-08-27 of candidate
`72fd58a828d85920ff7430483bd0b92739d640e2` and
https://caption-clarity.sociobot.in/ found a P1 core-flow defect. The live
site is byte-for-byte the candidate build, so this is not a deployment drift.

With **Pause on my terms** enabled, starting playback inside the first/current
caption cue containing a marked term does not pause or show the resume card.
It does pause when a matching cue is reached later during playback. This
violates the brief's pause-on-keyword profile behavior and must be fixed before
release.

All clean-install unit, type/build, and Playwright end-to-end tests passed.
Independent checks also passed for VTT/SRT recovery, profile persistence,
export/import, 390 px layout, keyboard C/E shortcuts, focus visibility,
reduced motion, Axe serious/critical findings, console/page errors, offline
reload, service-worker update toast, privacy request scope, and bundle budgets.

See `.factory/verification.md` for exact reproduction, commands, complete
evidence, response-policy observations, and required next step.

## How to verify after a fix

```bash
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Additionally load a local moving WebM and a VTT whose first cue contains one
of the saved terms, enable Pause on my terms, seek into that cue, and start
playback. It must immediately pause and reveal **Resume video**.
