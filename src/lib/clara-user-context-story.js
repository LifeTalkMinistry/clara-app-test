const USER_CONTEXT_STORY_KEY = "CLARA_USER_CONTEXT_STORY_V1";
const SCHEMA_VERSION = 1;
const MAX_SECTIONS = 18;
const MAX_BULLETS_PER_SECTION = 10;

const DEFAULT_USER_CONTEXT_STORY_SECTIONS = [
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
  "Motivation",
  "Identity",
];

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function now() {
  return new Date().toISOString();
}

function normalizeTitle(value = "") {
  const text = clean(value)
    .replace(/context$/i, "")
    .replace(/story$/i, "")
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
  return DEFAULT_USER_CONTEXT_STORY_SECTIONS.find((section) => section.toLowerCase() === normalized) || "";
}

function normalizeSection(section = {}, fallbackIndex = 0) {
  const title = normalizeTitle(section.title || section.name || section.category || `Section ${fallbackIndex + 1}`);
  const defaultTitle = canonicalDefaultTitle(title);
  const finalTitle = defaultTitle || title;

  return {
    id: clean(section.id) || finalTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `section-${fallbackIndex}`,
    title: finalTitle,
    type: defaultTitle ? "default" : "custom",
    bullets: cleanBullets(section.bullets || section.items || section.context || section.memories),
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
  const orderedDefaults = DEFAULT_USER_CONTEXT_STORY_SECTIONS
    .map((title) => byTitle.get(title.toLowerCase()))
    .filter(Boolean);
  const custom = sections.filter((section) => !DEFAULT_USER_CONTEXT_STORY_SECTIONS.some((title) => title.toLowerCase() === section.title.toLowerCase()));

  return [...orderedDefaults, ...custom].slice(0, MAX_SECTIONS);
}

function sectionsFromObject(value = {}) {
  return Object.entries(value)
    .filter(([, sectionValue]) => Array.isArray(sectionValue))
    .map(([title, bullets]) => ({ title, bullets }));
}

export function normalizeUserContextStory(story = {}) {
  const timestamp = now();
  const source = story && typeof story === "object" ? story : {};
  const essay = typeof story === "string"
    ? story
    : source.essay || source.story || source.narrative || source.text || source.content || "";
  const rawSections = Array.isArray(source.sections)
    ? source.sections
    : Array.isArray(source.bullets)
      ? [{ title: "General", bullets: source.bullets }]
      : sectionsFromObject(source);
  const sections = ensureDefaultSectionOrder(mergeDuplicateSections(rawSections));

  return {
    id: "clara-user-context-story",
    type: "user_context_story",
    schemaVersion: SCHEMA_VERSION,
    essay: clean(essay),
    sections,
    createdAt: clean(source.createdAt) || timestamp,
    updatedAt: clean(source.updatedAt) || timestamp,
    sectionCount: sections.length,
    bulletCount: sections.reduce((sum, section) => sum + section.bullets.length, 0),
    source: "clara_user_context_story",
  };
}

export function readUserContextStory() {
  if (typeof window === "undefined") return normalizeUserContextStory({});

  try {
    return normalizeUserContextStory(JSON.parse(window.localStorage.getItem(USER_CONTEXT_STORY_KEY) || "{}"));
  } catch {
    const rawText = window.localStorage.getItem(USER_CONTEXT_STORY_KEY) || "";
    return normalizeUserContextStory(rawText);
  }
}

export function writeUserContextStory(story = {}) {
  const normalized = normalizeUserContextStory({ ...story, updatedAt: now() });

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(USER_CONTEXT_STORY_KEY, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent("clara-user-context-story-updated", { detail: normalized }));
    } catch {}
  }

  return normalized;
}

export function formatUserContextStoryForPrompt(story = readUserContextStory()) {
  const normalized = normalizeUserContextStory(story);
  const parts = [];

  if (normalized.essay) parts.push(normalized.essay);

  if (normalized.sections.length) {
    parts.push(
      normalized.sections
        .map((section) => `${section.title}\n${section.bullets.map((bullet) => `- ${bullet}`).join("\n")}`)
        .join("\n\n")
    );
  }

  if (!parts.length) return "No user context story saved yet.";

  return parts.join("\n\n");
}

export function hasUserContextStory(story = readUserContextStory()) {
  const normalized = normalizeUserContextStory(story);
  return Boolean(normalized.essay || normalized.bulletCount);
}

export function clearUserContextStory() {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(USER_CONTEXT_STORY_KEY);
      window.dispatchEvent(new CustomEvent("clara-user-context-story-updated", { detail: normalizeUserContextStory({}) }));
    } catch {}
  }

  return normalizeUserContextStory({});
}
