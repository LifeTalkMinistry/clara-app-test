export const CLARA_GUIDE_PROGRESS_KEY = "claraGuideProgress";
export const DAILY_MONEY_TIP_GUIDE_VERSION = 1;

export function readClaraGuideProgress() {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(CLARA_GUIDE_PROGRESS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function isDailyMoneyTipGuideComplete(progress = readClaraGuideProgress()) {
  return Number(progress?.dailyMoneyTip || 0) >= DAILY_MONEY_TIP_GUIDE_VERSION;
}

export function markDailyMoneyTipGuideComplete() {
  const currentProgress = readClaraGuideProgress();
  const nextProgress = {
    ...currentProgress,
    dailyMoneyTip: DAILY_MONEY_TIP_GUIDE_VERSION,
  };

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CLARA_GUIDE_PROGRESS_KEY, JSON.stringify(nextProgress));
    } catch {
      // Local-only guide progress should never block the real app.
    }
  }

  return nextProgress;
}
