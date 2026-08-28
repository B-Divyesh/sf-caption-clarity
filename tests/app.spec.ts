import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const captions = `WEBVTT

00:00:00.000 --> 00:00:00.900
We meet at fifteen, not fifty.

00:00:00.900 --> 00:00:02.000
Take the first turning.`;

async function expectTouchTargets(page: import("@playwright/test").Page, selector: string): Promise<void> {
  const measurements = await page.locator(selector).evaluateAll((targets) => targets.map((target) => {
    const box = target.getBoundingClientRect();
    return { label: target.textContent?.trim() || target.getAttribute("aria-label") || selector, width: box.width, height: box.height };
  }));
  expect(measurements, `${selector} should match at least one visible target`).not.toHaveLength(0);
  for (const measurement of measurements) {
    expect(measurement.width, `${measurement.label} width`).toBeGreaterThanOrEqual(44);
    expect(measurement.height, `${measurement.label} height`).toBeGreaterThanOrEqual(44);
  }
}

async function loadMovingLocalVideo(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 320; canvas.height = 180;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#17342f"; context.fillRect(0, 0, 320, 180);
    const stream = canvas.captureStream(10);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    recorder.start();
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await new Promise<void>((resolve) => { recorder.onstop = () => resolve(); recorder.stop(); });
    stream.getTracks().forEach((track) => track.stop());
    const file = new File(chunks, "local-clip.webm", { type: "video/webm" });
    const transfer = new DataTransfer(); transfer.items.add(file);
    const input = document.querySelector<HTMLInputElement>("#videoInput")!;
    input.files = transfer.files; input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.locator("#videoStatus")).toContainText("local-clip.webm");
}

test("pauses when playback starts inside the current first cue with a saved term", async ({ page }) => {
  await page.goto("/");
  await page.locator("#captionInput").setInputFiles({ name: "dialogue.vtt", mimeType: "text/vtt", buffer: Buffer.from(captions) });
  await loadMovingLocalVideo(page);

  await page.locator("#video").evaluate(async (video: HTMLVideoElement) => {
    if (video.readyState < 1) await new Promise((resolve) => video.addEventListener("loadedmetadata", resolve, { once: true }));
    video.currentTime = 0.2;
    video.dispatchEvent(new Event("seeked"));
  });
  await expect(page.locator("#captionLayer")).toContainText("fifteen");
  await expect(page.locator("#pauseCard")).toBeHidden();
  await page.locator("#pauseOnTerm").check();

  // The expected immediate pause rejects the native play promise; the visible
  // player state below is the product assertion.
  await page.locator("#video").evaluate((video: HTMLVideoElement) => video.play().catch(() => undefined));
  await expect(page.locator("#pauseCard")).toBeVisible();
  await expect.poll(() => page.locator("#video").evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
});

test("loads local captions, shapes a cue, and persists a profile", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Make difficult words rise above the line." })).toBeVisible();

  await page.locator("#captionInput").setInputFiles({ name: "dialogue.vtt", mimeType: "text/vtt", buffer: Buffer.from(captions) });
  await expect(page.locator("#captionStatus")).toContainText("2 cues");

  await loadMovingLocalVideo(page);
  await page.locator("#video").evaluate(async (video: HTMLVideoElement) => {
    if (video.readyState < 1) await new Promise((resolve) => video.addEventListener("loadedmetadata", resolve, { once: true }));
    video.currentTime = 0.2;
    video.dispatchEvent(new Event("seeked"));
  });
  await expect(page.locator("#captionLayer")).toContainText("fifteen");
  await expect(page.locator("#captionLayer .caption-emphasis")).not.toHaveCount(0);

  await page.locator("#profileName").fill("Evening films");
  await page.locator("#lineLength").fill("34");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.locator("#saveState")).toHaveText("Saved locally");
  await page.reload();
  await expect(page.locator("#profileName")).toHaveValue("Evening films");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  expect((await download).suggestedFilename()).toMatch(/^caption-clarity-profiles-/);
  expect(errors).toEqual([]);
});

test("keeps the skip link and caption shortcuts keyboard operable", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();

  await page.locator("#captionInput").setInputFiles({ name: "dialogue.vtt", mimeType: "text/vtt", buffer: Buffer.from(captions) });
  await loadMovingLocalVideo(page);
  await page.locator("#video").focus();
  await page.keyboard.press("KeyC");
  await expect(page.locator("#captionsToggle")).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("KeyE");
  await expect(page.locator("#emphasis")).toHaveValue("more");
});

test("keeps reported navigation, disclosure, and legal targets at least 44px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expectTouchTargets(page, ".brand, .shortcut-help summary, .site-footer nav a, .license-panel .small a");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await expectTouchTargets(page, ".brand, .site-header nav a, .site-footer nav a, .shortcut-help summary, .license-panel .small a");

  for (const path of ["/privacy/", "/terms/"]) {
    await page.goto(path);
    await expectTouchTargets(page, ".site-footer nav a, .legal-page .small a");
  }
});

test("meets automated accessibility checks in light, dark, mobile, and legal views", async ({ page }) => {
  await page.goto("/");
  let result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(result.violations).toEqual([]);

  await page.locator("#themeToggle").click();
  result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(result.violations).toEqual([]);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport);
  result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(result.violations).toEqual([]);

  for (const path of ["/privacy/", "/terms/"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(result.violations).toEqual([]);
  }
});

test("reloads the installed shell without a network", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.locator("#workspaceTitle")).toBeVisible();
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Make difficult words rise above the line." })).toBeVisible();
  await context.setOffline(false);
});

test("announces a waiting service-worker update", async ({ page }) => {
  const workerPath = resolve(import.meta.dirname, "../dist/sw.js");
  const originalWorker = await readFile(workerPath, "utf8");
  try {
    await page.goto("/");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

    await writeFile(workerPath, `${originalWorker}\n// synthetic update for regression coverage\n`);
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
    await expect(page.locator("#updateToast")).toBeVisible();
  } finally {
    await writeFile(workerPath, originalWorker);
  }
});
