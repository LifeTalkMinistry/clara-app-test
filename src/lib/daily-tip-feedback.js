import {
  backendRequest,
  getStoredBackendToken,
} from "@/lib/clara-backend-client";

const STORAGE_PREFIX = "clara_daily_tip_feedback_v1";
const VALID_REACTIONS = new Set(["like", "dislike"]);

function normalizeUserId(userId) {
  return String(userId || "").trim() || "guest";
}

function normalizeRevision(value) {
  const revision = Number(value);
  return Number.isInteger(revision) && revision > 0 ? revision : 1;
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

export function getLocalDailyTipReaction(userId, tipId, tipRevision = 1) {
  const state = readLocalDailyTipFeedback(userId)?.[tipId];
  if (!state) return null;
  if (normalizeRevision(state.revision) !== normalizeRevision(tipRevision)) return null;
  return normalizeReaction(state.reaction);
}

export function getDislikedDailyTipIds(userId, tips = []) {
  const feedback = readLocalDailyTipFeedback(userId);
  const currentRevisionById = new Map(
    (Array.isArray(tips) ? tips : []).map((tip) => [
      String(tip?.id || tip?.tip_id || "").trim(),
      normalizeRevision(tip?.revision ?? tip?.current_revision),
    ]),
  );

  return Object.entries(feedback)
    .filter(([tipId, state]) => {
      if (normalizeReaction(state?.reaction) !== "dislike") return false;
      const currentRevision = currentRevisionById.get(tipId);
      if (!currentRevision) return true;
      return normalizeRevision(state?.revision) === currentRevision;
    })
    .map(([tipId]) => tipId);
}

export function setLocalDailyTipReaction(userId, tipId, tipRevision, reaction) {
  if (!tipId) return null;
  const feedback = readLocalDailyTipFeedback(userId);
  const normalized = normalizeReaction(reaction);

  feedback[tipId] = {
    ...(feedback[tipId] || {}),
    revision: normalizeRevision(tipRevision),
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
  const newestRemote = new Map();

  for (const row of Array.isArray(payload?.feedback) ? payload.feedback : []) {
    const tipId = String(row?.tip_id || "").trim();
    if (!tipId) continue;
    const revision = normalizeRevision(row?.tip_revision);
    const existing = newestRemote.get(tipId);
    if (!existing || revision > existing.revision) {
      newestRemote.set(tipId, { row, revision });
    }
  }

  for (const [tipId, remote] of newestRemote) {
    const localState = next[tipId];
    const localRevision = normalizeRevision(localState?.revision);
    const localReaction = normalizeReaction(localState?.reaction);
    if (localState && localRevision > remote.revision) continue;
    if (localState && localRevision === remote.revision && localReaction) continue;

    next[tipId] = {
      ...(localState || {}),
      revision: remote.revision,
      reaction: normalizeReaction(remote.row?.reaction_type),
      updatedAt: remote.row?.updated_at || null,
    };
  }

  writeLocalDailyTipFeedback(userId, next);
  return next;
}

export async function persistDailyTipReaction(userId, tipId, tipRevision, reaction) {
  const revision = normalizeRevision(tipRevision);
  const normalized = setLocalDailyTipReaction(userId, tipId, revision, reaction);
  const token = getStoredBackendToken();
  if (!token || normalizeUserId(userId) === "guest") {
    return { reaction: normalized, revision, synced: false, localOnly: true };
  }

  await backendRequest(
    `/api/daily-tips/feedback/${encodeURIComponent(tipId)}/reaction`,
    {
      method: "PUT",
      token,
      body: { reaction_type: normalized, tip_revision: revision },
    },
  );

  return { reaction: normalized, revision, synced: true, localOnly: false };
}

export async function recordDailyTipImpression(userId, tipId, tipRevision = 1) {
  const token = getStoredBackendToken();
  if (!token || !tipId || normalizeUserId(userId) === "guest") return false;

  await backendRequest(
    `/api/daily-tips/feedback/${encodeURIComponent(tipId)}/impression`,
    {
      method: "POST",
      token,
      body: { tip_revision: normalizeRevision(tipRevision) },
    },
  );
  return true;
}
