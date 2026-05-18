import { DRAWERS, MEMORY_KEY, clean as cleanValue } from "./mePanelData";

export const clean = cleanValue;

export function readMemory() {
  if (typeof window === "undefined") return { version: 2, updatedAt: "", items: {} };
  try {
    const data = JSON.parse(localStorage.getItem(MEMORY_KEY) || "{}");
    return { version: data.version || 2, updatedAt: data.updatedAt || "", items: data.items || {} };
  } catch {
    return { version: 2, updatedAt: "", items: {} };
  }
}

export function saveMemory(field, value, level) {
  const nextValue = clean(value);
  if (!nextValue) return readMemory();

  const current = readMemory();
  const previous = current.items?.[field.key] || {};
  const now = new Date().toISOString();
  const next = {
    version: 2,
    updatedAt: now,
    items: {
      ...(current.items || {}),
      [field.key]: {
        key: field.key,
        label: field.label,
        value: nextValue,
        layer: level,
        weight: Math.min(10, Number(previous.weight || 0) + 2),
        pinned: Boolean(previous.pinned),
        source: "me-memory-chat",
        createdAt: previous.createdAt || now,
        updatedAt: now,
      },
    },
  };

  localStorage.setItem(MEMORY_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("clara-behavioral-memory-updated", { detail: next }));
  return next;
}

export function dateLabel(value) {
  if (!value) return "Not saved yet";
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Recently";
  }
}

export function buildDrawers(memory) {
  const items = memory.items || {};
  return DRAWERS.map((drawer) => {
    const fields = drawer.fields.map(([label, key]) => ({ label, key, memory: items[key] || null }));
    const saved = fields.filter((field) => clean(field.memory?.value)).length;
    return { ...drawer, fields, saved, total: fields.length };
  });
}

export function openingReflection(drawer, field, current) {
  if (!current) return `Tell me what I should remember about your ${field.label.toLowerCase()}. This helps me understand you better before giving money guidance.`;
  return `I currently understand your ${field.label.toLowerCase()} as “${current}.” If this changed, tell me the correct version and I’ll update it.`;
}

export function isVagueChangeRequest(value) {
  const text = clean(value).toLowerCase().replace(/[?.!]+$/g, "");
  return /^(can i |can you |could you |please )?(change|update|edit|correct|fix)( it| this| that)?( now)?$/.test(text)
    || /^(yes|yeah|yep|okay|ok),? (change|update|edit|correct|fix)( it| this| that)?$/.test(text);
}

export function extractMemoryValue(value) {
  const text = clean(value);
  const patterns = [
    /(?:change|update|set|make|correct|fix).{0,50}?\b(?:to|as|into)\s+(.+)$/i,
    /^(?:it should be|make it|set it as|change it to)\s+(.+)$/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const result = clean(match?.[1] || "").replace(/[.!?]+$/g, "");
    if (result) return result;
  }
  return text;
}

export function probingReply(field) {
  return `Of course, Max. What should I update your ${field.label.toLowerCase()} to? Tell me the corrected version, and I’ll remember it.`;
}

export function savedFallbackReply(field, value) {
  return `Got it — I’ll remember your ${field.label.toLowerCase()} as “${value}.” I’ll use this when giving you more personal money guidance.`;
}

export function validProbe(reply) {
  const text = clean(reply).toLowerCase();
  if (!text.includes("?")) return false;
  if (/^(yes|yeah|yep|absolutely|sure)[!.\s]*$/i.test(text)) return false;
  return text.includes("what") || text.includes("how") || text.includes("which") || text.includes("instead");
}
