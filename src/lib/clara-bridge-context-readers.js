import { getRegisteredFinancialCards } from "@/components/financial-carousel/logic/FinancialCardRegistry";
import { learningHubData } from "@/components/fresh/main-dashboard/learning-hub/logic/learningHubData";
import { getFallbackTipForDate } from "@/lib/daily-tip-utils";
import { buildClaraLifeStageAiContext } from "@/lib/clara-life-stage-ai-context";

const SCHEDULE_STORAGE_PREFIX = "clara_schedule_events_v2";
const SCHEDULE_LEGACY_KEY = "clara_lifeos_schedule_events_v1";

function safeText(value = "") {
  return String(value || "").trim();
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function summarizeMessages(messages = [], limit = 12) {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) => safeText(message?.text))
    .slice(-limit)
    .map((message) => ({
      role: message.role || "unknown",
      text: safeText(message.text),
      source: message.source || null,
    }));
}

function seedScheduleEvents() {
  const today = new Date();

  return [
    {
      id: "sample-bill",
      title: "Bill protection",
      date: toDateKey(addDays(today, 3)),
      time: "09:00",
      type: "Bill",
      amount: "",
      note: "Protect money before this payment date.",
      source: "seeded_schedule_fallback",
    },
    {
      id: "sample-payday",
      title: "Payday planning",
      date: toDateKey(addDays(today, 7)),
      time: "",
      type: "Payday",
      amount: "",
      note: "Plan before confidence spending starts.",
      source: "seeded_schedule_fallback",
    },
  ];
}

function cleanScheduleEvent(event = {}, source = "schedule_storage") {
  const title = safeText(event.title);
  const date = safeText(event.date);

  if (!title || !date) return null;

  return {
    id: safeText(event.id) || `${date}-${title}`,
    title,
    date,
    time: safeText(event.time),
    type: safeText(event.type || "Personal"),
    amount: safeText(event.amount),
    note: safeText(event.note),
    source: event.source || source,
  };
}

