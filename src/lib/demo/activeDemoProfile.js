import {
  ACTIVE_CURRENT_STATE_KEY,
  SAMPLE_DATA_LOCAL_USER_ID,
} from "../clara-young-professional-current-state";

export const YOUNG_PROFESSIONAL_DEMO_PROFILE_ID = "young-professional-12m";
export const YOUNG_PROFESSIONAL_DEMO_PROFILE_NAME = "Young Professional";
export const YOUNG_PROFESSIONAL_DEMO_SOURCE = "clara-demo";
export const YOUNG_PROFESSIONAL_DEMO_SETUP_FAMILY = "young_professional_12m_demo_profile";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function getActiveDemoProfileState() {
  if (typeof window === "undefined") return null;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(ACTIVE_CURRENT_STATE_KEY) || "null");

    if (
      parsed?.mode !== "current_state" ||
      parsed?.dataMode !== "sample_data" ||
      parsed?.demoModeActive !== true ||
      parsed?.activeDemoProfile !== YOUNG_PROFESSIONAL_DEMO_PROFILE_ID
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function getActiveDemoFinanceLocalUserId() {
  const state = getActiveDemoProfileState();
  if (!state) return null;
  return clean(state.demoLocalUserId) || clean(state.localUserId) || SAMPLE_DATA_LOCAL_USER_ID;
}

export function getEffectiveDemoFinanceLocalUserId(localUserId) {
  return getActiveDemoFinanceLocalUserId() || clean(localUserId) || "local-user";
}

export function isYoungProfessionalDemoActive() {
  return Boolean(getActiveDemoProfileState());
}
