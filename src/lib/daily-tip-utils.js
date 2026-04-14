const normalizeString = (value) => String(value ?? "").trim();

export function getTodayDateString() {
  return new Date().toISOString().split("T")[0];
}

export function getDayOfYear(date = new Date()) {
  return Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
}

export function selectCurrentAdminTip(tips = [], options = {}) {
  const today = options.today || getTodayDateString();
  const activeAdminTips = tips.filter((tip) => {
    const source = normalizeString(tip?.source || "admin").toLowerCase();
    const status = normalizeString(tip?.status).toLowerCase();
    return source === "admin" && status === "active";
  });

  if (activeAdminTips.length === 0) return null;

  const exactMatch = activeAdminTips.find((tip) => tip?.scheduled_date === today);
  if (exactMatch) return exactMatch;

  const availableToday = activeAdminTips.filter((tip) => {
    const scheduled = normalizeString(tip?.scheduled_date);
    return !scheduled || scheduled <= today;
  });

  if (availableToday.length === 0) {
    return [...activeAdminTips].sort((a, b) => {
      const aTime = new Date(a?.created_at || 0).getTime();
      const bTime = new Date(b?.created_at || 0).getTime();
      return bTime - aTime;
    })[0];
  }

  const scheduledPool = availableToday.filter((tip) => normalizeString(tip?.scheduled_date));
  if (scheduledPool.length > 0) {
    return [...scheduledPool].sort((a, b) => {
      const aDate = normalizeString(a?.scheduled_date);
      const bDate = normalizeString(b?.scheduled_date);
      if (aDate !== bDate) return bDate.localeCompare(aDate);

      const aTime = new Date(a?.updated_at || a?.created_at || 0).getTime();
      const bTime = new Date(b?.updated_at || b?.created_at || 0).getTime();
      return bTime - aTime;
    })[0];
  }

  const index = getDayOfYear(new Date()) % availableToday.length;
  return availableToday[index];
}

export function buildTipTeaser(tip) {
  const text = normalizeString(tip?.text);
  if (!text) return "No active money tip yet";

  const firstSentence =
    text.match(/[^.!?]+[.!?]?/)?.[0]?.trim() || text;

  if (firstSentence.length <= 88) return firstSentence;

  return `${firstSentence.slice(0, 85).trimEnd()}...`;
}
