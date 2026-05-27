import { getRegisteredFinancialCards } from "@/components/financial-carousel/logic/FinancialCardRegistry";
import { learningHubData } from "@/components/fresh/main-dashboard/learning-hub/logic/learningHubData";
import { getFallbackTipForDate } from "@/lib/daily-tip-utils";
import { buildClaraLifeStageAiContext } from "@/lib/clara-life-stage-ai-context";

const SCHEDULE_STORAGE_PREFIX = "clara_schedule_events_v2";
const SCHEDULE_LEGACY_KEY = "clara_lifeos_schedule_events_v1";
const LOCATION_CONTEXT_KEYS = ["CLARA_LOCATION_CONTEXT", "clara_location_context", "clara_user_location_v1"];
const WEATHER_CONTEXT_KEYS = ["CLARA_WEATHER_CONTEXT", "clara_weather_context", "clara_current_weather_v1"];
const LIVE_USER_MESSAGE_HISTORY_KEY = "CLARA_LIVE_USER_MESSAGE_HISTORY";
const CONVERSATION_MEMORY_KEYS = [
  "CLARA_PREVIOUS_CONVERSATION_MEMORY",
  "clara_previous_conversation_memory",
  "clara_conversation_memory_v1",
  "clara_chat_memory_v1",
  "clara_memory_v1",
];

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

function readJsonFromLocalStorage(keys = []) {
  if (typeof window === "undefined") return null;

  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return { ...parsed, source: key };
    } catch {
      // Ignore invalid optional context.
    }
  }

  return null;
}

function readLiveUserMessageHistory() {
  if (typeof window === "undefined" || typeof window.sessionStorage === "undefined") return [];

  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(LIVE_USER_MESSAGE_HISTORY_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed
          .filter((message) => safeText(message?.text))
          .slice(-20)
          .map((message, index) => ({
            id: safeText(message.id) || `live-user-${index}`,
            role: "user",
            text: safeText(message.text),
            source: message.source || "clara_overlay_live_session",
            capturedAt: safeText(message.capturedAt),
          }))
      : [];
  } catch {
    return [];
  }
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

function summarizeStoredMemory(value = null) {
  if (!value) return [];

  const rawItems = Array.isArray(value)
    ? value
    : Array.isArray(value.memories)
      ? value.memories
      : Array.isArray(value.items)
        ? value.items
        : Array.isArray(value.messages)
          ? value.messages
          : Array.isArray(value.recentMessages)
            ? value.recentMessages
            : [];

  return rawItems
    .filter(Boolean)
    .slice(-12)
    .map((item, index) => ({
      id: safeText(item.id) || `memory-${index}`,
      role: safeText(item.role || item.type || item.category || "memory"),
      text: safeText(item.text || item.message || item.summary || item.value || item.content),
      updatedAt: safeText(item.updatedAt || item.createdAt || item.date),
      source: item.source || value.source || "local_memory_storage",
    }))
    .filter((item) => item.text);
}

function readStoredConversationMemory() {
  const stored = readJsonFromLocalStorage(CONVERSATION_MEMORY_KEYS);
  const records = summarizeStoredMemory(stored);

  return {
    source: stored?.source || "local_memory_reader",
    records,
    hasStoredMemory: records.length > 0,
  };
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

export function buildClaraBridgeLocationContext() {
  const storedLocation = readJsonFromLocalStorage(LOCATION_CONTEXT_KEYS);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
  const locale = typeof navigator !== "undefined" ? navigator.language || "unknown" : "unknown";

  if (storedLocation) {
    return {
      connected: true,
      ...storedLocation,
      timezone: storedLocation.timezone || timezone,
      locale: storedLocation.locale || locale,
      note: "Location context reader is connected and found stored location context.",
    };
  }

  return {
    connected: true,
    timezone,
    locale,
    preciseLocationAvailable: false,
    permissionStatus: "not_requested_by_reader",
    note: "Location context reader is connected. Precise location is empty until CLARA adds a permission-based location capture or stored location context.",
  };
}

export function buildClaraBridgeWeatherContext() {
  const storedWeather = readJsonFromLocalStorage(WEATHER_CONTEXT_KEYS);

  if (storedWeather) {
    return {
      connected: true,
      ...storedWeather,
      note: "Weather context reader is connected and found stored weather context.",
    };
  }

  return {
    connected: true,
    currentWeatherAvailable: false,
    source: "not_configured",
    note: "Weather context reader is connected. Live weather remains empty until a weather provider or stored weather context is added.",
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
  const bridgeMessages = summarizeMessages(messages);
  const liveMessages = readLiveUserMessageHistory();
  const recentMessages = liveMessages.length ? liveMessages : bridgeMessages;
  const storedMemory = readStoredConversationMemory();

  return {
    userMessageHistory: recentMessages,
    previousConversationMemory: {
      connected: true,
      source: storedMemory.source,
      currentSessionMessageCount: recentMessages.length,
      currentSessionMessages: recentMessages,
      storedMemoryCount: storedMemory.records.length,
      storedMemoryRecords: storedMemory.records,
      hasStoredMemory: storedMemory.hasStoredMemory,
      persistentMemoryEnabled: storedMemory.hasStoredMemory,
      note: storedMemory.hasStoredMemory
        ? "Previous conversation memory reader is connected and found stored local memory."
        : "Previous conversation memory reader is connected. No saved persistent conversation memory is stored yet, so only current-session bridge messages are available when provided.",
    },
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
    location: buildClaraBridgeLocationContext(),
    weather: buildClaraBridgeWeatherContext(),
    scheduleEvents: buildClaraBridgeScheduleEvents(),
    previousConversationMemory: conversation.previousConversationMemory,
    userMessageHistory: conversation.userMessageHistory,
    ...lifeStage,
  };
}
