import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

type StaticWebAppConfig = {
  globalHeaders: Record<string, string>;
  mimeTypes: Record<string, string>;
  routes: Array<{ route: string; headers: Record<string, string> }>;
};

const config = JSON.parse(readFileSync(resolve(import.meta.dirname, "../public/staticwebapp.config.json"), "utf8")) as StaticWebAppConfig;

test("ships immutable hashed assets and revalidates app entry points", () => {
  const assetRule = config.routes.find((rule) => rule.route === "/assets/*");
  const serviceWorkerRule = config.routes.find((rule) => rule.route === "/sw.js");
  const manifestRule = config.routes.find((rule) => rule.route === "/manifest.webmanifest");

  expect(assetRule?.headers["Cache-Control"]).toBe("public, max-age=31536000, immutable");
  expect(serviceWorkerRule?.headers["Cache-Control"]).toContain("no-cache");
  expect(manifestRule?.headers["Cache-Control"]).toContain("must-revalidate");
});

test("ships response hardening and the standard web manifest media type", () => {
  const policy = config.globalHeaders["Content-Security-Policy"];

  expect(policy).toContain("default-src 'self'");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).toContain("object-src 'none'");
  expect(policy).toContain("connect-src 'self' https://api.sociobot.in");
  expect(config.globalHeaders["Permissions-Policy"]).toContain("camera=()");
  expect(config.globalHeaders["X-Frame-Options"]).toBe("DENY");
  expect(config.mimeTypes[".webmanifest"]).toBe("application/manifest+json");
});
