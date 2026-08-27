export interface Profile {
  id: string;
  name: string;
  emphasis: "terms" | "guided" | "more";
  lineLength: number;
  captionSize: number;
  backdrop: number;
  position: "bottom" | "middle" | "top";
  pauseOnTerm: boolean;
  terms: string[];
  updatedAt: string;
}

const DATABASE = "caption-clarity";
const STORE = "profiles";
const ACTIVE_KEY = "caption-clarity:active-profile";

export const defaultProfile: Profile = {
  id: "home-trail",
  name: "My clarity map",
  emphasis: "guided",
  lineLength: 42,
  captionSize: 32,
  backdrop: 82,
  position: "bottom",
  pauseOnTerm: false,
  terms: ["fifteen", "fifty"],
  updatedAt: new Date(0).toISOString()
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listProfiles(): Promise<Profile[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readonly");
    const request = transaction.objectStore(STORE).getAll();
    request.onsuccess = () => resolve((request.result as Profile[]).sort((a, b) => a.name.localeCompare(b.name)));
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

export async function saveProfile(profile: Profile): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(profile);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function deleteProfile(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).delete(id);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => reject(transaction.error);
  });
}

export function getActiveProfileId(): string {
  return localStorage.getItem(ACTIVE_KEY) || defaultProfile.id;
}

export function setActiveProfileId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function exportProfiles(profiles: Profile[]): string {
  return JSON.stringify({ product: "caption-clarity", version: 1, exportedAt: new Date().toISOString(), profiles }, null, 2);
}

export function validateImport(value: unknown): Profile[] {
  if (!value || typeof value !== "object" || (value as { product?: unknown }).product !== "caption-clarity") throw new Error("This is not a Caption Clarity profile file.");
  const profiles = (value as { profiles?: unknown }).profiles;
  if (!Array.isArray(profiles) || profiles.length === 0) throw new Error("The profile file does not contain any profiles.");
  return profiles.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`Profile ${index + 1} is incomplete.`);
    const raw = item as Partial<Profile>;
    if (!raw.id || !raw.name || !["terms", "guided", "more"].includes(raw.emphasis ?? "")) throw new Error(`Profile ${index + 1} is incomplete.`);
    return {
      id: String(raw.id), name: String(raw.name).slice(0, 60), emphasis: raw.emphasis as Profile["emphasis"],
      lineLength: clamp(Number(raw.lineLength), 24, 72, 42), captionSize: clamp(Number(raw.captionSize), 20, 52, 32),
      backdrop: clamp(Number(raw.backdrop), 55, 100, 82), position: ["bottom", "middle", "top"].includes(raw.position ?? "") ? raw.position as Profile["position"] : "bottom",
      pauseOnTerm: Boolean(raw.pauseOnTerm), terms: Array.isArray(raw.terms) ? raw.terms.map(String).filter(Boolean).slice(0, 100) : [],
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString()
    };
  });
}

function clamp(value: number, minimum: number, maximum: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;
}