function readScheduleEventsFromStorage() {
  if (typeof window === "undefined") return { events: seedScheduleEvents(), source: "seeded_schedule_fallback" };

  const storage = window.localStorage;
  const candidateKeys = [];

  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && key.startsWith(SCHEDULE_STORAGE_PREFIX)) candidateKeys.push(key);
    }

    if (storage.getItem(SCHEDULE_LEGACY_KEY)) candidateKeys.push(SCHEDULE_LEGACY_KEY);

    for (const key of candidateKeys) {
      const raw = storage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.length) continue;

      const cleaned = parsed
        .map((event) => cleanScheduleEvent(event, key === SCHEDULE_LEGACY_KEY ? "legacy_schedule_storage" : "schedule_storage"))
        .filter(Boolean)
        .filter((event) => {
          const lowerTitle = event.title.toLowerCase();
          return ![
            "sample-reset",
            "sample-checkin",
          ].includes(event.id) && !lowerTitle.includes("lifeos check-in");
        })
        .sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`));

      if (cleaned.length) return { events: cleaned, source: key };
    }
  } catch {
    return { events: seedScheduleEvents(), source: "seeded_schedule_fallback" };
  }

  return { events: seedScheduleEvents(), source: "seeded_schedule_fallback" };
}

export function buildClaraBridgeDailyMoneyTip() {
  const tip = getFallbackTipForDate(new Date());

  return {
    id: tip.id,
    title: tip.title || "Daily Money Tip",
    text: tip.text,
    category: tip.category || "money",
    source: tip.source || "fallback",
    note: "Fallback daily tip is readable. Admin/Supabase daily tip can be connected later.",
  };
}

export function buildClaraBridgeLearningHubProgress() {
  const materials = (Array.isArray(learningHubData) ? learningHubData : []).map((material) => ({
    id: material.id,
    title: material.title,
    subtitle: material.subtitle,
    type: material.type,
    pageCount: Array.isArray(material.pages) ? material.pages.length : 0,
  }));

  return {
    totalMaterials: materials.length,
    totalPages: materials.reduce((sum, item) => sum + Number(item.pageCount || 0), 0),
    materials,
    progressTracking: "not_connected_yet",
    note: "Learning Hub content is readable. User read-progress tracking is not connected yet.",
  };
}

export function buildClaraBridgeDashboardCardsCarousel() {
  const cards = getRegisteredFinancialCards({ includeLocked: true }).map((card) => ({
    key: card.key,
    type: card.type,
    label: card.label,
    detailKey: card.detailKey,
    minimumPlan: card.minimumPlan,
    featureFlag: card.featureFlag,
    enabled: card.enabled !== false,
    locked: Boolean(card.locked),
  }));

  return {
    totalCards: cards.length,
    cards,
    note: "Dashboard financial card registry is readable. Live card values come from wallet, budget, savings, emergency, investment, and debt readers.",
  };
}

export function buildClaraBridgeTimeContext() {
  const now = new Date();

  return {
    iso: now.toISOString(),
    localLabel: now.toLocaleString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
  };
}

export function buildClaraBridgeScheduleEvents() {
  const { events, source } = readScheduleEventsFromStorage();
  const nowKey = toDateKey(new Date());
  const upcomingEvents = events.filter((event) => event.date >= nowKey).slice(0, 10);
  const moneyImpactEvents = events.filter((event) => {
    const type = event.type.toLowerCase();
    return Boolean(event.amount) || type === "bill" || type === "payday" || type === "money";
  });

  return {
    connected: true,
    source,
    totalEvents: events.length,
    upcomingEvents,
    moneyImpactEvents: moneyImpactEvents.slice(0, 10),
    note: source === "seeded_schedule_fallback"
      ? "Schedule reader is connected. No saved schedule events were found, so CLARA can currently read the same starter schedule fallback used by the Schedule page."
      : "Schedule reader is connected and can read saved local schedule events.",
  };
}

export function buildClaraBridgeLifeStageContext() {
  const lifeStageContext = buildClaraLifeStageAiContext();
  const profileAnswers = lifeStageContext?.profileAnswers || {};
  const snapshotTopSignals = lifeStageContext?.snapshotTopSignals || [];

  return {
    lifeStageContext,
    lifeStageAiContext: lifeStageContext,
    meLifeStageProfile: lifeStageContext,
    Me_summary_profile: {
      connected: true,
      hasProfile: Boolean(lifeStageContext?.hasProfile),
      profileStatus: lifeStageContext?.profileStatus || "missing",
      lifeStage: lifeStageContext?.lifeStage || "not set",
      profileAnswers,
      note: lifeStageContext?.hasProfile
        ? "Me/Life Stage profile is readable."
        : "Me/Life Stage reader is connected, but no completed profile answers are saved yet.",
    },
    life_stage_snapshot_signals: snapshotTopSignals,
    dominant_pressure: lifeStageContext?.dominantPressure || "",
    recommended_next_moves: lifeStageContext?.recommendedNextMoves || [],
  };
}

export function buildClaraBridgeConversationContext(messages = []) {
  const recentMessages = summarizeMessages(messages);

  return {
    userMessageHistory: recentMessages,
    previousConversationMemory: recentMessages.length
      ? {
          recentMessageCount: recentMessages.length,
          recentMessages,
          note: "Current overlay session memory only. Persistent cross-session memory is not connected yet.",
        }
      : null,
  };
}

export function buildClaraBridgeReadableContext({ messages = [] } = {}) {
  const conversation = buildClaraBridgeConversationContext(messages);
  const lifeStage = buildClaraBridgeLifeStageContext();

  return {
    dailyMoneyTip: buildClaraBridgeDailyMoneyTip(),
    learningHubProgress: buildClaraBridgeLearningHubProgress(),
    dashboardCardsCarousel: buildClaraBridgeDashboardCardsCarousel(),
    currentTime: buildClaraBridgeTimeContext(),
    scheduleEvents: buildClaraBridgeScheduleEvents(),
    previousConversationMemory: conversation.previousConversationMemory,
    userMessageHistory: conversation.userMessageHistory,
    ...lifeStage,
  };
}
