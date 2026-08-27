import "./styles.css";
import { containsTerm, findCue, parseCaptions, shouldEmphasize, wrapCaption, type CaptionCue, type EmphasisLevel } from "./captions";
import { defaultProfile, deleteProfile, exportProfiles, getActiveProfileId, listProfiles, saveProfile, setActiveProfileId, validateImport, type Profile } from "./storage";
import { cachedLicenseState, captureReturnedLicense, checkoutUrl, clearLicense, restoreLicense, verifyLicense, type LicenseState } from "./license";

const app = document.querySelector<HTMLDivElement>("#app")!;
if (!app) throw new Error("App mount is missing");

const homePath = location.pathname === "/" || location.pathname.endsWith("index.html");
const route = location.pathname.replace(/\/+$/, "");
const prefersDark = matchMedia("(prefers-color-scheme: dark)");
let theme = localStorage.getItem("caption-clarity:theme") || "system";

function applyTheme(): void {
  const resolved = theme === "system" ? (prefersDark.matches ? "dark" : "light") : theme;
  document.documentElement.dataset.theme = resolved;
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#111a18" : "#f2efe4");
}
applyTheme();
prefersDark.addEventListener("change", applyTheme);

function shell(content: string): string {
  return `
    <header class="site-header">
      <a class="brand" href="/" aria-label="Caption Clarity home">
        <img src="/icons/icon.svg" width="40" height="40" alt="" />
        <span>Caption Clarity</span>
      </a>
      <nav aria-label="Site">
        <a href="/#workspace">Player</a>
        <a href="/#support">Supporter</a>
        <button class="quiet icon-button" id="themeToggle" type="button" aria-label="Change color theme"><span aria-hidden="true">◐</span><span class="theme-label">Theme</span></button>
      </nav>
    </header>
    ${content}
    <footer class="site-footer">
      <div><strong>Caption Clarity</strong><p>Private by design. Your media stays on this device.</p></div>
      <nav aria-label="Legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></nav>
      <p class="asset-note">Topographic artwork generated for this product with the factory image model.</p>
    </footer>
    <div class="connection-toast" id="connectionToast" role="status" aria-live="polite" hidden></div>
    <div class="update-toast" id="updateToast" role="status" hidden>
      <span>A fresh map is ready.</span><button type="button" id="applyUpdate">Update app</button>
    </div>`;
}

