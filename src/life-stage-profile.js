import {
  DEFAULT_LIFE_STAGE_SELECTION,
  LIFE_STAGE_KEY,
  normalizeLifeStageKey,
  readSelectedLifeStageProfile,
  saveSelectedLifeStageProfile,
} from "./life-stage-flow";

export function normalizeLifeStageImageVariant(value = "default") {
  const key = String(value || "").toLowerCase().trim();
  if (["male", "men", "man", "boy"].includes(key)) return "male";
  if (["female", "girl", "woman"].includes(key)) return "female";
  return "default";
}

export function readRawLifeStageProfile() {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LIFE_STAGE_KEY) || "null");
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function isLifeStageProfileConfigured(profile = readRawLifeStageProfile()) {
  if (!profile || typeof profile !== "object") return false;
  if (!String(profile.stage || "").trim()) return false;
  if (profile.lifeStageConfigured !== true) return false;
  return Boolean(String(profile.lifeStageSetupCompletedAt || "").trim());
}

export function readLifeStageProfile() {
  const raw = readRawLifeStageProfile();
  const saved = isLifeStageProfileConfigured(raw) ? readSelectedLifeStageProfile() : null;
  const stage = normalizeLifeStageKey(saved?.stage || DEFAULT_LIFE_STAGE_SELECTION);
  return {
    ...(saved || {}),
    stage,
    imageVariant: normalizeLifeStageImageVariant(saved?.imageVariant || "default"),
  };
}

export function saveLifeStageProfile(profile) {
  return saveSelectedLifeStageProfile({
    ...(profile || {}),
    stage: normalizeLifeStageKey(profile?.stage),
    imageVariant: normalizeLifeStageImageVariant(profile?.imageVariant || "default"),
    lifeStageConfigured: true,
    lifeStageSetupCompletedAt:
      profile?.lifeStageSetupCompletedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}
