const SLUG = "caption-clarity";
const LICENSE_KEY = `sb_license:${SLUG}`;
const VERDICT_KEY = `sb_license_verdict:${SLUG}`;
const API_BASE = "https://api.sociobot.in/api/v1";
const ONE_DAY = 86_400_000;

interface CachedVerdict { valid: boolean; checkedAt: number; reason: string; }

export interface LicenseState {
  unlocked: boolean;
  token: string | null;
  reason?: string;
}

export const checkoutUrl = `${API_BASE}/products/${SLUG}/checkout`;

export function captureReturnedLicense(): void {
  const url = new URL(location.href);
  const token = url.searchParams.get("license")?.trim();
  if (!token) return;
  localStorage.setItem(LICENSE_KEY, token);
  localStorage.removeItem(VERDICT_KEY);
  url.searchParams.delete("license");
  history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export function storedLicense(): string | null {
  return localStorage.getItem(LICENSE_KEY);
}

export function cachedLicenseState(): LicenseState {
  const token = storedLicense();
  if (!token) return { unlocked: false, token: null };
  try {
    const cached = JSON.parse(localStorage.getItem(VERDICT_KEY) || "null") as CachedVerdict | null;
    return { unlocked: cached?.valid === true, token, reason: cached?.reason };
  } catch {
    return { unlocked: false, token };
  }
}

export async function verifyLicense(force = false): Promise<LicenseState> {
  const token = storedLicense();
  if (!token) return { unlocked: false, token: null };
  let cached: CachedVerdict | null = null;
  try { cached = JSON.parse(localStorage.getItem(VERDICT_KEY) || "null") as CachedVerdict | null; } catch { /* re-check */ }
  if (!force && cached && Date.now() - cached.checkedAt < ONE_DAY) return { unlocked: cached.valid, token, reason: cached.reason };
  try {
    const response = await fetch(`${API_BASE}/products/${SLUG}/verify?license=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error("Verification service unavailable");
    const result = await response.json() as { valid?: boolean; reason?: string };
    const verdict = { valid: result.valid === true, reason: result.reason || "invalid", checkedAt: Date.now() };
    localStorage.setItem(VERDICT_KEY, JSON.stringify(verdict));
    return { unlocked: verdict.valid, token, reason: verdict.reason };
  } catch {
    return { unlocked: cached?.valid === true, token, reason: "offline" };
  }
}

export function restoreLicense(token: string): void {
  localStorage.setItem(LICENSE_KEY, token.trim());
  localStorage.removeItem(VERDICT_KEY);
}

export function clearLicense(): void {
  localStorage.removeItem(LICENSE_KEY);
  localStorage.removeItem(VERDICT_KEY);
}
