import {
  backendRequest,
  getStoredBackendToken,
} from "@/lib/clara-backend-client";

const STORAGE_PREFIX = "clara_daily_tip_feedback_v1";
const VALID_REACTIONS = new Set(["like", "dislike"]);

function normalizeUserId(userId) {
  return String(userId || "").trim() || "guest";
}

function normalizeReaction(value) {
  const reaction = String(value || "").trim().toLowerCase();
  return VALID_REACTIONS.has(reaction) ? reaction : null;
}

function storageKey(userId) {
  return `${STORAGE_PREFIX}:${encodeURIComponent(normalizeUserId(userId))}`;
}

function getStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage || null;
  } catch {
    return null;
  }
}

export function readLocalDailyTipFeedback(userId) {
  try {
    const parsed = JSON.parse(getStorage()?.getItem(storageKey(userId)) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalDailyTipFeedback(userId, feedback) {
  try {
    getStorage()?.setItem(storageKey(userId), JSON.stringify(feedback || {}));
  } catch {
    // The reaction still remains in component state for this session.
  }
}

export function getLocalDailyTipReaction(userId, tipId) {
  return normalizeReaction(readLocalDailyTipFeedback(userId)?.[tipId]?.reaction);
}

export function getDislikedDailyTipIds(userId) {
  return Object.entries(readLocalDailyTipFeedback(userId))
    .filter(([, state]) => normalizeReaction(state?.reaction) === "dislike")
    .map(([tipId]) => tipId);
}

export function setLocalDailyTipReaction(userId, tipId, reaction) {
  if (!tipId) return null;
  const feedback = readLocalDailyTipFeedback(userId);
  const normalized = normalizeReaction(reaction);

  feedback[tipId] = {
    ...(feedback[tipId] || {}),
    reaction: normalized,
    updatedAt: new Date().toISOString(),
  };
  writeLocalDailyTipFeedback(userId, feedback);
  return normalized;
}

export async function hydrateDailyTipFeedback(userId) {
  const token = getStoredBackendToken();
  const local = readLocalDailyTipFeedback(userId);
  if (!token || normalizeUserId(userId) === "guest") return local;

  const payload = await backendRequest("/api/daily-tips/feedback", { token });
  const next = { ...local };

  for (const row of Array.isArray(payload?.feedback) ? payload.feedback : []) {
    const tipId = String(row?.tip_id || "").trim();
    if (!tipId || next[tipId]?.reaction) continue;
    next[tipId] = {
      ...(next[tipId] || {}),
      reaction: normalizeReaction(row?.reaction_type),
      updatedAt: row?.updated_at || null,
    };
  }

  writeLocalDailyTipFeedback(userId, next);
  return next;
}

export async function persistDailyTipReaction(userId, tipId, reaction) {
  const normalized = setLocalDailyTipReaction(userId, tipId, reaction);
  const token = getStoredBackendToken();
  if (!token || normalizeUserId(userId) === "guest") {
    return { reaction: normalized, synced: false, localOnly: true };
  }

  await backendRequest(
    `/api/daily-tips/feedback/${encodeURIComponent(tipId)}/reaction`,
    {
      method: "PUT",
      token,
      body: { reaction_type: normalized },
    },
  );

  return { reaction: normalized, synced: true, localOnly: false };
}

export async function recordDailyTipImpression(userId, tipId) {
  const token = getStoredBackendToken();
  if (!token || !tipId || normalizeUserId(userId) === "guest") return false;

  await backendRequest(
    `/api/daily-tips/feedback/${encodeURIComponent(tipId)}/impression`,
    { method: "POST", token },
  );
  return true;
}
