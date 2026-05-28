const UNIVERSAL_MEMORY_KEY = "CLARA_UNIVERSAL_MEMORY_PROFILE_V1";
const SCHEMA_VERSION = 1;
const MAX_SECTIONS = 18;
const MAX_BULLETS_PER_SECTION = 8;

export const DEFAULT_UNIVERSAL_MEMORY_SECTIONS = [
  "Spending",
  "Budget",
  "Wallet",
  "Goals",
  "Emergency",
  "Debt",
  "Schedule",
  "Emotional",
  "Lifestyle",
  "Decision",
  "Learning",
  "Preference",
  "Relationship",
];

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function now() {
  return new Date().toISOString();
}

function normalizeTitle(value = "") {
  const text = clean(value)
    .replace(/memory$/i, "")
    .replace(/[^a-z0-9ñáéíóúü\s&/-]/gi, "")
    .trim();

  if (!text) return "General";
  return text
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function cleanBullet(value = "") {
  return clean(value)
    .replace(/^[•\-*]\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .trim();
}

function cleanBullets(value = []) {
  if (!Array.isArray(value)) return [];
  return value
    .map(cleanBullet)
    .filter(Boolean)
    .slice(0, MAX_BULLETS_PER_SECTION);
}

function canonicalDefaultTitle(title = "") {
  const normalized = normalizeTitle(title).toLowerCase();
  return DEFAULT_UNIVERSAL_MEMORY_SECTIONS.find((section) => section.toLowerCase() === normalized) || "";
}

function normalizeSection(section = {}, fallbackIndex = 0) {
  const title = normalizeTitle(section.title || section.name || section.category || `Section ${fallbackIndex + 1}`);
  const defaultTitle = canonicalDefaultTitle(title);
  const finalTitle = defaultTitle || title;

  return {
    id: clean(section.id) || finalTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `section-${fallbackIndex}`,
    title: finalTitle,
    type: defaultTitle ? "default" : "custom",
    bullets: cleanBullets(section.bullets || section.items || section.memories),
    createdAt: clean(section.createdAt) || now(),
    updatedAt: clean(section.updatedAt) || now(),
  };
}

function mergeDuplicateSections(sections = []) {
  const merged = new Map();

  sections.forEach((section, index) => {
    const normalized = normalizeSection(section, index);
    if (!normalized.bullets.length) return;

    const key = normalized.title.toLowerCase();
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, normalized);
      return;
    }

    merged.set(key, {
      ...existing,
      bullets: [...new Set([...existing.bullets, ...normalized.bullets])].slice(0, MAX_BULLETS_PER_SECTION),
      type: existing.type === "default" || normalized.type === "default" ? "default" : "custom",
      updatedAt: now(),
    });
  });

  return Array.from(merged.values()).slice(0, MAX_SECTIONS);
}

function ensureDefaultSectionOrder(sections = []) {
  const byTitle = new Map(sections.map((section) => [section.title.toLowerCase(), section]));
  const orderedDefaults = DEFAULT_UNIVERSAL_MEMORY_SECTIONS
    .map((title) => byTitle.get(title.toLowerCase()))
    .filter(Boolean);
  const custom = sections.filter((section) => !DEFAULT_UNIVERSAL_MEMORY_SECTIONS.some((title) => title.toLowerCase() === section.title.toLowerCase()));
  return [...orderedDefaults, ...custom].slice(0, MAX_SECTIONS);
}

export function normalizeUniversalMemoryProfile(profile = {}) {
  const sections = ensureDefaultSectionOrder(mergeDuplicateSections(profile.sections || []));
  const timestamp = now();

  return {
    id: "clara-universal-memory-profile",
    type: "universal_memory_profile",
    schemaVersion: SCHEMA_VERSION,
    sections,
    createdAt: clean(profile.createdAt) || timestamp,
    updatedAt: clean(profile.updatedAt) || timestamp,
    sectionCount: sections.length,
    bulletCount: sections.reduce((sum, section) => sum + section.bullets.length, 0),
    source: "clara_universal_memory_profile",
  };
}

export function readUniversalMemoryProfile() {
  if (typeof window === "undefined") return normalizeUniversalMemoryProfile({});

  try {
    return normalizeUniversalMemoryProfile(JSON.parse(window.localStorage.getItem(UNIVERSAL_MEMORY_KEY) || "{}"));
  } catch {
    return normalizeUniversalMemoryProfile({});
  }
}

export function writeUniversalMemoryProfile(profile = {}) {
  const normalized = normalizeUniversalMemoryProfile({ ...profile, updatedAt: now() });

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(UNIVERSAL_MEMORY_KEY, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent("clara-universal-memory-profile-updated", { detail: normalized }));
    } catch {}
  }

  return normalized;
}

export function formatUniversalMemoryProfileForPrompt(profile = readUniversalMemoryProfile()) {
  const normalized = normalizeUniversalMemoryProfile(profile);

  if (!normalized.sections.length) {
    return "No universal memory profile saved yet.";
  }

  return normalized.sections
    .map((section) => `${section.title}\n${section.bullets.map((bullet) => `- ${bullet}`).join("\n")}`)
    .join("\n\n");
}

export function getUniversalMemorySections() {
  return readUniversalMemoryProfile().sections;
}

export function clearUniversalMemoryProfile() {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(UNIVERSAL_MEMORY_KEY);
      window.dispatchEvent(new CustomEvent("clara-universal-memory-profile-updated", { detail: normalizeUniversalMemoryProfile({}) }));
    } catch {}
  }

  return normalizeUniversalMemoryProfile({});
}
