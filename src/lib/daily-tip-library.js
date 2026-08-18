import { backendRequest } from "@/lib/clara-backend-client";

let cachedLibrary = null;
let libraryPromise = null;

function normalizeRevision(value) {
  const revision = Number(value);
  return Number.isInteger(revision) && revision > 0 ? revision : 1;
}

export function normalizeDailyTipLibrary(payload) {
  const seen = new Set();
  return (Array.isArray(payload?.tips) ? payload.tips : [])
    .map((tip, index) => ({
      id: String(tip?.id || tip?.tip_id || "").trim(),
      text: String(tip?.text || "").trim(),
      revision: normalizeRevision(tip?.revision ?? tip?.current_revision),
      is_active: tip?.is_active !== false,
      sort_order: Number.isFinite(Number(tip?.sort_order)) ? Number(tip.sort_order) : index + 1,
    }))
    .filter((tip) => {
      if (!tip.id || !tip.text || !tip.is_active || seen.has(tip.id)) return false;
      seen.add(tip.id);
      return true;
    })
    .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
}

export async function fetchDailyTipLibrary({ force = false } = {}) {
  if (!force && Array.isArray(cachedLibrary) && cachedLibrary.length > 0) {
    return cachedLibrary;
  }
  if (!force && libraryPromise) return libraryPromise;

  libraryPromise = backendRequest("/api/daily-tips/library")
    .then((payload) => {
      const library = normalizeDailyTipLibrary(payload);
      if (library.length > 0) cachedLibrary = library;
      return library;
    })
    .finally(() => {
      libraryPromise = null;
    });

  return libraryPromise;
}

export function getCachedDailyTipRevision(tipId) {
  const tip = cachedLibrary?.find((item) => item.id === String(tipId || "").trim());
  return tip?.revision || null;
}
