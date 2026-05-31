const VALID_STATUSES = new Set(["pending", "completed", "skipped"]);

export const DEFAULT_SCHEDULE_EXPENSE_PATH = [
  {
    category: "transport",
    label: "Transportation",
    sub_items: [
      { key: "transport_going_there", label: "Going to the fellowship", status: "pending", amount: 0 },
      { key: "transport_going_home", label: "Going back home", status: "pending", amount: 0 },
      { key: "transport_extra_stop", label: "Extra stop or side trip", status: "pending", amount: 0 },
    ],
  },
  {
    category: "food",
    label: "Food and drinks",
    sub_items: [
      { key: "food_personal", label: "Personal food or drinks", status: "pending", amount: 0 },
      { key: "food_treat_someone", label: "Treating someone / accountable person", status: "pending", amount: 0 },
      { key: "food_group_share", label: "Shared food contribution", status: "pending", amount: 0 },
    ],
  },
  {
    category: "fees",
    label: "Fees or contribution",
    sub_items: [
      { key: "fees_church_group", label: "Church or group contribution", status: "pending", amount: 0 },
      { key: "fees_venue", label: "Venue, entrance, table, or reservation fee", status: "pending", amount: 0 },
    ],
  },
  {
    category: "buffer",
    label: "Emergency buffer",
    sub_items: [{ key: "buffer_emergency", label: "Small emergency buffer", status: "pending", amount: 0 }],
  },
];

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeAmount(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount);
}

export function cloneExpensePath(path = DEFAULT_SCHEDULE_EXPENSE_PATH) {
  return normalizeExpensePath(path, DEFAULT_SCHEDULE_EXPENSE_PATH);
}

export function normalizeExpensePath(path, fallback = DEFAULT_SCHEDULE_EXPENSE_PATH) {
  const source = Array.isArray(path) && path.length ? path : fallback;
  return (Array.isArray(source) ? source : [])
    .map((category) => {
      const categoryKey = cleanText(category?.category).toLowerCase();
      const label = cleanText(category?.label) || categoryKey;
      const subItems = (Array.isArray(category?.sub_items) ? category.sub_items : [])
        .map((item) => {
          const status = cleanText(item?.status).toLowerCase();
          return {
            key: cleanText(item?.key),
            label: cleanText(item?.label),
            status: VALID_STATUSES.has(status) ? status : "pending",
            amount: normalizeAmount(item?.amount),
          };
        })
        .filter((item) => item.key && item.label);

      return { category: categoryKey, label, sub_items: subItems };
    })
    .filter((category) => category.category && category.sub_items.length);
}

export function sumExpensePath(path = []) {
  return normalizeExpensePath(path).reduce(
    (total, category) => total + category.sub_items.reduce((sum, item) => sum + normalizeAmount(item.amount), 0),
    0
  );
}

export function findExpenseSubItem(path = [], key = "") {
  const normalizedKey = cleanText(key);
  for (const category of normalizeExpensePath(path)) {
    const item = category.sub_items.find((subItem) => subItem.key === normalizedKey);
    if (item) return { category, item };
  }
  return { category: null, item: null };
}

export function getFirstPendingExpenseSubItem(path = []) {
  for (const category of normalizeExpensePath(path)) {
    const item = category.sub_items.find((subItem) => subItem.status === "pending");
    if (item) return { category: category.category, subItem: item.key, categoryLabel: category.label, subItemLabel: item.label };
  }
  return { category: "", subItem: "", categoryLabel: "", subItemLabel: "" };
}

export function getExpenseCategoryTotal(path = [], categoryKey = "") {
  const key = cleanText(categoryKey).toLowerCase();
  const category = normalizeExpensePath(path).find((item) => item.category === key);
  return category ? category.sub_items.reduce((sum, subItem) => sum + normalizeAmount(subItem.amount), 0) : 0;
}

export function updateExpenseSubItem(path = [], subItemKey = "", amount = 0, status = "completed") {
  const key = cleanText(subItemKey);
  const normalizedStatus = VALID_STATUSES.has(cleanText(status).toLowerCase()) ? cleanText(status).toLowerCase() : "completed";
  return normalizeExpensePath(path).map((category) => ({
    ...category,
    sub_items: category.sub_items.map((item) =>
      item.key === key ? { ...item, amount: normalizeAmount(amount), status: normalizedStatus } : item
    ),
  }));
}

export function detectCombinedTotalPhrase(value = "") {
  const text = cleanText(value).toLowerCase();
  if (!text) return false;
  return /(going\s+there\s+and\s+going\s+back\s+home|going\s+there\s+and\s+back\s+home|round\s*trip|balikan|total|all\s*in|overall|both\s+ways)/i.test(text);
}

function uniqueKnownSubItems(path = [], keys = []) {
  const normalizedPath = normalizeExpensePath(path);
  const seen = new Set();
  return (Array.isArray(keys) ? keys : [])
    .map(cleanText)
    .filter((key) => {
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return Boolean(findExpenseSubItem(normalizedPath, key).item);
    });
}

export function getSubItemsForCategory(path = [], categoryKey = "") {
  const key = cleanText(categoryKey).toLowerCase();
  const category = normalizeExpensePath(path).find((item) => item.category === key);
  return category ? category.sub_items.map((item) => item.key) : [];
}