function legalPage(kind: "privacy" | "terms"): void {
  const privacy = `
    <main id="main" class="legal-page">
      <p class="eyebrow">FIELD NOTE / PRIVACY</p>
      <h1>Your files stay yours.</h1>
      <p class="lede">Caption Clarity processes video and caption files inside your browser. We do not upload, retain, or inspect them.</p>
      <h2>What stays on this device</h2>
      <p>Your named clarity profiles and confusing-term lists are stored in IndexedDB. Your theme choice, active profile, and optional supporter license are stored in local storage. Video files and caption file contents are kept only in the current browser tab and disappear when you close or reload it.</p>
      <h2>What leaves this device</h2>
      <p>Nothing during ordinary caption playback. If you verify a supporter license, the token is sent over HTTPS to the Sociobot billing API. Its hosting provider may receive standard connection data such as your IP address. Checkout is hosted by Sociobot; Dodo is the merchant of record and applies its own checkout privacy terms.</p>
      <h2>Tracking and control</h2>
      <p>There are no analytics, advertising pixels, third-party fonts, or social trackers. You can export profiles as JSON at any time. Clearing site data removes saved profiles and the license from this browser.</p>
      <button class="danger-button" id="clearLocalData" type="button">Clear saved data on this device</button>
      <p class="small">Effective 27 August 2026. Questions: <a href="mailto:privacy@sociobot.in">privacy@sociobot.in</a>.</p>
    </main>`;
  const terms = `
    <main id="main" class="legal-page">
      <p class="eyebrow">FIELD NOTE / TERMS</p>
      <h1>Use your own trail.</h1>
      <p class="lede">Caption Clarity is a local viewing utility for media and caption files you own or are authorized to use.</p>
      <h2>The service</h2>
      <p>The app styles supplied WebVTT and SRT captions. It does not transcribe audio, improve caption accuracy, bypass digital rights management, or provide an audiological recommendation. Settings are personal controls, not medical advice.</p>
      <h2>Your responsibilities</h2>
      <p>Only open media you are entitled to use. Do not use the app to infringe copyright or evade access controls. Keep an exported backup of profiles that matter to you; browser storage can be cleared by you or your browser.</p>
      <h2>Supporter unlock</h2>
      <p>The optional Trail Supporter unlock is a $12 USD one-time purchase for the listed cosmetic map palettes. The full caption tool remains free. Sociobot/Dodo is the merchant of record and handles payment and refunds. A refund revokes the associated license.</p>
      <h2>Availability and liability</h2>
      <p>The app is provided “as is” without a guarantee that every caption format, browser codec, or file will work. To the extent permitted by law, the maintainers are not liable for indirect or consequential loss. These terms do not limit rights that cannot legally be excluded.</p>
      <p class="small">Effective 27 August 2026. Questions: <a href="mailto:support@sociobot.in">support@sociobot.in</a>.</p>
    </main>`;
  app.innerHTML = shell(kind === "privacy" ? privacy : terms);
  setupShell();
  document.querySelector("#clearLocalData")?.addEventListener("click", async () => {
    if (!confirm("Clear every saved profile, theme choice, and supporter license from this browser?")) return;
    indexedDB.deleteDatabase("caption-clarity");
    Object.keys(localStorage).filter((key) => key.startsWith("caption-clarity") || key.startsWith("sb_license:") || key.startsWith("sb_license_verdict:")).forEach((key) => localStorage.removeItem(key));
    alert("Saved Caption Clarity data was cleared from this browser.");
  });
}

