const CYCLE_STORAGE_PREFIX = "clara_daily_tip_cycle_v3";
const LEGACY_CYCLE_STORAGE_KEY = "clara_daily_tip_cycle_v2";
export const DAILY_TIP_CYCLE_VERSION = 3;

export function normalizeDailyTipUserId(userId) {
  return String(userId || "").trim() || "guest";
}

export function dailyTipCycleStorageKey(userId) {
  return `${CYCLE_STORAGE_PREFIX}:${encodeURIComponent(normalizeDailyTipUserId(userId))}`;
}

export function buildDailyTipCatalog(tips) {
  const seenTexts = new Set();
  const catalog = [];

  (Array.isArray(tips) ? tips : []).forEach((value, index) => {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text || seenTexts.has(text)) return;

    seenTexts.add(text);
    catalog.push({
      id: `daily-money-tip-${String(index + 1).padStart(3, "0")}`,
      text,
      index,
    });
  });

  return catalog;
}

export function createDailyTipOrder(catalog, userId, cycleNumber) {
  const ids = catalog.map((tip) => tip.id);
  const signature = catalog.map((tip) => `${tip.id}:${tip.text}`).join("|");
  const seed = hashString(
    `${normalizeDailyTipUserId(userId)}|${Math.max(0, Math.floor(Number(cycleNumber) || 0))}|${signature}`,
  );
  const random = createSeededRandom(seed);

  for (let index = ids.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
  }

  return ids;
}

export function resolveDailyTipAssignment({ storage, userId, dayKey, tips }) {
  const catalog = buildDailyTipCatalog(tips);
  if (!catalog.length) return emptyAssignment(dayKey);

  const resolvedUserId = normalizeDailyTipUserId(userId);
  const storageKey = dailyTipCycleStorageKey(resolvedUserId);
  const catalogSignature = catalog.map((tip) => `${tip.id}:${tip.text}`).join("|");
  let cycle = safeParse(safeGet(storage, storageKey));

  if (!isValidCycle(cycle, { userId: resolvedUserId, catalog, catalogSignature })) {
    cycle = createCycle(catalog, resolvedUserId, 0, catalogSignature);
  }

  const existingAssignment = cycle.assignments.find((assignment) => assignment.dayKey === dayKey);
  if (existingAssignment) {
    safeSet(storage, storageKey, JSON.stringify(cycle));
    safeRemove(storage, LEGACY_CYCLE_STORAGE_KEY);
    return assignmentResult(existingAssignment, catalog, cycle.cycleNumber, true);
  }

  if (cycle.usedTipIds.length >= catalog.length) {
    cycle = createCycle(catalog, resolvedUserId, cycle.cycleNumber + 1, catalogSignature);
  }

  const usedIds = new Set(cycle.usedTipIds);
  const pendingTipId =
    cycle.pending && !usedIds.has(cycle.pending.tipId) && cycle.order.includes(cycle.pending.tipId)
      ? cycle.pending.tipId
      : cycle.order.find((tipId) => !usedIds.has(tipId));
  const tipId = pendingTipId || cycle.order[0];
  const cycleDay = cycle.usedTipIds.length + 1;

  cycle = {
    ...cycle,
    pending: { dayKey, cycleDay, tipId },
    updatedAt: new Date().toISOString(),
  };

  safeSet(storage, storageKey, JSON.stringify(cycle));
  safeRemove(storage, LEGACY_CYCLE_STORAGE_KEY);
  return assignmentResult(cycle.pending, catalog, cycle.cycleNumber, false);
}

export function commitDailyTipAssignment({ storage, userId, dayKey, tips }) {
  const preview = resolveDailyTipAssignment({ storage, userId, dayKey, tips });
  if (!preview.tipId) return preview;

  const catalog = buildDailyTipCatalog(tips);
  const resolvedUserId = normalizeDailyTipUserId(userId);
  const storageKey = dailyTipCycleStorageKey(resolvedUserId);
  const cycle = safeParse(safeGet(storage, storageKey));
  if (!cycle || !isValidCycle(cycle, {
    userId: resolvedUserId,
    catalog,
    catalogSignature: catalog.map((tip) => `${tip.id}:${tip.text}`).join("|"),
  })) {
    return preview;
  }

  const existingAssignment = cycle.assignments.find((assignment) => assignment.dayKey === dayKey);
  if (existingAssignment) {
    return assignmentResult(existingAssignment, catalog, cycle.cycleNumber, true);
  }

  const pending = cycle.pending || {
    dayKey,
    cycleDay: cycle.usedTipIds.length + 1,
    tipId: preview.tipId,
  };
  const assignment = {
    dayKey,
    cycleDay: pending.cycleDay,
    tipId: pending.tipId,
    committedAt: new Date().toISOString(),
  };
  const usedTipIds = cycle.usedTipIds.includes(assignment.tipId)
    ? cycle.usedTipIds
    : [...cycle.usedTipIds, assignment.tipId];
  const nextCycle = {
    ...cycle,
    usedTipIds,
    assignments: [...cycle.assignments, assignment],
    pending: null,
    updatedAt: new Date().toISOString(),
  };

  safeSet(storage, storageKey, JSON.stringify(nextCycle));
  return assignmentResult(assignment, catalog, cycle.cycleNumber, true);
}

function createCycle(catalog, userId, cycleNumber, catalogSignature) {
  const now = new Date().toISOString();
  return {
    version: DAILY_TIP_CYCLE_VERSION,
    userId,
    cycleNumber,
    catalogSignature,
    order: createDailyTipOrder(catalog, userId, cycleNumber),
    usedTipIds: [],
    assignments: [],
    pending: null,
    createdAt: now,
    updatedAt: now,
  };
}

function isValidCycle(value, { userId, catalog, catalogSignature }) {
  if (!value || typeof value !== "object") return false;
  if (value.version !== DAILY_TIP_CYCLE_VERSION) return false;
  if (value.userId !== userId) return false;
  if (!Number.isInteger(value.cycleNumber) || value.cycleNumber < 0) return false;
  if (value.catalogSignature !== catalogSignature) return false;
  if (!Array.isArray(value.order) || value.order.length !== catalog.length) return false;
  if (!Array.isArray(value.usedTipIds) || !Array.isArray(value.assignments)) return false;

  const expectedIds = new Set(catalog.map((tip) => tip.id));
  const orderIds = new Set(value.order);
  if (orderIds.size !== expectedIds.size) return false;
  if (!value.order.every((tipId) => expectedIds.has(tipId))) return false;
  if (!value.usedTipIds.every((tipId) => expectedIds.has(tipId))) return false;

  return true;
}

function assignmentResult(assignment, catalog, cycleNumber, committed) {
  const selectedTip = catalog.find((tip) => tip.id === assignment.tipId) || catalog[0];
  return {
    tipId: selectedTip.id,
    text: selectedTip.text,
    index: selectedTip.index,
    dayKey: assignment.dayKey,
    cycleNumber,
    cycleDay: assignment.cycleDay,
    committed,
  };
}

function emptyAssignment(dayKey) {
  return {
    tipId: null,
    text: "",
    index: 0,
    dayKey,
    cycleNumber: 0,
    cycleDay: 0,
    committed: false,
  };
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function safeGet(storage, key) {
  try {
    return storage?.getItem?.(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(storage, key, value) {
  try {
    storage?.setItem?.(key, value);
  } catch {
    // The card still renders from the deterministic in-memory assignment.
  }
}

function safeRemove(storage, key) {
  try {
    storage?.removeItem?.(key);
  } catch {
    // Ignore cleanup failures.
  }
}

function safeParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}
