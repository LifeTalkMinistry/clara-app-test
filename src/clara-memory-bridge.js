import "./life-stage-progressive-flow";
import "./life-stage-selection-explanations";
import "./life-stage-hide-stage-picker-progress";
import "./life-stage-progressive-flow.css";
import "./clara-assistant-memory-tab";

const CLARA_MEMORY_KEY = "clara_behavioral_memory_v1";
const CLARA_MEMORY_DB = "clara_behavioral_memory_db";
const CLARA_MEMORY_STORE = "behavioral_memory";
const SNAPSHOT_ID = "active_profile";
const CLARA_LIVE_USER_MESSAGE_HISTORY_KEY = "CLARA_LIVE_USER_MESSAGE_HISTORY";

const KNOWN_KEYS = [
  "incomePattern","livingSituation","responsibilities","workType","relationshipStatus","dependents","currentFinancialPressure","survivalPressureLevel","mainFinancialGoal","emotionalStateTrend",
  "emotionalTriggers","stressSpendingHabits","rewardSystem","commonImpulsivePurchases","biggestSpendingWeakness","copingMechanisms","motivationStyle","financialFear","guiltPatterns","socialPressureTriggers",
  "scheduleRoutine","sleepPattern","workExhaustion","socialEnvironment","relationshipConflicts","hobbyPatterns","energyLevelTrends","burnoutIndicators",
  "wallets","budgets","emergencyFund","savingsGoals","recurringExpenses","debt","subscriptions","transfers","paydayCycle",
  "incomePattern.cutoffDates","incomePattern.monthlyDate","incomePattern.predictability","paydayCycle.spendingShift","wallets.primary","budgets.styleDetail","emergencyFund.nextTarget","savingsGoals.risk","recurringExpenses.dueTiming","debt.type","subscriptions.auditNeed","transfers.purpose",
  "livingSituation.familyContribution","livingSituation.rentPressure","livingSituation.soloPressure","responsibilities.frequency","responsibilities.debtType","workType.bpoRhythm","workType.spendingImpact","relationshipStatus.spendingEffect","dependents.supportPattern","currentFinancialPressure.specificPressure","survivalPressureLevel.mainCause","mainFinancialGoal.emergencyTarget","mainFinancialGoal.blocker","emotionalStateTrend.timing","emotionalTriggers.spendingAction","stressSpendingHabits.foodType","stressSpendingHabits.costPattern","rewardSystem.frequency","commonImpulsivePurchases.triggerPoint","biggestSpendingWeakness.pattern","copingMechanisms.spendingRisk","motivationStyle.boundary","financialFear.protectionNeed","guiltPatterns.afterEffect","socialPressureTriggers.boundary","scheduleRoutine.spendWindow","sleepPattern.cause","workExhaustion.spendEffect","socialEnvironment.who","relationshipConflicts.response","hobbyPatterns.frequency","energyLevelTrends.risk","burnoutIndicators.prevention"
].sort((a, b) => b.length - a.length);

const L1 = new Set("incomePattern livingSituation responsibilities workType relationshipStatus dependents currentFinancialPressure survivalPressureLevel mainFinancialGoal emotionalStateTrend".split(" "));
const L2 = new Set("emotionalTriggers stressSpendingHabits rewardSystem commonImpulsivePurchases biggestSpendingWeakness copingMechanisms motivationStyle financialFear guiltPatterns socialPressureTriggers".split(" "));
const L3 = new Set("scheduleRoutine sleepPattern workExhaustion socialEnvironment relationshipConflicts hobbyPatterns energyLevelTrends burnoutIndicators".split(" "));
const L4 = new Set("wallets budgets emergencyFund savingsGoals recurringExpenses debt subscriptions transfers paydayCycle".split(" "));

function layerFor(key) {
  const base = String(key || "").split(".")[0];
  if (L1.has(base)) return 1;
  if (L2.has(base)) return 2;
  if (L3.has(base)) return 3;
  if (L4.has(base)) return 4;
  return 2;
}

function labelFor(key = "") {
  return String(key)
    .split(".")
    .map((part) => part.replace(/([A-Z])/g, " $1"))
    .join(" — ")
    .replace(/^\w/, (letter) => letter.toUpperCase())
    .trim();
}

function now() {
  return new Date().toISOString();
}

function safeSnapshot(payload = {}) {
  return {
    version: 2,
    updatedAt: payload.updatedAt || now(),
    items: payload.items || {},
  };
}

function safeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function readLiveUserMessageHistory() {
  if (typeof sessionStorage === "undefined") return [];

  try {
    const parsed = JSON.parse(sessionStorage.getItem(CLARA_LIVE_USER_MESSAGE_HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => safeText(item?.text)).slice(-20) : [];
  } catch {
    return [];
  }
}

function writeLiveUserMessageHistory(messages = []) {
  if (typeof sessionStorage === "undefined") return [];

  const cleaned = (Array.isArray(messages) ? messages : [])
    .filter((item) => safeText(item?.text))
    .slice(-20)
    .map((item, index) => ({
      id: item.id || `live-user-${index}`,
      role: "user",
      text: safeText(item.text),
      source: item.source || "clara_overlay_live_session",
      capturedAt: item.capturedAt || now(),
    }));

  try {
    sessionStorage.setItem(CLARA_LIVE_USER_MESSAGE_HISTORY_KEY, JSON.stringify(cleaned));
    window.dispatchEvent(new CustomEvent("clara-live-user-message-history-updated", { detail: cleaned }));
  } catch {
    // Session message history is optional.
  }

  return cleaned;
}

function clearLiveUserMessageHistory() {
  if (typeof sessionStorage === "undefined") return;

  try {
    sessionStorage.removeItem(CLARA_LIVE_USER_MESSAGE_HISTORY_KEY);
    window.dispatchEvent(new CustomEvent("clara-live-user-message-history-updated", { detail: [] }));
  } catch {
    // Session message history is optional.
  }
}

function appendLiveUserMessage(text = "", source = "clara_overlay_live_session") {
  const value = safeText(text);
  if (!value) return [];

  const current = readLiveUserMessageHistory();
  const last = current[current.length - 1];
  const repeated = last && safeText(last.text).toLowerCase() === value.toLowerCase();

  if (repeated) return current;

  return writeLiveUserMessageHistory([
    ...current,
    {
      id: `live-user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role: "user",
      text: value,
      source,
      capturedAt: now(),
    },
  ]);
}

function openMemoryDb() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);

  return new Promise((resolve) => {
    const request = indexedDB.open(CLARA_MEMORY_DB, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CLARA_MEMORY_STORE)) {
        db.createObjectStore(CLARA_MEMORY_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function mirrorToIndexedDb(snapshot) {
  const db = await openMemoryDb();
  if (!db) return;

  await new Promise((resolve) => {
    const tx = db.transaction(CLARA_MEMORY_STORE, "readwrite");
    tx.objectStore(CLARA_MEMORY_STORE).put({ id: SNAPSHOT_ID, ...snapshot });
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });

  db.close?.();
}

async function hydrateFromIndexedDb() {
  if (localStorage.getItem(CLARA_MEMORY_KEY)) return;
  const db = await openMemoryDb();
  if (!db) return;

  const snapshot = await new Promise((resolve) => {
    const tx = db.transaction(CLARA_MEMORY_STORE, "readonly");
    const request = tx.objectStore(CLARA_MEMORY_STORE).get(SNAPSHOT_ID);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });

  db.close?.();
  if (snapshot?.items) {
    localStorage.setItem(CLARA_MEMORY_KEY, JSON.stringify(safeSnapshot(snapshot)));
    window.dispatchEvent(new CustomEvent("clara-behavioral-memory-updated", { detail: safeSnapshot(snapshot) }));
  }
}

export function readClaraBehavioralMemory() {
  try {
    return safeSnapshot(JSON.parse(localStorage.getItem(CLARA_MEMORY_KEY) || "{}"));
  } catch {
    return safeSnapshot({});
  }
}

export function writeClaraBehavioralMemory(items, options = {}) {
  const snapshot = safeSnapshot({ updatedAt: now(), items });
  localStorage.setItem(CLARA_MEMORY_KEY, JSON.stringify(snapshot));
  mirrorToIndexedDb(snapshot);
  window.dispatchEvent(new CustomEvent("clara-behavioral-memory-updated", { detail: { ...snapshot, reason: options.reason || "updated" } }));
  return snapshot;
}

export function updateClaraBehavioralMemoryItem(key, patch = {}) {
  if (!key) return readClaraBehavioralMemory();
  const current = readClaraBehavioralMemory().items || {};
  const previous = current[key] || {};
  const value = patch.value !== undefined ? String(patch.value).trim() : previous.value;

  if (!value) return readClaraBehavioralMemory();

  const next = {
    ...current,
    [key]: {
      key,
      label: patch.label || previous.label || labelFor(key),
      value,
      layer: Number(patch.layer || previous.layer || layerFor(key)),
      weight: Number(patch.weight ?? previous.weight ?? 1),
      pinned: Boolean(patch.pinned ?? previous.pinned ?? false),
      source: patch.source || previous.source || "manual",
      createdAt: previous.createdAt || now(),
      updatedAt: now(),
    },
  };

  return writeClaraBehavioralMemory(next, { reason: "item-updated" });
}

export function removeClaraBehavioralMemoryItem(key) {
  const current = readClaraBehavioralMemory().items || {};
  if (!current[key]) return readClaraBehavioralMemory();
  const next = { ...current };
  delete next[key];
  return writeClaraBehavioralMemory(next, { reason: "item-removed" });
}

export function toggleClaraBehavioralMemoryPin(key) {
  const current = readClaraBehavioralMemory().items || {};
  const item = current[key];
  if (!item) return readClaraBehavioralMemory();
  return updateClaraBehavioralMemoryItem(key, { ...item, pinned: !item.pinned });
}

function parseMemoryLine(line = "") {
  const cleanLine = line.replace(/^[•\-*]\s*/, "").trim();
  const colon = cleanLine.match(/^([A-Za-z0-9_.]+)\s*:\s*(.+)$/);
  if (colon) return { key: colon[1], value: colon[2] };
  const key = KNOWN_KEYS.find((item) => cleanLine.toLowerCase().startsWith(item.toLowerCase() + " "));
  return key ? { key, value: cleanLine.slice(key.length).trim() } : null;
}

export function captureVisibleClaraMemory() {
  const rootText = String(document.getElementById("root")?.innerText || "");
  if (!/understood from you so far|how CLARA understands you so far/i.test(rootText)) return;

  const current = readClaraBehavioralMemory().items || {};
  const next = { ...current };
  let changed = false;

  rootText.split("\n").forEach((line) => {
    const parsed = parseMemoryLine(line);
    if (!parsed || !KNOWN_KEYS.includes(parsed.key) || !parsed.value) return;

    const previous = next[parsed.key] || {};
    const previousValue = String(previous.value || "").trim();
    const incomingValue = String(parsed.value || "").trim();
    const repeated = previousValue && previousValue.toLowerCase() === incomingValue.toLowerCase();

    next[parsed.key] = {
      key: parsed.key,
      label: previous.label || labelFor(parsed.key),
      value: incomingValue,
      layer: previous.layer || layerFor(parsed.key),
      weight: Math.min(10, Number(previous.weight || 0) + (repeated ? 1 : 2)),
      pinned: Boolean(previous.pinned),
      source: previous.source || "talk-to-clara",
      createdAt: previous.createdAt || now(),
      updatedAt: now(),
    };

    changed = true;
  });

  if (changed) writeClaraBehavioralMemory(next, { reason: "captured-from-talk" });
}

function captureClaraSubmittedUserMessage(event) {
  if (!document.body?.classList?.contains("clara-ai-environment-active")) return;

  const form = event?.target;
  if (!(form instanceof HTMLFormElement)) return;

  const input = form.querySelector("input, textarea");
  const text = safeText(input?.value);
  if (!text) return;

  appendLiveUserMessage(text, "clara_overlay_submit");
}

function captureClaraQuickChoice(event) {
  if (!document.body?.classList?.contains("clara-ai-environment-active")) return;

  const button = event?.target?.closest?.("button");
  if (!button) return;
  if (button.getAttribute("aria-label")) return;
  if (button.type === "submit") return;

  const text = safeText(button.innerText || button.textContent);
  if (!text || text.length > 80) return;
  if (/^(source:|close|↑)$/i.test(text)) return;

  appendLiveUserMessage(text, "clara_overlay_quick_choice");
}

function installClaraLiveMessageCapture() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  let wasActive = document.body?.classList?.contains("clara-ai-environment-active") || false;

  if (wasActive) clearLiveUserMessageHistory();

  document.addEventListener("submit", captureClaraSubmittedUserMessage, true);
  document.addEventListener("click", captureClaraQuickChoice, true);

  const bodyObserver = new MutationObserver(() => {
    const isActive = document.body?.classList?.contains("clara-ai-environment-active") || false;
    if (isActive !== wasActive) {
      clearLiveUserMessageHistory();
      wasActive = isActive;
    }
  });

  window.addEventListener("DOMContentLoaded", () => {
    if (document.body) bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  });
}

if (typeof window !== "undefined") {
  window.CLARA_BEHAVIORAL_MEMORY = {
    read: readClaraBehavioralMemory,
    write: writeClaraBehavioralMemory,
    updateItem: updateClaraBehavioralMemoryItem,
    removeItem: removeClaraBehavioralMemoryItem,
    togglePin: toggleClaraBehavioralMemoryPin,
    captureVisible: captureVisibleClaraMemory,
    readLiveUserMessageHistory,
    appendLiveUserMessage,
    clearLiveUserMessageHistory,
  };

  hydrateFromIndexedDb();
  installClaraLiveMessageCapture();

  const observer = new MutationObserver(() => window.setTimeout(captureVisibleClaraMemory, 120));
  window.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("root");
    if (root) observer.observe(root, { childList: true, subtree: true, characterData: true });
    captureVisibleClaraMemory();
  });
}