function homeTemplate(): string {
  return `
    <main id="main">
      <section class="hero" aria-labelledby="heroTitle">
        <div class="hero-copy">
          <p class="eyebrow">LOCAL CAPTION PLAYER / MAP 01</p>
          <h1 id="heroTitle">Make difficult words rise above the line.</h1>
          <p class="lede">Play your own video with WebVTT or SRT captions. Mark terms you often miss, shorten each line, or pause exactly where you need a moment.</p>
          <a class="primary-button" href="#workspace">Open a local file <span aria-hidden="true">↓</span></a>
          <p class="privacy-stamp"><span aria-hidden="true">⌾</span> No upload · no account · works offline</p>
        </div>
        <figure class="hero-art">
          <picture>
            <source media="(max-width: 700px)" srcset="/assets/terrain-listening-768.webp" />
            <img src="/assets/terrain-listening-1200.webp" width="1200" height="800" alt="A paper topographic map where blank caption tiles rise on contour peaks along a red route." fetchpriority="high" decoding="async" />
          </picture>
          <figcaption><span>Fig. 01</span> Emphasis turns a flat transcript into a personal reading map.</figcaption>
        </figure>
      </section>

      <section class="workspace" id="workspace" aria-labelledby="workspaceTitle">
        <div class="section-heading">
          <div><p class="eyebrow">YOUR VIEWING MAP / LOCAL SESSION</p><h2 id="workspaceTitle">Set up the player</h2></div>
          <p>Start with two files. Browser codec support decides which video formats can play; MP4 with H.264 is the safest route.</p>
        </div>

        <div class="file-zone" id="fileZone">
          <div class="file-zone-copy"><span class="waypoint" aria-hidden="true">01</span><div><h3>Choose files from this device</h3><p>Drop a video and a .vtt or .srt file here, or choose them separately.</p></div></div>
          <div class="file-actions">
            <label class="file-button" for="videoInput">Choose video</label><input class="sr-only" id="videoInput" type="file" accept="video/*,.mp4,.webm,.mov,.m4v" />
            <label class="file-button secondary" for="captionInput">Choose captions</label><input class="sr-only" id="captionInput" type="file" accept=".vtt,.srt,text/vtt,application/x-subrip" />
          </div>
          <div class="file-status" aria-live="polite">
            <p id="videoStatus"><span aria-hidden="true">○</span> No video selected</p>
            <p id="captionStatus"><span aria-hidden="true">○</span> No captions selected</p>
          </div>
        </div>
        <div class="error-banner" id="fileError" role="alert" hidden></div>

        <div class="player-layout">
          <div class="viewing-column">
            <div class="player-shell" id="playerShell" data-position="bottom">
              <video id="video" controls playsinline preload="metadata" aria-label="Local video player"></video>
              <div class="caption-layer" id="captionLayer" role="region" aria-label="Styled captions"></div>
              <div class="pause-card" id="pauseCard" hidden>
                <p><span aria-hidden="true">◆</span> Paused on a marked term</p>
                <button type="button" id="resumeButton">Resume video <kbd>Space</kbd></button>
              </div>
              <div class="player-empty" id="playerEmpty"><span class="empty-contours" aria-hidden="true"></span><p>Your local video appears here.</p><small>Nothing is uploaded.</small></div>
            </div>
            <div class="player-readout">
              <p id="cueReadout">00:00 / No active cue</p>
              <button class="quiet" id="captionsToggle" type="button" aria-pressed="true">Captions on</button>
            </div>
            <details class="shortcut-help"><summary>Keyboard route</summary><p><kbd>Space</kbd> play/pause · <kbd>←</kbd><kbd>→</kbd> skip 5s · <kbd>C</kbd> captions · <kbd>E</kbd> emphasis</p></details>
          </div>

          <form class="control-bench" id="controlsForm">
            <div class="bench-heading"><div><p class="eyebrow">PROFILE / <span id="profileCoordinate">01</span></p><h2>Clarity controls</h2></div><span class="autosave-mark" id="saveState">Saved locally</span></div>
            <fieldset>
              <legend>Profile</legend>
              <div class="field-row profile-row"><div><label for="profileSelect">Saved map</label><select id="profileSelect"></select></div><button class="small-button" id="newProfile" type="button">New</button></div>
              <label for="profileName">Profile name</label><input id="profileName" maxlength="60" autocomplete="off" />
              <div class="button-row"><button class="small-button" id="saveProfile" type="submit">Save profile</button><button class="text-button danger-text" id="deleteProfile" type="button">Delete</button></div>
            </fieldset>
            <fieldset>
              <legend>Words to bring forward</legend>
              <label for="emphasis">Emphasis map</label>
              <select id="emphasis">
                <option value="terms">My terms only</option><option value="guided">Guided</option><option value="more">More emphasis</option>
              </select>
              <p class="field-help" id="emphasisHelp">Guided marks your terms plus short connector words and consonant-rich words that can blur. It reads only caption text, not audio.</p>
              <label for="terms">Terms I confuse <span>(comma or new line)</span></label>
              <textarea id="terms" rows="3" spellcheck="false" aria-describedby="termsHelp"></textarea>
              <p class="field-help" id="termsHelp">Example: fifteen, fifty. Your list stays in this browser.</p>
              <label class="switch-row"><span><strong>Pause on my terms</strong><small>Pauses once when a cue contains one.</small></span><input id="pauseOnTerm" type="checkbox" role="switch" /></label>
            </fieldset>
            <fieldset>
              <legend>Reading shape</legend>
              <label class="range-label" for="lineLength"><span>Maximum line length</span><output id="lineLengthOutput">42 characters</output></label><input id="lineLength" type="range" min="24" max="72" step="2" />
              <label class="range-label" for="captionSize"><span>Caption size</span><output id="captionSizeOutput">32 px</output></label><input id="captionSize" type="range" min="20" max="52" step="2" />
              <label class="range-label" for="backdrop"><span>Backdrop strength</span><output id="backdropOutput">82%</output></label><input id="backdrop" type="range" min="55" max="100" step="1" />
              <label for="position">Position</label><select id="position"><option value="bottom">Bottom</option><option value="middle">Middle</option><option value="top">Top</option></select>
            </fieldset>
            <div class="caption-preview" aria-label="Caption style preview"><span class="preview-label">LIVE PREVIEW</span><p id="previewText">We meet at <strong>fifteen</strong>, not fifty.</p></div>
            <fieldset>
              <legend>Own your profiles</legend>
              <p class="field-help">Export a portable backup. Importing never removes existing profiles.</p>
              <div class="button-row"><button class="small-button secondary" id="exportProfiles" type="button">Export JSON</button><label class="small-button secondary" for="importInput">Import JSON</label><input class="sr-only" id="importInput" type="file" accept="application/json,.json" /></div>
            </fieldset>
          </form>
        </div>
      </section>

      <section class="method" aria-labelledby="methodTitle">
        <p class="eyebrow">HOW THE MAP IS DRAWN</p><h2 id="methodTitle">Useful adjustment, honest limits.</h2>
        <ol><li><span>01</span><h3>You supply the words</h3><p>Caption Clarity accepts standards-based VTT and SRT. It does not listen to or transcribe your video.</p></li><li><span>02</span><h3>You choose the contours</h3><p>Guided emphasis uses a simple visible text heuristic. Every setting is adjustable; none is a medical recommendation.</p></li><li><span>03</span><h3>You keep the map</h3><p>Profiles live in IndexedDB and export to JSON. Media stays in memory only for the current tab.</p></li></ol>
      </section>

      <section class="support" id="support" aria-labelledby="supportTitle">
        <div><p class="eyebrow">TRAIL SUPPORTER / OPTIONAL</p><h2 id="supportTitle">The whole caption tool is free.</h2><p>Make a one-time $12 purchase to support maintenance and unlock three decorative map palettes. Caption controls, named profiles, pause-on-term, offline use, and export stay free.</p><ul><li>One-time purchase, not a subscription</li><li>Sage, tide, and ember map palettes</li><li>License works across your devices</li></ul></div>
        <div class="license-panel" id="licensePanel">
          <p class="license-state" id="licenseState">No supporter license on this device.</p>
          <a class="primary-button" id="buyLink" href="${checkoutUrl}">Become a supporter — $12</a>
          <details><summary>Have a license? Restore it</summary><form id="licenseForm"><label for="licenseToken">License token</label><input id="licenseToken" autocomplete="off" /><button class="small-button" type="submit">Verify license</button></form></details>
          <div class="palette-picker" id="palettePicker" hidden><label for="palette">Map palette</label><select id="palette"><option value="base">Survey paper</option><option value="sage">Sage ridge</option><option value="tide">Tide chart</option><option value="ember">Ember route</option></select><button class="text-button" id="removeLicense" type="button">Remove license from this device</button></div>
          <p class="small">Checkout is hosted by Sociobot; Dodo is merchant of record. Refunds are handled there and revoke the license. <a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a></p>
        </div>
      </section>
    </main>`;
}

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

