const normalizeString = (value) => String(value ?? "").trim();

export const FALLBACK_MONEY_TIPS = [
  "If you don’t track it, you will lose it.",
  "Income is important, but behavior is everything.",
  "You don’t need more money. You need more control.",
  "Small leaks sink big ships. Watch your daily spending.",
  "Discipline beats motivation every time.",
  "What you repeat daily becomes your financial identity.",
  "Budgeting is not restriction. It’s direction.",
  "Every peso has a job. Give it one.",
  "Being broke is temporary. Staying broke is behavioral.",
  "Your habits decide your future, not your salary.",
  "Save first. Spend what’s left. Not the other way around.",
  "If it’s not planned, it’s probably wasted.",
  "Comfort spending is the silent killer of progress.",
  "You can’t fix money problems with more spending.",
  "Awareness is the first step to control.",
  "Control leads to confidence. Confidence builds wealth.",
  "Stop guessing. Start tracking.",
  "Financial freedom starts with honest numbers.",
  "You don’t rise by chance. You rise by discipline.",
  "The goal is not to look rich. It’s to be stable.",
  "Your future self is watching your decisions today.",
  "Delayed gratification is a financial superpower.",
  "Most people earn. Few people manage. Be different.",
  "You don’t need perfection. You need consistency.",
  "A budget tells your money where to go.",
  "Spending is easy. Controlling is power.",
  "The more you ignore your money, the more it controls you.",
  "Progress starts when excuses stop.",
  "Track. Adjust. Repeat. That’s the system.",
  "Control your money or it will control you.",
].map((text, index) => ({
  id: `fallback-${String(index + 1).padStart(2, "0")}`,
  title: "",
  text,
  audience: "all",
  category: "money",
  source: "fallback",
  status: "active",
  rotation_index: index,
}));

export function getTodayDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDayOfYear(date = new Date()) {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diff =
    date.getTime() -
    startOfYear.getTime() -
    (date.getTimezoneOffset() - startOfYear.getTimezoneOffset()) * 60000;

  return Math.floor(diff / 86400000);
}

export function normalizeTip(tip = {}) {
  const fallbackIdSeed = [tip?.source, tip?.title, tip?.text, tip?.scheduled_date]
    .map((value) => normalizeString(value))
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return {
    ...tip,
    id: tip?.id || tip?.fallback_id || fallbackIdSeed || "tip",
    title: normalizeString(tip?.title),
    text: normalizeString(tip?.text),
    category: normalizeString(tip?.category || "money") || "money",
    audience: normalizeString(tip?.audience || "all") || "all",
    status: normalizeString(tip?.status || "active") || "active",
    source: normalizeString(tip?.source || "admin") || "admin",
    scheduled_date: normalizeString(tip?.scheduled_date),
    approved_by: normalizeString(tip?.approved_by),
    created_by: normalizeString(tip?.created_by),
    created_at: tip?.created_at || null,
    updated_at: tip?.updated_at || null,
    rotation_index:
      Number.isInteger(tip?.rotation_index) && tip.rotation_index >= 0
        ? tip.rotation_index
        : null,
  };
}

export function buildTipTeaser(tip) {
  const normalized = normalizeTip(tip);
  if (normalized.title) return normalized.title;
  if (!normalized.text) return "A fresh money reminder for today";

  const firstSentence =
    normalized.text.match(/[^.!?]+[.!?]?/)?.[0]?.trim() || normalized.text;

  if (firstSentence.length <= 84) return firstSentence;
  return `${firstSentence.slice(0, 81).trimEnd()}...`;
}

export function getFallbackTipForDate(date = new Date()) {
  const dayNumber = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000
  );
  const index =
    ((dayNumber % FALLBACK_MONEY_TIPS.length) + FALLBACK_MONEY_TIPS.length) %
    FALLBACK_MONEY_TIPS.length;
  return normalizeTip(FALLBACK_MONEY_TIPS[index]);
}

export function selectCurrentAdminTip(tips = [], options = {}) {
  const today = options.today || getTodayDateString();
  const activeAdminTips = tips
    .map(normalizeTip)
    .filter((tip) => tip.source === "admin" && tip.status === "active" && tip.text);

  if (activeAdminTips.length === 0) return null;

  const exactMatch = activeAdminTips.find((tip) => tip.scheduled_date === today);
  if (exactMatch) return exactMatch;

  const availableToday = activeAdminTips.filter(
    (tip) => !tip.scheduled_date || tip.scheduled_date <= today
  );

  if (availableToday.length === 0) {
    return null;
  }

  const scheduledPool = availableToday.filter((tip) => tip.scheduled_date);
  if (scheduledPool.length > 0) {
    return [...scheduledPool].sort((a, b) => {
      if (a.scheduled_date !== b.scheduled_date) {
        return b.scheduled_date.localeCompare(a.scheduled_date);
      }

      const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
      const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
      return bTime - aTime;
    })[0];
  }

  return [...availableToday].sort((a, b) => {
    const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
    const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
    return bTime - aTime;
  })[0];
}

export function resolveDashboardTip(tips = [], options = {}) {
  const today = options.today || getTodayDateString();
  const adminTip = selectCurrentAdminTip(tips, { today });

  if (adminTip) {
    return {
      tip: adminTip,
      source: "admin",
      usingFallback: false,
      today,
    };
  }

  return {
    tip: getFallbackTipForDate(options.date || new Date()),
    source: "fallback",
    usingFallback: true,
    today,
  };
}
