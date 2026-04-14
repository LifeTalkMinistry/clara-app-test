const normalizeString = (value) => String(value ?? "").trim();

export const FALLBACK_MONEY_TIPS = [
  {
    id: "fallback-01",
    title: "Pay yourself first",
    text: "Move a small amount into savings the moment money comes in. What gets protected first is more likely to grow.",
  },
  {
    id: "fallback-02",
    title: "Name every peso",
    text: "A simple spending plan gives each peso a job before the week begins. Clarity usually reduces impulse spending faster than willpower alone.",
  },
  {
    id: "fallback-03",
    title: "Delay the urge",
    text: "When you want to buy something unplanned, wait 24 hours. Most urgent purchases get quieter when you give them time.",
  },
  {
    id: "fallback-04",
    title: "Track the tiny leaks",
    text: "Small repeat expenses shape your month more than one big splurge. Review subscriptions, snacks, delivery fees, and convenience purchases regularly.",
  },
  {
    id: "fallback-05",
    title: "Savings is a bill",
    text: "Treat savings like a required payment, not leftover money. If it sits last in line, it rarely gets funded.",
  },
  {
    id: "fallback-06",
    title: "Emergency beats perfect",
    text: "Your first goal is not a perfect portfolio. It is breathing room for emergencies so one bad week does not become a financial setback.",
  },
  {
    id: "fallback-07",
    title: "Budget with your real life",
    text: "A budget should match your actual habits, not your ideal self. Honest numbers lead to useful plans.",
  },
  {
    id: "fallback-08",
    title: "Automate what matters",
    text: "Automation protects good intentions from busy days. Even a small scheduled transfer can build a strong habit over time.",
  },
  {
    id: "fallback-09",
    title: "Separate your goals",
    text: "Keep savings goals in different buckets if you can. Emergency money, tuition, and travel feel more real when each one has its own purpose.",
  },
  {
    id: "fallback-10",
    title: "Income needs a plan",
    text: "A raise or side income helps most when you decide in advance where it goes. Extra money disappears quickly without direction.",
  },
  {
    id: "fallback-11",
    title: "Watch your defaults",
    text: "Most money habits happen on autopilot. Make the cheapest, healthiest choice the easiest one to repeat.",
  },
  {
    id: "fallback-12",
    title: "One strong habit wins",
    text: "You do not need ten money changes at once. One habit done consistently can reshape your month more than a perfect reset.",
  },
  {
    id: "fallback-13",
    title: "Review before payday",
    text: "Check your balances and spending before new money arrives. It helps you respond with intention instead of relief-driven spending.",
  },
  {
    id: "fallback-14",
    title: "Progress loves visibility",
    text: "Goals feel easier to continue when you can see them moving. Track wins where you will actually notice them.",
  },
  {
    id: "fallback-15",
    title: "Reduce friction for saving",
    text: "Make saving one tap away and spending a little slower. Small friction changes can protect you from emotional purchases.",
  },
  {
    id: "fallback-16",
    title: "Know your floor",
    text: "Your monthly essentials number is a power metric. Once you know your true baseline, better decisions come faster.",
  },
  {
    id: "fallback-17",
    title: "Borrow less from tomorrow",
    text: "Every impulsive purchase steals flexibility from future you. A wise pause today often feels like relief later.",
  },
  {
    id: "fallback-18",
    title: "Cash flow tells the truth",
    text: "Income matters, but cash flow decides daily stress. Focus on the gap between what comes in and what goes out.",
  },
  {
    id: "fallback-19",
    title: "Spend on purpose",
    text: "Cutting everything is not the goal. Spend intentionally on what matters and protect yourself from the rest.",
  },
  {
    id: "fallback-20",
    title: "Prepare for irregular costs",
    text: "Annual fees, school needs, and family events are not surprises if they happen every year. Break them into monthly mini-savings.",
  },
  {
    id: "fallback-21",
    title: "Debt needs a rhythm",
    text: "Debt feels lighter when you follow a steady plan. Consistency reduces mental load even before the balance is gone.",
  },
  {
    id: "fallback-22",
    title: "Build a reset routine",
    text: "A weekly money check-in prevents chaos from piling up. Ten calm minutes now can save you from stressed decisions later.",
  },
  {
    id: "fallback-23",
    title: "Protect your calm",
    text: "Financial peace is built through small repeated boundaries. Saying no to one careless expense is saying yes to stability.",
  },
  {
    id: "fallback-24",
    title: "Use goals that pull you",
    text: "Saving is easier when the goal is emotionally clear. Attach each target to a real reason, not just a number.",
  },
  {
    id: "fallback-25",
    title: "Notice your triggers",
    text: "Stress, boredom, and celebration all affect spending. When you know your triggers, you can design around them.",
  },
  {
    id: "fallback-26",
    title: "A plan beats guilt",
    text: "Guilt may make you pause once, but structure helps you improve for good. Replace self-judgment with a repeatable system.",
  },
  {
    id: "fallback-27",
    title: "Keep a small buffer",
    text: "Even a modest wallet buffer can stop short-term emergencies from turning into debt. Stability grows from margins.",
  },
  {
    id: "fallback-28",
    title: "Make growth visible",
    text: "Celebrate steady progress, not dramatic moments. Real money confidence usually grows quietly.",
  },
  {
    id: "fallback-29",
    title: "Good systems feel boring",
    text: "If your finances feel a little boring, that can be a good sign. Calm, repeatable systems usually beat dramatic rescue cycles.",
  },
  {
    id: "fallback-30",
    title: "Consistency compounds",
    text: "A small amount saved or tracked every day can change your future. Tiny disciplined actions become trust in yourself.",
  },
].map((tip, index) => ({
  ...tip,
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
  const index = (getDayOfYear(date) - 1 + FALLBACK_MONEY_TIPS.length) % FALLBACK_MONEY_TIPS.length;
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