function setupShell(): void {
  required<HTMLButtonElement>("#themeToggle").addEventListener("click", () => {
    theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("caption-clarity:theme", theme);
    applyTheme();
  });
  updateConnection(false);
  addEventListener("online", () => updateConnection(true));
  addEventListener("offline", () => updateConnection(false));
}

function updateConnection(announceOnline: boolean): void {
  const toast = document.querySelector<HTMLDivElement>("#connectionToast");
  if (!toast) return;
  toast.hidden = navigator.onLine;
  toast.textContent = navigator.onLine ? "Back online." : "Offline — the player and saved profiles still work.";
  if (navigator.onLine && announceOnline) {
    toast.hidden = false;
    setTimeout(() => { toast.hidden = true; }, 2500);
  }
}

async function setupHome(): Promise<void> {
  app.innerHTML = shell(homeTemplate());
  setupShell();
  captureReturnedLicense();

  const video = required<HTMLVideoElement>("#video");
  const playerShell = required<HTMLDivElement>("#playerShell");
  const captionLayer = required<HTMLDivElement>("#captionLayer");
  const pauseCard = required<HTMLDivElement>("#pauseCard");
  const fileZone = required<HTMLDivElement>("#fileZone");
  const errorBanner = required<HTMLDivElement>("#fileError");
  const videoInput = required<HTMLInputElement>("#videoInput");
  const captionInput = required<HTMLInputElement>("#captionInput");
  let captions: CaptionCue[] = [];
  let profiles: Profile[] = [];
  let profile: Profile = { ...defaultProfile, terms: [...defaultProfile.terms] };
  let videoUrl: string | null = null;
  let captionsVisible = true;
  let activeCueId = "";
  const pausedCues = new Set<string>();
  let animationFrame = 0;
  let license: LicenseState = cachedLicenseState();

  function showError(message: string): void {
    errorBanner.textContent = message;
    errorBanner.hidden = false;
  }
  function clearError(): void { errorBanner.hidden = true; errorBanner.textContent = ""; }

  async function loadSavedProfiles(): Promise<void> {
    try {
      profiles = await listProfiles();
      if (!profiles.length) {
        profile = { ...defaultProfile, terms: [...defaultProfile.terms], updatedAt: new Date().toISOString() };
        await saveProfile(profile);
        profiles = [profile];
      } else profile = profiles.find((item) => item.id === getActiveProfileId()) ?? profiles[0] ?? profile;
    } catch {
      showError("Saved profiles are unavailable in this browser. You can still use the player for this session.");
    }
    populateProfileSelect();
    applyProfile();
  }

  function populateProfileSelect(): void {
    const select = required<HTMLSelectElement>("#profileSelect");
    select.replaceChildren(...profiles.map((item) => new Option(item.name, item.id, false, item.id === profile.id)));
    required<HTMLButtonElement>("#deleteProfile").disabled = profiles.length <= 1;
    required("#profileCoordinate").textContent = String(Math.max(1, profiles.findIndex((item) => item.id === profile.id) + 1)).padStart(2, "0");
  }

  function applyProfile(): void {
    required<HTMLInputElement>("#profileName").value = profile.name;
    required<HTMLSelectElement>("#emphasis").value = profile.emphasis;
    required<HTMLTextAreaElement>("#terms").value = profile.terms.join(", ");
    required<HTMLInputElement>("#pauseOnTerm").checked = profile.pauseOnTerm;
    required<HTMLInputElement>("#lineLength").value = String(profile.lineLength);
    required<HTMLInputElement>("#captionSize").value = String(profile.captionSize);
    required<HTMLInputElement>("#backdrop").value = String(profile.backdrop);
    required<HTMLSelectElement>("#position").value = profile.position;
    syncControls();
    required("#saveState").textContent = "Saved locally";
  }

  function readProfile(): Profile {
    const terms = required<HTMLTextAreaElement>("#terms").value.split(/[,\n]/).map((value) => value.trim()).filter(Boolean);
    return {
      ...profile,
      name: required<HTMLInputElement>("#profileName").value.trim() || "Untitled map",
      emphasis: required<HTMLSelectElement>("#emphasis").value as Profile["emphasis"],
      terms: [...new Set(terms)].slice(0, 100),
      pauseOnTerm: required<HTMLInputElement>("#pauseOnTerm").checked,
      lineLength: Number(required<HTMLInputElement>("#lineLength").value),
      captionSize: Number(required<HTMLInputElement>("#captionSize").value),
      backdrop: Number(required<HTMLInputElement>("#backdrop").value),
      position: required<HTMLSelectElement>("#position").value as Profile["position"],
      updatedAt: new Date().toISOString()
    };
  }

  function syncControls(): void {
    profile = readProfile();
    required<HTMLOutputElement>("#lineLengthOutput").value = `${profile.lineLength} characters`;
    required<HTMLOutputElement>("#captionSizeOutput").value = `${profile.captionSize} px`;
    required<HTMLOutputElement>("#backdropOutput").value = `${profile.backdrop}%`;
    playerShell.dataset.position = profile.position;
    playerShell.style.setProperty("--caption-size", `${profile.captionSize}px`);
    playerShell.style.setProperty("--caption-backdrop", String(profile.backdrop / 100));
    const preview = required<HTMLParagraphElement>("#previewText");
    preview.style.fontSize = `${Math.min(profile.captionSize, 38)}px`;
    preview.style.setProperty("--caption-backdrop", String(profile.backdrop / 100));
    preview.innerHTML = `We meet at <strong>${escapeHtml(profile.terms[0] || "fifteen")}</strong>, not fifty.`;
    renderCaption(true);
    required("#saveState").textContent = "Unsaved changes";
  }

  async function persistProfile(): Promise<void> {
    profile = readProfile();
    await saveProfile(profile);
    const existing = profiles.findIndex((item) => item.id === profile.id);
    if (existing >= 0) profiles[existing] = profile; else profiles.push(profile);
    setActiveProfileId(profile.id);
    populateProfileSelect();
    required("#saveState").textContent = "Saved locally";
  }

  function renderCaption(force = false): void {
    const cue = captionsVisible ? findCue(captions, video.currentTime) : null;
    if (!force && (cue?.id ?? "") === activeCueId) return;
    activeCueId = cue?.id ?? "";
    captionLayer.replaceChildren();
    if (!cue) {
      required("#cueReadout").textContent = `${formatTime(video.currentTime)} / No active cue`;
      return;
    }
    const lines = wrapCaption(cue.text, profile.lineLength);
    for (const line of lines) {
      const lineElement = document.createElement("span");
      lineElement.className = "caption-line";
      const tokens = line.split(/(\s+)/);
      for (const token of tokens) {
        const word = document.createElement("span");
        word.textContent = token;
        if (!/^\s+$/.test(token) && shouldEmphasize(token, profile.terms, profile.emphasis as EmphasisLevel)) word.className = "caption-emphasis";
        lineElement.append(word);
      }
      captionLayer.append(lineElement);
    }
    required("#cueReadout").textContent = `${formatTime(cue.start)}–${formatTime(cue.end)} / Cue ${captions.indexOf(cue) + 1} of ${captions.length}`;
    if (!video.paused && profile.pauseOnTerm && profile.terms.length && containsTerm(cue.text, profile.terms) && !pausedCues.has(cue.id)) {
      pausedCues.add(cue.id);
      video.pause();
      pauseCard.hidden = false;
    }
  }

  function tick(): void {
    renderCaption();
    if (!video.paused && !video.ended) animationFrame = requestAnimationFrame(tick);
  }

  function handleVideo(file: File): void {
    if (!file.type.startsWith("video/") && !/\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name)) return showError("That does not look like a video file. Choose MP4, WebM, MOV, or M4V.");
    clearError();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;
    video.load();
    required("#playerEmpty").setAttribute("hidden", "");
    const status = required("#videoStatus");
    status.classList.add("loaded"); status.innerHTML = `<span aria-hidden="true">●</span> ${escapeHtml(file.name)} <small>${formatBytes(file.size)}</small>`;
  }

  async function handleCaptions(file: File): Promise<void> {
    if (!/\.(vtt|srt)$/i.test(file.name) && !["text/vtt", "application/x-subrip"].includes(file.type)) return showError("Choose a WebVTT (.vtt) or SubRip (.srt) caption file.");
    if (file.size > 5_000_000) return showError("That caption file is over 5 MB. Choose a smaller VTT or SRT file.");
    try {
      captions = parseCaptions(await file.text());
      clearError(); activeCueId = ""; pausedCues.clear(); renderCaption(true);
      const status = required("#captionStatus");
      status.classList.add("loaded"); status.innerHTML = `<span aria-hidden="true">●</span> ${escapeHtml(file.name)} <small>${captions.length} cues</small>`;
    } catch (error) { showError(error instanceof Error ? error.message : "The captions could not be read."); }
  }

  videoInput.addEventListener("change", () => { const file = videoInput.files?.[0]; if (file) handleVideo(file); });
  captionInput.addEventListener("change", () => { const file = captionInput.files?.[0]; if (file) void handleCaptions(file); });
  for (const eventName of ["dragenter", "dragover"]) fileZone.addEventListener(eventName, (event) => { event.preventDefault(); fileZone.classList.add("dragging"); });
  for (const eventName of ["dragleave", "drop"]) fileZone.addEventListener(eventName, (event) => { event.preventDefault(); fileZone.classList.remove("dragging"); });
  fileZone.addEventListener("drop", (event) => {
    const files = [...(event.dataTransfer?.files ?? [])];
    const videoFile = files.find((file) => file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name));
    const captionFile = files.find((file) => /\.(vtt|srt)$/i.test(file.name));
    if (videoFile) handleVideo(videoFile);
    if (captionFile) void handleCaptions(captionFile);
    if (!videoFile && !captionFile) showError("No supported video, VTT, or SRT file was found in that drop.");
  });

  video.addEventListener("play", () => {
    pauseCard.hidden = true;
    cancelAnimationFrame(animationFrame);
    // A seek can render the current cue before playback starts. Re-render on
    // play so a marked first/current cue receives the same pause check as a
    // cue reached while playback is already running.
    renderCaption(true);
    if (!video.paused && !video.ended) tick();
  });
  video.addEventListener("pause", () => renderCaption());
  video.addEventListener("seeked", () => renderCaption(true));
  video.addEventListener("loadedmetadata", () => { clearError(); });
  video.addEventListener("error", () => showError("This browser could not play that video codec. MP4 with H.264 or WebM usually works."));
  required<HTMLButtonElement>("#resumeButton").addEventListener("click", () => { pauseCard.hidden = true; void video.play(); });
  required<HTMLButtonElement>("#captionsToggle").addEventListener("click", (event) => {
    captionsVisible = !captionsVisible;
    const button = event.currentTarget as HTMLButtonElement;
    button.setAttribute("aria-pressed", String(captionsVisible)); button.textContent = `Captions ${captionsVisible ? "on" : "off"}`;
    activeCueId = ""; renderCaption(true);
  });

  required<HTMLFormElement>("#controlsForm").addEventListener("input", (event) => { if ((event.target as HTMLElement).id !== "profileName") syncControls(); else required("#saveState").textContent = "Unsaved changes"; });
  required<HTMLFormElement>("#controlsForm").addEventListener("submit", (event) => { event.preventDefault(); void persistProfile().catch(() => showError("The profile could not be saved in this browser.")); });
  required<HTMLSelectElement>("#profileSelect").addEventListener("change", (event) => {
    const selected = profiles.find((item) => item.id === (event.target as HTMLSelectElement).value);
    if (selected) { profile = selected; setActiveProfileId(profile.id); applyProfile(); required("#saveState").textContent = "Saved locally"; }
  });
  required<HTMLButtonElement>("#newProfile").addEventListener("click", () => {
    profile = { ...readProfile(), id: crypto.randomUUID(), name: `Clarity map ${profiles.length + 1}`, updatedAt: new Date().toISOString() };
    profiles.push(profile); populateProfileSelect(); applyProfile(); required("#saveState").textContent = "Unsaved changes"; required<HTMLInputElement>("#profileName").select();
  });
  required<HTMLButtonElement>("#deleteProfile").addEventListener("click", async () => {
    if (profiles.length <= 1 || !confirm(`Delete “${profile.name}” from this device? Export it first if you may need it later.`)) return;
    await deleteProfile(profile.id); profiles = profiles.filter((item) => item.id !== profile.id); profile = profiles[0] ?? { ...defaultProfile }; setActiveProfileId(profile.id); populateProfileSelect(); applyProfile();
  });
  required<HTMLButtonElement>("#exportProfiles").addEventListener("click", () => {
    const blob = new Blob([exportProfiles(profiles)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `caption-clarity-profiles-${new Date().toISOString().slice(0, 10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  required<HTMLInputElement>("#importInput").addEventListener("change", async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
    try {
      const imported = validateImport(JSON.parse(await file.text()));
      for (const item of imported) { const existing = profiles.findIndex((profileItem) => profileItem.id === item.id); if (existing >= 0) profiles[existing] = item; else profiles.push(item); await saveProfile(item); }
      profile = imported[0] ?? profile; populateProfileSelect(); applyProfile(); required("#saveState").textContent = `Imported ${imported.length} profile${imported.length === 1 ? "" : "s"}`;
    } catch (error) { showError(error instanceof Error ? error.message : "That profile file could not be imported."); }
  });

  document.addEventListener("keydown", (event) => {
    if (!video.src || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test((event.target as HTMLElement).tagName)) return;
    if (event.code === "Space") { event.preventDefault(); if (video.paused) void video.play(); else video.pause(); }
    if (event.code === "ArrowLeft") { event.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 5); }
    if (event.code === "ArrowRight") { event.preventDefault(); video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 5); }
    if (event.code === "KeyC") required<HTMLButtonElement>("#captionsToggle").click();
    if (event.code === "KeyE") {
      const levels: Profile["emphasis"][] = ["terms", "guided", "more"]; const index = levels.indexOf(profile.emphasis); profile.emphasis = levels[(index + 1) % levels.length] ?? "guided"; required<HTMLSelectElement>("#emphasis").value = profile.emphasis; syncControls();
    }
  });

  function updateLicenseUi(): void {
    const state = required("#licenseState"); const picker = required<HTMLDivElement>("#palettePicker");
    picker.hidden = !license.unlocked;
    state.textContent = license.unlocked ? "Trail Supporter active on this device." : license.token && license.reason !== "offline" ? "This license is not active. You can paste another token or purchase a new license." : license.reason === "offline" ? "License check is waiting for a connection." : "No supporter license on this device.";
    state.classList.toggle("active", license.unlocked);
  }
  required<HTMLFormElement>("#licenseForm").addEventListener("submit", async (event) => {
    event.preventDefault(); const token = required<HTMLInputElement>("#licenseToken").value.trim(); if (!token) return;
    restoreLicense(token); required("#licenseState").textContent = "Checking license…"; license = await verifyLicense(true); updateLicenseUi();
  });
  required<HTMLSelectElement>("#palette").value = localStorage.getItem("caption-clarity:palette") || "base";
  required<HTMLSelectElement>("#palette").addEventListener("change", (event) => { const palette = (event.target as HTMLSelectElement).value; document.documentElement.dataset.palette = palette; localStorage.setItem("caption-clarity:palette", palette); });
  required<HTMLButtonElement>("#removeLicense").addEventListener("click", () => { clearLicense(); license = { unlocked: false, token: null }; document.documentElement.dataset.palette = "base"; updateLicenseUi(); });
  if (license.unlocked) document.documentElement.dataset.palette = localStorage.getItem("caption-clarity:palette") || "base";
  updateLicenseUi();
  void verifyLicense().then((state) => { license = state; updateLicenseUi(); });
  await loadSavedProfiles();
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "00:00";
  const minutes = Math.floor(seconds / 60); const remaining = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function formatBytes(bytes: number): string { return bytes < 1_000_000 ? `${Math.round(bytes / 1000)} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`; }
function escapeHtml(value: string): string { const span = document.createElement("span"); span.textContent = value; return span.innerHTML; }

async function registerServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;
  const registration = await navigator.serviceWorker.register("/sw.js");
  let acceptingUpdate = false;
  function showUpdate(worker: ServiceWorker): void {
    const toast = document.querySelector<HTMLDivElement>("#updateToast"); if (!toast) return; toast.hidden = false;
    document.querySelector("#applyUpdate")?.addEventListener("click", () => { acceptingUpdate = true; worker.postMessage({ type: "SKIP_WAITING" }); }, { once: true });
  }
  if (registration.waiting) showUpdate(registration.waiting);
  registration.addEventListener("updatefound", () => registration.installing?.addEventListener("statechange", () => { if (registration.waiting && navigator.serviceWorker.controller) showUpdate(registration.waiting); }));
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (acceptingUpdate) location.reload(); });
}

if (route === "/privacy") legalPage("privacy");
else if (route === "/terms") legalPage("terms");
else if (homePath) void setupHome();
else legalPage("privacy");
void registerServiceWorker().catch(() => { /* offline registration can retry next visit */ });