export function reconcileCombinedTotalIntoExpensePath({ path = [], total = 0, affectedSubItems = [], activeSubItem = "", costSubItem = "", costCategory = "" } = {}) {
  let nextPath = normalizeExpensePath(path);
  const totalAmount = normalizeAmount(total);
  if (!totalAmount) return nextPath;

  let keys = uniqueKnownSubItems(nextPath, affectedSubItems);
  if (!keys.length && cleanText(costCategory)) keys = getSubItemsForCategory(nextPath, costCategory);
  if (!keys.length) keys = uniqueKnownSubItems(nextPath, [costSubItem, activeSubItem]);
  if (!keys.length) return nextPath;

  const activeKey = cleanText(costSubItem) || cleanText(activeSubItem);
  const preservedKeys = keys.filter((key) => {
    const item = findExpenseSubItem(nextPath, key).item;
    return item?.status === "completed" && key !== activeKey;
  });
  const preservedTotal = preservedKeys.reduce((sum, key) => sum + normalizeAmount(findExpenseSubItem(nextPath, key).item?.amount), 0);
  const remaining = Math.max(0, totalAmount - preservedTotal);

  const openKeys = keys.filter((key) => {
    const item = findExpenseSubItem(nextPath, key).item;
    return key === activeKey || item?.status !== "completed";
  });
  const targetKey = openKeys.includes(activeKey) ? activeKey : openKeys[0];
  if (!targetKey) return nextPath;

  nextPath = updateExpenseSubItem(nextPath, targetKey, remaining, "completed");

  return nextPath;
}

function normalizeConversationHistory(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .map((message) => ({
      role: message?.role === "assistant" ? "assistant" : "user",
      content: cleanText(message?.content || message?.text),
    }))
    .filter((message) => message.content)
    .slice(-30);
}

function normalizeSchedule(schedule = {}, form = {}) {
  return {
    title: cleanText(schedule?.title || form?.title),
    description: cleanText(schedule?.description || form?.note || form?.description),
    confirmed: Boolean(schedule?.confirmed),
  };
}

function normalizeConfirmedFacts(value = {}) {
  return {
    eventType: cleanText(value?.eventType),
    eventMeaningLocked: Boolean(value?.eventMeaningLocked),
    transportationExists: typeof value?.transportationExists === "boolean" ? value.transportationExists : null,
  };
}

function normalizeCurrentFlow(value = {}) {
  return {
    stage: cleanText(value?.stage || "confirm_intent"),
    activeCategory: cleanText(value?.activeCategory || value?.active_category),
    activeSubItem: cleanText(value?.activeSubItem || value?.active_sub_item),
  };
}

export function normalizeScheduleImpactSessionMemory(memory = {}, fallbacks = {}) {
  const previous = memory && typeof memory === "object" ? memory : {};
  const path = normalizeExpensePath(fallbacks.expensePath || previous.expensePath);
  const currentFlow = normalizeCurrentFlow({
    ...(previous.currentFlow || {}),
    stage: fallbacks.stage || previous.currentFlow?.stage,
    activeCategory: fallbacks.activeCategory || previous.currentFlow?.activeCategory,
    activeSubItem: fallbacks.activeSubItem || previous.currentFlow?.activeSubItem,
  });

  return {
    schedule: normalizeSchedule(previous.schedule, fallbacks.form || {}),
    conversationHistory: normalizeConversationHistory(fallbacks.messages || previous.conversationHistory),
    confirmedFacts: normalizeConfirmedFacts(previous.confirmedFacts),
    currentFlow,
    expensePath: path,
    runningEstimate: sumExpensePath(path),
  };
}

export function buildScheduleImpactSessionMemory({ previousMemory = null, form = {}, messages = [], stage = "confirm_intent", activeCategory = "", activeSubItem = "", expensePath = [] } = {}) {
  return normalizeScheduleImpactSessionMemory(previousMemory || {}, {
    form,
    messages,
    stage,
    activeCategory,
    activeSubItem,
    expensePath,
  });
}

export function appendScheduleImpactMessage(memory = {}, message = {}) {
  const normalized = normalizeScheduleImpactSessionMemory(memory);
  return normalizeScheduleImpactSessionMemory({
    ...normalized,
    conversationHistory: [...normalized.conversationHistory, message],
  });
}

export function mergeScheduleImpactAiIntoMemory(memory = {}, ai = {}, fallbacks = {}) {
  const normalized = normalizeScheduleImpactSessionMemory(memory, fallbacks);
  const scheduleUpdates = ai?.schedule_updates || {};
  const factsUpdates = ai?.confirmed_facts_updates || {};
  const nextSchedule = {
    ...normalized.schedule,
    title: cleanText(scheduleUpdates.title || ai?.suggested_title || normalized.schedule.title),
    description: cleanText(scheduleUpdates.description || ai?.suggested_description || normalized.schedule.description),
    confirmed: typeof scheduleUpdates.confirmed === "boolean" ? scheduleUpdates.confirmed : normalized.schedule.confirmed,
  };
  const nextFacts = normalizeConfirmedFacts({ ...normalized.confirmedFacts, ...factsUpdates });
  const nextFlow = normalizeCurrentFlow({
    stage: fallbacks.stage || ai?.stage || normalized.currentFlow.stage,
    activeCategory: fallbacks.activeCategory || ai?.active_category || normalized.currentFlow.activeCategory,
    activeSubItem: fallbacks.activeSubItem || ai?.active_sub_item || normalized.currentFlow.activeSubItem,
  });
  const nextPath = normalizeExpensePath(fallbacks.expensePath || ai?.expense_path || normalized.expensePath);

  return {
    schedule: nextSchedule,
    conversationHistory: normalizeConversationHistory(fallbacks.messages || normalized.conversationHistory),
    confirmedFacts: nextFacts,
    currentFlow: nextFlow,
    expensePath: nextPath,
    runningEstimate: sumExpensePath(nextPath),
  };
}
