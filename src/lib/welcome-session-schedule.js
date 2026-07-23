export const COACHING_TIMEZONE = "Asia/Manila";
export const COACHING_POLL_INTERVAL_MS = 45_000;

const DRAFT_KEYS = {
  committed_first_session: "claraCommittedFirstSessionUnsentDraft",
  monthly_coaching: "claraMonthlyCoachingUnsentDraft",
};

function getStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage || null;
  } catch {
    return null;
  }
}

export function formatDateKey(value) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: COACHING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function formatMonthKey(value) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: COACHING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(value));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}`;
}

export function formatDateLabel(value, full = false) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: COACHING_TIMEZONE,
    weekday: full ? "long" : "short",
    month: full ? "long" : "short",
    day: "numeric",
    ...(full ? { year: "numeric" } : {}),
  }).format(new Date(value));
}

export function formatTimeLabel(value) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: COACHING_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

export function normalizeBackendSlot(slot) {
  const startsAt = new Date(slot?.starts_at);
  const endsAt = new Date(slot?.ends_at);
  if (
    !slot?.id ||
    slot.status !== "available" ||
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime()) ||
    endsAt <= startsAt
  ) {
    return null;
  }
  return {
    id: String(slot.id),
    status: "available",
    startsAt,
    endsAt,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    dateKey: formatDateKey(startsAt),
    monthKey: formatMonthKey(startsAt),
    dateLabel: formatDateLabel(startsAt),
    fullDateLabel: formatDateLabel(startsAt, true),
    timeLabel: formatTimeLabel(startsAt),
  };
}

export function normalizeAvailability(payload) {
  if (!payload || payload.timezone !== COACHING_TIMEZONE || !Array.isArray(payload.slots)) {
    return [];
  }
  return payload.slots.map(normalizeBackendSlot).filter(Boolean);
}

export function groupSlotsByDate(slots) {
  const result = new Map();
  slots.forEach((slot) => {
    const current = result.get(slot.dateKey) || [];
    current.push(slot);
    result.set(slot.dateKey, current);
  });
  result.forEach((items) => items.sort((a, b) => a.startsAt - b.startsAt));
  return result;
}

export function pickRelevantAppointment(appointments, sessionType) {
  const matching = appointments.filter((item) => item.session_type === sessionType);
  const active = matching.find((item) =>
    ["requested", "confirmed", "reschedule_requested"].includes(item.status)
  );
  return active || matching[0] || null;
}

export function readUnsentCoachingDraft(sessionType) {
  try {
    const value = JSON.parse(getStorage()?.getItem(DRAFT_KEYS[sessionType]) || "null");
    return value?.status === "unsent_draft" && value?.sessionType === sessionType ? value : null;
  } catch {
    return null;
  }
}

export function saveUnsentCoachingDraft(sessionType, draft) {
  try {
    getStorage()?.setItem(
      DRAFT_KEYS[sessionType],
      JSON.stringify({
        ...draft,
        version: 3,
        status: "unsent_draft",
        sessionType,
        savedAt: new Date().toISOString(),
      })
    );
  } catch {
    // Submission errors remain visible even if storage is unavailable.
  }
}

export function clearUnsentCoachingDraft(sessionType) {
  try {
    getStorage()?.removeItem(DRAFT_KEYS[sessionType]);
  } catch {
    // Nothing else is required when storage is unavailable.
  }
}
