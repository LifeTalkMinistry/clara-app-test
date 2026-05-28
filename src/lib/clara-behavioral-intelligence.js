import { searchMultipleMemoryCabinets } from "./memory-cabinets";
import { formatUniversalMemoryProfileForPrompt, readUniversalMemoryProfile } from "./clara-universal-memory-profile";
import { formatUserContextStoryForPrompt, readUserContextStory } from "./clara-user-context-story";

const CLARA_MEMORY_KEY = "clara_behavioral_memory_v1";

const LAYERS = {
  1: "Core Identity",
  2: "Behavioral Spending Profile",
  3: "Life Pattern Intelligence",
  4: "Financial Infrastructure",
};

const CATEGORY_HINTS = {
  incomePattern: "income rhythm",
  "incomePattern.cutoffDates": "exact income dates",
  livingSituation: "living setup",
  responsibilities: "financial responsibilities",
  workType: "work context",
  currentFinancialPressure: "current money pressure",
  survivalPressureLevel: "survival pressure",
  mainFinancialGoal: "main financial goal",
  emotionalStateTrend: "money emotion trend",
  emotionalTriggers: "emotional spending trigger",
  stressSpendingHabits: "stress spending habit",
  rewardSystem: "reward behavior",
  commonImpulsivePurchases: "impulse purchase pattern",
  biggestSpendingWeakness: "spending weakness",
  copingMechanisms: "coping behavior",
  motivationStyle: "preferred coaching style",
  financialFear: "financial fear",
  guiltPatterns: "spending guilt pattern",
  socialPressureTriggers: "social pressure trigger",
  scheduleRoutine: "routine and schedule",
  sleepPattern: "sleep pattern",
  workExhaustion: "work exhaustion",
  socialEnvironment: "social environment",
  relationshipConflicts: "relationship conflict",
  hobbyPatterns: "healthy fulfillment activity",
  energyLevelTrends: "energy drop pattern",
  burnoutIndicators: "burnout warning sign",
  wallets: "wallet setup",
  "wallets.primary": "main spending wallet",
  budgets: "budget style",
  emergencyFund: "emergency fund state",
  savingsGoals: "savings goal",
  recurringExpenses: "recurring expense pressure",
  debt: "debt pressure",
  subscriptions: "subscription behavior",
  transfers: "money transfer pattern",
  paydayCycle: "payday cycle",
  "paydayCycle.spendingShift": "after-payday behavior",
};

const CABINET_ROUTING_HINTS = [
  { terms: ["spend", "spent", "buy", "order", "food", "shopping", "expense", "gastos"], cabinets: ["Spending Memory", "Decision Memory"] },
  { terms: ["budget", "limit", "allocation", "category", "left"], cabinets: ["Budget Memory"] },
  { terms: ["wallet", "cash", "gcash", "maya", "bank", "balance"], cabinets: ["Wallet Memory"] },
  { terms: ["goal", "save", "saving", "target", "ipon"], cabinets: ["Goal Memory"] },
  { terms: ["emergency", "buffer", "survival", "safety"], cabinets: ["Emergency Memory"] },
  { terms: ["debt", "utang", "loan", "payable", "obligation"], cabinets: ["Debt Memory"] },
  { terms: ["schedule", "shift", "work", "after work", "payday", "routine", "sleep", "night"], cabinets: ["Schedule Memory"] },
  { terms: ["stress", "sad", "tired", "emotion", "lonely", "burnout", "drained", "reward"], cabinets: ["Emotional Memory"] },
  { terms: ["lifestyle", "habit", "routine", "family", "partner", "friends", "social"], cabinets: ["Lifestyle Memory", "Relationship Memory"] },
  { terms: ["learn", "lesson", "understand", "explain"], cabinets: ["Learning Memory"] },
  { terms: ["prefer", "tone", "style", "remind", "guidance"], cabinets: ["Preference Memory"] },
];

function safeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalize(value = "") {
  return safeText(value).toLowerCase();
}

function readBehavioralMemory() {
  if (typeof window === "undefined") return { items: {} };
  try {
    return JSON.parse(window.localStorage.getItem(CLARA_MEMORY_KEY) || "{}");
  } catch {
    return { items: {} };
  }
}

