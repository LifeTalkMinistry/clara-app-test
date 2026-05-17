const CLARA_MEMORY_KEY = "clara_behavioral_memory_v1";

const KNOWN_KEYS = [
  "incomePattern","livingSituation","responsibilities","workType","relationshipStatus","dependents","currentFinancialPressure","survivalPressureLevel","mainFinancialGoal","emotionalStateTrend",
  "emotionalTriggers","stressSpendingHabits","rewardSystem","commonImpulsivePurchases","biggestSpendingWeakness","copingMechanisms","motivationStyle","financialFear","guiltPatterns","socialPressureTriggers",
  "scheduleRoutine","sleepPattern","workExhaustion","socialEnvironment","relationshipConflicts","hobbyPatterns","energyLevelTrends","burnoutIndicators",
  "wallets","budgets","emergencyFund","savingsGoals","recurringExpenses","debt","subscriptions","transfers","paydayCycle",
  "incomePattern.cutoffDates","incomePattern.monthlyDate","incomePattern.predictability","paydayCycle.spendingShift","wallets.primary","budgets.styleDetail","emergencyFund.nextTarget","savingsGoals.risk","recurringExpenses.dueTiming","debt.type","subscriptions.auditNeed","transfers.purpose"
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

export function readClaraBehavioralMemory() {
  try {
    return JSON.parse(localStorage.getItem(CLARA_MEMORY_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeClaraBehavioralMemory(items) {
  const payload = { version: 1, updatedAt: new Date().toISOString(), items };
  localStorage.setItem(CLARA_MEMORY_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent("clara-behavioral-memory-updated", { detail: payload }));
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

  rootText.split("\n").forEach((line) => {
    const parsed = parseMemoryLine(line);
    if (!parsed || !KNOWN_KEYS.includes(parsed.key) || !parsed.value) return;
    next[parsed.key] = {
      key: parsed.key,
      label: labelFor(parsed.key),
      value: parsed.value,
      layer: layerFor(parsed.key),
      updatedAt: new Date().toISOString(),
    };
  });

  if (Object.keys(next).length > Object.keys(current).length) {
    writeClaraBehavioralMemory(next);
  }
}

if (typeof window !== "undefined") {
  window.CLARA_BEHAVIORAL_MEMORY = {
    read: readClaraBehavioralMemory,
    captureVisible: captureVisibleClaraMemory,
  };

  const observer = new MutationObserver(() => window.setTimeout(captureVisibleClaraMemory, 100));
  window.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("root");
    if (root) observer.observe(root, { childList: true, subtree: true, characterData: true });
    captureVisibleClaraMemory();
  });
}
