# Caption Clarity

Caption Clarity is a private, offline-capable player for people who find some spoken words harder to distinguish. It plays a local video with a local WebVTT or SRT file and lets the viewer shape captions around their own needs: marked terms, shorter lines, larger text, stronger backdrops, caption position, and pause-on-term.

Nothing is uploaded. The app does not transcribe speech, bypass DRM, or offer medical recommendations.

Live product: <https://caption-clarity.sociobot.in>

## Features

- Local MP4/WebM/etc. playback using the browser's native codec support
- WebVTT and SubRip parsing with multiline cues
- User terms plus adjustable text-only “guided” emphasis
- Adjustable line length, caption size, backdrop, and position
- Optional pause-on-term with an explicit resume control
- Multiple named profiles in IndexedDB, with JSON export and import
- Keyboard controls: Space, arrow keys, C, and E
- Light/dark themes, 390 px mobile layout, and reduced-motion support
- Installable PWA with a precached shell and verified offline reload
- Optional $12 Trail Supporter cosmetic palettes through Sociobot licensing; all caption functions remain free

## Develop

Requirements: Node.js 22+ and npm.

```bash
npm ci
npm run dev
```

Open `http://localhost:5173`. For the most predictable video support, use an MP4 containing H.264 video or a WebM file.

## Test and build

```bash
npm test
npm run build
```

The exact production build command is `npm run build`. It type-checks the app and writes the static deploy to `dist/`, with `dist/index.html` at its root plus standalone `privacy/` and `terms/` entry points.

Browser, accessibility, and offline tests use Playwright:

```bash
npx playwright install chromium
npm run test:e2e
```

The e2e suite generates a short local WebM in-browser, loads VTT captions, checks a styled cue, saves and exports a profile, runs Axe in both themes and at 390 px, verifies the legal pages, and reloads with the browser network disabled.

## Privacy and storage

Video and caption contents live only in the current tab. Profiles are stored locally in IndexedDB. Theme, active-profile, and optional license state use local storage. There are no analytics, remote fonts, or runtime CDN dependencies. See [`/privacy`](https://caption-clarity.sociobot.in/privacy/) for the complete policy.

## Deployment

Deploy the contents of `dist/` as a static site with clean URL fallback/directories enabled. The factory handles DNS, hosting, and product registration. Do not add payment-provider code: the optional unlock uses only the Sociobot billing API.

## Source and artwork

The visual system and image provenance are documented in [`.factory/design.md`](.factory/design.md). The original topographic artwork and prompt sidecars are in `assets/src/`; optimized WebP assets are in `public/assets/`.

Released under the [MIT License](LICENSE).