function itemText(item = {}) {
  const label = safeText(item.label || CATEGORY_HINTS[item.key] || item.key || "Memory");
  const value = safeText(item.value);
  return value ? `${label}: ${value}` : "";
}

function groupMemoryByLayer(items = []) {
  const groups = { 1: [], 2: [], 3: [], 4: [] };
  items.forEach((item) => {
    const layer = Number(item.layer) >= 1 && Number(item.layer) <= 4 ? Number(item.layer) : 2;
    groups[layer].push(item);
  });
  return groups;
}

function hasAny(text = "", terms = []) {
  const target = normalize(text);
  return terms.some((term) => target.includes(normalize(term)));
}

function findItem(items = [], key) {
  return items.find((item) => item.key === key || String(item.key || "").startsWith(`${key}.`));
}

function detectBehavioralSignals(message = "", items = []) {
  const signals = [];
  const text = normalize(message);
  const remembered = (key) => safeText(findItem(items, key)?.value);

  const payday = remembered("paydayCycle") || remembered("incomePattern.cutoffDates") || remembered("incomePattern");
  const afterPayday = remembered("paydayCycle.spendingShift");
  if (payday && (hasAny(text, ["payday", "cutoff", "salary", "sweldo", "income", "allowance"]) || afterPayday)) {
    signals.push(`Payday pattern: ${payday}${afterPayday ? `; after payday the user tends to: ${afterPayday}` : ""}.`);
  }

  const stressTrigger = remembered("emotionalTriggers") || remembered("stressSpendingHabits");
  if (stressTrigger && hasAny(text, ["stress", "stressed", "tired", "sad", "lonely", "bored", "burnout", "drained", "heavy"])) {
    signals.push(`Emotional spending risk: ${stressTrigger}.`);
  }

  const weakness = remembered("biggestSpendingWeakness") || remembered("commonImpulsivePurchases");
  if (weakness && hasAny(text, ["buy", "bought", "order", "spend", "shop", "craving", "want", "tempted"])) {
    signals.push(`Likely impulse area: ${weakness}.`);
  }

  const social = remembered("socialPressureTriggers") || remembered("socialEnvironment.who") || remembered("socialEnvironment");
  if (social && hasAny(text, ["friend", "family", "coworker", "church", "team", "invite", "social", "date", "relationship", "people"])) {
    signals.push(`Social pressure context: ${social}.`);
  }

  const energy = remembered("energyLevelTrends") || remembered("workExhaustion") || remembered("burnoutIndicators");
  if (energy && hasAny(text, ["tired", "after work", "shift", "sleep", "late", "energy", "burnout", "drained", "lazy"])) {
    signals.push(`Energy-based spending risk: ${energy}.`);
  }

  const goal = remembered("mainFinancialGoal") || remembered("savingsGoals") || remembered("emergencyFund");
  if (goal && hasAny(text, ["save", "goal", "emergency", "fund", "debt", "buy", "spend", "afford"])) {
    signals.push(`Goal protection context: ${goal}.`);
  }

  const tone = remembered("motivationStyle") || remembered("motivationStyle.boundary");
  if (tone) signals.push(`Preferred coaching style: ${tone}.`);

  return signals.slice(0, 6);
}

function buildNaturalMemorySummary(items = []) {
  const groups = groupMemoryByLayer(items);
  return Object.entries(groups)
    .map(([layer, layerItems]) => {
      const summary = layerItems
        .slice(0, 8)
        .map(itemText)
        .filter(Boolean)
        .join("; ");
      return summary ? `${LAYERS[layer]}: ${summary}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function selectCabinetsForMessage(message = "") {
  const text = normalize(message);
  const selected = new Set();

  CABINET_ROUTING_HINTS.forEach((hint) => {
    if (hint.terms.some((term) => text.includes(term))) {
      hint.cabinets.forEach((cabinet) => selected.add(cabinet));
    }
  });

  if (!selected.size) {
    selected.add("Spending Memory");
    selected.add("Emotional Memory");
    selected.add("Decision Memory");
  }

  return Array.from(selected).slice(0, 5);
}

function buildCabinetMemorySummary(message = "") {
  const cabinets = selectCabinetsForMessage(message);
  const memories = searchMultipleMemoryCabinets(cabinets, message, 5);

  if (!memories.length) {
    return "No long-term pattern summaries found yet.";
  }

  return memories
    .map((memory) => {
      const count = Number(memory.occurrenceCount || 1);
      const strength = memory.patternStrength || (count >= 3 ? "repeated" : count >= 2 ? "emerging" : "new");
      const recurrence = count > 1 ? ` (${strength} pattern, noticed ${count} times)` : "";
      return `- ${memory.summary}${recurrence}`;
    })
    .join("\n");
}

function buildUniversalMemorySummary() {
  const profile = readUniversalMemoryProfile();
  if (!profile.bulletCount) return "No universal memory profile saved yet.";
  return formatUniversalMemoryProfileForPrompt(profile);
}

function buildUserContextStorySummary() {
  const story = readUserContextStory();
  const text = formatUserContextStoryForPrompt(story);
  if (!story?.bulletCount && !story?.essay) return "No user context story saved yet.";
  return text;
}

function buildUserContextStoryPromptBlock() {
  const storySummary = buildUserContextStorySummary();
  if (storySummary === "No user context story saved yet.") return storySummary;

  return `By the way, below is the user's broader life story and personal context.

This is NOT meant to be repeated directly to the user.
Use it quietly to better understand the user emotionally, behaviorally, and personally.
Do NOT mention "context story".
Do NOT expose these bullets directly.
Do NOT sound robotic or analytical.

${storySummary}`;
}

export function getClaraBehavioralMemorySnapshot() {
  const memory = readBehavioralMemory();
  const items = Object.values(memory.items || {}).filter((item) => safeText(item?.value));
  return {
    updatedAt: memory.updatedAt || "",
    count: items.length,
    items,
    summary: buildNaturalMemorySummary(items),
  };
}

export function buildClaraBehavioralContextForPrompt(message = "") {
  const snapshot = getClaraBehavioralMemorySnapshot();
  const cabinetSummary = buildCabinetMemorySummary(message);
  const universalSummary = buildUniversalMemorySummary();
  const userContextStory = buildUserContextStoryPromptBlock();

  if (!snapshot.count) {
    return `CLARA BEHAVIORAL INTELLIGENCE MEMORY:
No saved Talk to CLARA behavioral memory yet.

Universal memory profile:
${universalSummary}

User context story:
${userContextStory}

Long-term pattern summaries:
${cabinetSummary}

Memory wording rules:
- Never say "your spending memory shows", "your emotional memory shows", "cabinet", "database", "stored memory", or "context story" to the user.
- Translate memory into natural human wording like "I’m noticing a pattern..." or "It looks like...".`;
  }

  const signals = detectBehavioralSignals(message, snapshot.items);

  return `CLARA BEHAVIORAL INTELLIGENCE MEMORY:
Saved details: ${snapshot.count}
Last updated: ${snapshot.updatedAt || "not available"}

4-layer memory summary:
${snapshot.summary}

Universal memory profile:
${universalSummary}

User context story:
${userContextStory}

Long-term pattern summaries:
${cabinetSummary}

Detected behavioral signals for this message:
${signals.length ? signals.map((signal) => `- ${signal}`).join("\n") : "- No strong behavioral signal detected from this message. Use memory lightly only if relevant."}

Behavioral response rules:
- Use this memory to reason, not to recite.
- Mention at most one or two relevant patterns naturally.
- Never say "your spending memory shows", "your emotional memory shows", "cabinet", "database", "stored memory", "routing", "internal scoring", or "context story" to the user.
- Prefer natural phrases like "I’m noticing a pattern...", "It looks like...", "This may be connected to...", or "A safer way to handle that pattern is...".
- If the user asks what CLARA knows, summarize warmly by human areas: life situation, spending behavior, life patterns, and financial setup.
- Adjust tone based on motivation style when present.
- If the user is making a spending decision, connect the advice to goal protection, pressure, emotion, energy, or payday timing when relevant.`;
}

export function getClaraBehavioralRiskLabel(message = "") {
  const snapshot = getClaraBehavioralMemorySnapshot();
  if (!snapshot.count) return "unknown";
  const signals = detectBehavioralSignals(message, snapshot.items);
  if (signals.length >= 4) return "high";
  if (signals.length >= 2) return "medium";
  if (signals.length === 1) return "low";
  return "calm";
}
