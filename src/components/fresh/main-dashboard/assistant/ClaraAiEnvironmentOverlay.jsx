import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, X } from "lucide-react";
import { buildClaraFinanceSnapshot, generateClaraLocalReply } from "@/lib/clara-local-brain";
import { generateClaraGeminiReply, hasGeminiConfig } from "@/lib/clara-gemini-client";
import { buildContextualFinanceReply } from "@/lib/clara-direct-finance-reply";

const CLARA_AI_BRAIN_VERSION = "connected-brain-v14-ai-led-behavioral-audit";
const PRESENTATION_RULES = "Reply like a natural mobile chat message. Plain text only. Use short readable paragraphs separated by blank lines when there is more than one thought. Bullets are allowed only when they make the answer easier to scan. No heavy headings, tables, or report format. Keep it warm, practical, and easy to read.";
const SHOW_DEBUG_SOURCE = import.meta.env.DEV || import.meta.env.VITE_CLARA_DEBUG_AI === "true";
const DEFAULT_CHAT_INPUT_PLACEHOLDER = "Ask CLARA or enter item + price";
const BEHAVIOR_CONFIDENCE_TARGET = 72;

const DEFAULT_CLARA_GREETINGS = [
  {
    eyebrow: "ASK BEFORE YOU SPEND",
    heading: "Hi, any spending concern today?",
    body: [
      "Tell CLARA what you are thinking of buying, changing, or checking before you act.",
      "You can also choose a guided path below if you want more structure.",
    ],
  },
  {
    eyebrow: "CLARA IS READY",
    heading: "What money situation are we figuring out?",
    body: [
      "Start with what is on your mind: a purchase, a budget concern, a savings goal, or a money pressure today.",
      "CLARA can talk naturally or guide you through a specific action when you choose one.",
    ],
  },
  {
    eyebrow: "BEFORE YOU ACT",
    heading: "Anything tempting your wallet today?",
    body: [
      "Share the item, amount, reason, or situation so CLARA can help you think clearly first.",
      "Choose a category below only when you want the screen to become more specific.",
    ],
  },
  {
    eyebrow: "MONEY CHECK-IN",
    heading: "Need help thinking through a decision?",
    body: [
      "You can ask freely, or select Smart Actions and Core Features when you need a more guided check.",
      "No rush. CLARA is here to help you pause before spending.",
    ],
  },
];

const CHAT_INPUT_PLACEHOLDERS = [
  "Tell CLARA what’s happening today...",
  "Share what’s affecting your spending...",
  "Tell CLARA about your current situation...",
  "What’s been going on lately?",
  "Share a habit, feeling, or concern...",
  "Tell CLARA before you decide...",
  "What should CLARA understand about you?",
  "Share anything CLARA should know...",
];

const TALK_TO_CLARA_CONTEXT_ACTION = {
  id: "talk_to_clara_context",
  title: "Talk to CLARA",
  shortTitle: "Talk to CLARA",
  prompt: "Continue the Talk to CLARA conversation naturally.",
  chips: [],
};

const TALK_TO_CLARA_LANGUAGE_PROMPT = `Hi 👩 I’m CLARA.

Before we continue, I want to quickly explain what this space is for.

Would you like me to explain it in English or Tagalog?`;

const TALK_TO_CLARA_INTRO_EN = `Talk to CLARA is where you can share the real situations behind your spending — habits, stress, goals, routines, emotions, or daily life situations.

I use that context to make future money guidance more personal, not just based on numbers.

Can we proceed to the next part, or do you have a question about that?`;

const TALK_TO_CLARA_INTRO_TL = `Ang Talk to CLARA ay space kung saan puwede mong ikuwento ang totoong sitwasyon sa likod ng spending mo — habits, stress, goals, routines, emotions, o daily life situations.

Ginagamit ko ang context na iyon para mas maging personal ang future money guidance ko, hindi lang based sa numbers.

Pwede na ba tayo mag-proceed sa next part, o may tanong ka muna tungkol dito?`;

const TALK_TO_CLARA_LANGUAGE_REMINDER_REPLY = "Please type \"English\" or \"Tagalog\" first, so I can explain it clearly.";
const TALK_TO_CLARA_PROCEED_REMINDER_REPLY = "Please type \"continue\" if you want to proceed, or ask me any question about this first.";

const EMPTY_TALK_PROFILE = {
  pendingName: "",
  name: "",
};

const BEHAVIOR_AUDIT_CATEGORIES = [
  // LEVEL 1 — Core Identity
  { id: "incomePattern", level: 1, label: "income pattern", priority: 1, question: "how their income usually comes in and whether it is stable or changing", keywords: ["income", "salary", "payday", "commission", "allowance", "stable", "monthly", "weekly", "cutoff", "sweldo"] },
  { id: "livingSituation", level: 1, label: "living situation", priority: 2, question: "who they live with and what home setup affects their spending", keywords: ["live", "living", "rent", "parents", "family", "apartment", "boarding", "house", "bahay"] },
  { id: "responsibilities", level: 1, label: "responsibilities", priority: 3, question: "who or what they are financially responsible for", keywords: ["responsible", "support", "family", "parents", "child", "children", "bills", "tuition", "utang", "obligation"] },
  { id: "workType", level: 1, label: "work type", priority: 4, question: "what kind of work or daily role they have and how it affects spending", keywords: ["work", "job", "bpo", "call center", "student", "business", "freelance", "shift", "night", "agent"] },
  { id: "relationshipStatus", level: 1, label: "relationship status", priority: 5, question: "whether relationship context affects their emotions or spending", keywords: ["single", "relationship", "boyfriend", "girlfriend", "partner", "married", "breakup", "heartbreak"] },
  { id: "dependents", level: 1, label: "dependents", priority: 6, question: "whether anyone depends on their money or care", keywords: ["dependent", "child", "kids", "parent", "parents", "sibling", "family", "support"] },
  { id: "currentFinancialPressure", level: 1, label: "current financial pressure", priority: 7, question: "what money pressure they feel right now", keywords: ["pressure", "short", "kulang", "tight", "struggle", "bills", "rent", "debt", "utang", "worried"] },
  { id: "survivalPressureLevel", level: 1, label: "survival pressure level", priority: 8, question: "how intense their survival pressure feels right now", keywords: ["survival", "emergency", "food", "rent", "bills", "barely", "can't afford", "panic", "critical"] },
  { id: "mainFinancialGoal", level: 1, label: "main financial goal", priority: 9, question: "their main financial goal right now", keywords: ["goal", "save", "savings", "emergency fund", "debt free", "pay off", "invest", "budget"] },
  { id: "emotionalStateTrend", level: 1, label: "current emotional state trend", priority: 10, question: "their current emotional pattern or mood trend", keywords: ["feel", "feeling", "sad", "lonely", "stress", "anxious", "burnout", "tired", "happy", "overwhelmed"] },

  // LEVEL 2 — Behavioral Spending Profile
  { id: "emotionalTriggers", level: 2, label: "emotional triggers", priority: 11, question: "what emotions usually trigger spending", keywords: ["trigger", "stress", "sad", "lonely", "angry", "bored", "reward", "comfort"] },
  { id: "stressSpendingHabits", level: 2, label: "stress spending habits", priority: 12, question: "how they spend when stressed", keywords: ["stress spending", "when stressed", "order food", "foodpanda", "grab", "shopping", "impulse"] },
  { id: "rewardSystem", level: 2, label: "reward system", priority: 13, question: "how they reward themselves and whether spending is part of it", keywords: ["reward", "deserve", "treat", "after work", "payday", "celebrate", "self care"] },
  { id: "commonImpulsivePurchases", level: 2, label: "common impulsive purchases", priority: 14, question: "what they commonly buy impulsively", keywords: ["impulse", "impulsive", "random", "buy", "checkout", "shopee", "lazada", "food", "coffee", "clothes"] },
  { id: "biggestSpendingWeakness", level: 2, label: "biggest spending weakness", priority: 15, question: "their biggest spending weakness", keywords: ["weakness", "can't stop", "tempted", "addicted", "always buy", "madalas"] },
  { id: "copingMechanisms", level: 2, label: "coping mechanisms", priority: 16, question: "what they do to cope when life feels heavy", keywords: ["cope", "coping", "escape", "relax", "unwind", "comfort", "distract"] },
  { id: "motivationStyle", level: 2, label: "motivation style", priority: 17, question: "what kind of encouragement or accountability works for them", keywords: ["motivate", "motivation", "strict", "gentle", "push", "accountability", "remind"] },
  { id: "financialFear", level: 2, label: "financial fear", priority: 18, question: "what financial fear they carry", keywords: ["fear", "afraid", "scared", "worry", "bankrupt", "poor", "no money", "maubos"] },
  { id: "guiltPatterns", level: 2, label: "guilt patterns", priority: 19, question: "whether they feel guilt after spending", keywords: ["guilt", "guilty", "regret", "sayang", "bad", "after buying"] },
  { id: "socialPressureTriggers", level: 2, label: "social pressure triggers", priority: 20, question: "whether friends, family, or social situations pressure them to spend", keywords: ["friends", "family", "coworker", "social", "pressure", "treat", "libre", "invite"] },

  // LEVEL 3 — Life Pattern Intelligence
  { id: "scheduleRoutine", level: 3, label: "schedule/routine", priority: 21, question: "their usual schedule or routine", keywords: ["routine", "schedule", "shift", "day off", "morning", "night", "weekly"] },
  { id: "sleepPattern", level: 3, label: "sleep pattern", priority: 22, question: "how sleep affects energy and spending", keywords: ["sleep", "puyat", "insomnia", "rest", "tired", "night shift", "nap"] },
  { id: "workExhaustion", level: 3, label: "work exhaustion", priority: 23, question: "how exhausted they feel from work", keywords: ["exhausted", "tired", "drained", "burnout", "calls", "queue", "shift", "workload"] },
  { id: "socialEnvironment", level: 3, label: "social environment", priority: 24, question: "how their environment or people around them affect spending", keywords: ["environment", "friends", "coworker", "team", "family", "office", "social"] },
  { id: "relationshipConflicts", level: 3, label: "relationship conflicts", priority: 25, question: "whether conflict or relationship stress affects their spending", keywords: ["conflict", "fight", "argument", "cheated", "breakup", "friend", "partner", "coworker"] },
  { id: "hobbyPatterns", level: 3, label: "hobby patterns", priority: 26, question: "what hobbies give fulfillment without unhealthy spending", keywords: ["hobby", "guitar", "basketball", "music", "game", "reading", "exercise"] },
  { id: "energyLevelTrends", level: 3, label: "energy level trends", priority: 27, question: "when their energy drops and how that affects spending", keywords: ["energy", "tired", "drained", "lazy", "after work", "low energy"] },
  { id: "burnoutIndicators", level: 3, label: "burnout indicators", priority: 28, question: "what signs show they may be burning out", keywords: ["burnout", "numb", "exhausted", "can't focus", "overwhelmed", "tired"] },

  // LEVEL 4 — Financial Infrastructure
  { id: "wallets", level: 4, label: "wallets", priority: 29, question: "what wallets or money sources they use", keywords: ["wallet", "cash", "gcash", "bank", "money", "balance"] },
  { id: "budgets", level: 4, label: "budgets", priority: 30, question: "how they budget money", keywords: ["budget", "category", "allocation", "limit", "planned"] },
  { id: "emergencyFund", level: 4, label: "emergency fund", priority: 31, question: "whether they have an emergency fund", keywords: ["emergency fund", "safety fund", "buffer", "savings"] },
  { id: "savingsGoals", level: 4, label: "savings goals", priority: 32, question: "what savings goals they are protecting", keywords: ["savings goal", "goal", "save", "target", "fund"] },
  { id: "recurringExpenses", level: 4, label: "recurring expenses", priority: 33, question: "what recurring expenses affect them", keywords: ["recurring", "monthly", "bill", "rent", "subscription", "internet", "electric"] },
  { id: "debt", level: 4, label: "debt", priority: 34, question: "whether debt is creating pressure", keywords: ["debt", "loan", "utang", "credit", "borrow", "pay off"] },
  { id: "subscriptions", level: 4, label: "subscriptions", priority: 35, question: "what subscriptions silently reduce money", keywords: ["subscription", "netflix", "spotify", "monthly", "premium", "auto debit"] },
  { id: "transfers", level: 4, label: "transfers", priority: 36, question: "how money moves between wallets or people", keywords: ["transfer", "send", "gcash", "bank", "remit", "padala"] },
  { id: "paydayCycle", level: 4, label: "payday cycle", priority: 37, question: "when payday happens and how spending changes around it", keywords: ["payday", "sweldo", "cutoff", "15", "30", "salary", "after payday"] },
];

const PANEL_COPY = {
  talk: {
    label: "Talk to CLARA",
    eyebrow: "TALK TO CLARA",
    heading: "Tell CLARA what’s really happening in your life.",
    body: [
      "Share anything that may affect your spending — habits, routines, goals, pressure, feelings, or daily situations.",
      "When you choose to save it, CLARA can use that context to guide future decisions based on you, not just your numbers.",
    ],
  },
  smart: {
    label: "Smart Actions",
    eyebrow: "SMART ACTIONS",
    heading: "Choose a guided money action.",
    body: [
      "Smart Actions are structured CLARA flows for faster financial decisions.",
      "Use them to check affordability, review spending leaks, plan savings, fix budget pressure, or decide your next best move.",
    ],
  },
  core: {
    label: "Core Features",
    eyebrow: "CORE FEATURES",
    heading: "Your financial system in one place.",
    body: [
      "Core Features are the foundations CLARA uses to understand your money.",
      "Manage wallets, budgets, emergency funds, savings goals, investments, and obligations so CLARA can give better guidance.",
    ],
  },
};

const CORE_FEATURES = [
  { id: "wallets", title: "Wallets", description: "Visible money and wallet pressure.", prompt: "Check my wallet health and tell me what money is safe to use today." },
  { id: "budgets", title: "Budgets", description: "Budget pressure and remaining room.", prompt: "Check my budget health and tell me what is pressured or still safe." },
  { id: "emergency", title: "Emergency Fund", description: "Safety buffer and protection.", prompt: "Check my emergency fund and tell me the next safest step." },
  { id: "savings-goals", title: "Savings Goals", description: "Savings progress and goal protection.", prompt: "Check my savings goals and tell me what spending could slow my goal." },
  { id: "investment", title: "Investment", description: "Growth money and future direction.", prompt: "Check my investment situation and tell me how it should fit my current money priorities." },
  { id: "debt-obligations", title: "Debt/Obligations", description: "Payables, pressure, and commitments.", prompt: "Check my debt and obligations pressure and tell me what I should prioritize next." },
];

const SMART_ACTIONS = [
  { id: "forecast", title: "Future Money Forecast", shortTitle: "Forecast", description: "Predict where your money is heading.", prompt: "Run my Future Money Forecast using income, expenses, budgets, savings, wallets, unplanned spending, and hidden risks.", chips: ["This week", "This month", "Next payday"] },
  { id: "checkup", title: "Spending Checkup", shortTitle: "Checkup", description: "Find spending leaks and patterns.", prompt: "Run my Spending Checkup. Explain my biggest spending leak and what to fix first.", chips: ["Be direct", "Gentle", "Biggest leak"] },
  { id: "savings-plan", title: "Savings Game Plan", shortTitle: "Savings Plan", description: "Reach savings realistically.", prompt: "Create my Savings Game Plan based on my current money, spending, and budget behavior.", chips: ["Safe plan", "Faster plan", "Daily steps"] },
  { id: "emergency-plan", title: "Emergency Fund Builder", shortTitle: "Emergency Fund", description: "Build a practical safety fund.", prompt: "Build my Emergency Fund plan using my expenses, income, savings, and wallet situation.", chips: ["Starter fund", "Full fund", "Monthly target"] },
  { id: "afford", title: "Can I Afford This?", shortTitle: "Afford Check", description: "Check if a purchase is safe.", prompt: "Help me check if I can afford a purchase. Ask for item and amount if needed.", chips: ["₱500", "₱1,000", "₱2,500"] },
  { id: "budget-fixer", title: "Budget Fixer", shortTitle: "Budget Fixer", description: "Improve budget allocation.", prompt: "Run my Budget Fixer and suggest better allocation based on my real spending behavior.", chips: ["Survival", "Savings", "Control"] },
  { id: "risk", title: "Hidden Risk Check", shortTitle: "Risk Check", description: "Find ignored future costs.", prompt: "Run my Hidden Risk Check and find ignored areas that may affect money later.", chips: ["Personal", "Family", "Bills"] },
  { id: "monthly-review", title: "Monthly Money Review", shortTitle: "Monthly Review", description: "Review wins, leaks, and next focus.", prompt: "Run my Monthly Money Review. Summarize what went well, what hurt my budget, biggest risk, and next focus.", chips: ["Quick", "Deep", "Next focus"] },
  { id: "next-move", title: "Next Best Move", shortTitle: "Next Move", description: "One clear action for today.", prompt: "Give me my Next Best Move based on my current money situation.", chips: ["Spending", "Saving", "Budgeting"] },
];

function pickRandomItem(items = []) {
  return items[Math.floor(Math.random() * items.length)] || items[0];
}

function pickDefaultGreeting() {
  return pickRandomItem(DEFAULT_CLARA_GREETINGS);
}

function pickChatInputPlaceholder() {
  return pickRandomItem(CHAT_INPUT_PLACEHOLDERS);
}

function normalizeChoice(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[“”"'`]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isEnglishChoice(choice = "") {
  return ["english", "eng", "en"].includes(choice);
}

function isTagalogChoice(choice = "") {
  return ["tagalog", "tl", "filipino", "taglish"].includes(choice);
}

function isProceedChoice(choice = "") {
  return ["yes", "y", "yeah", "yep", "continue", "proceed", "next", "go", "go ahead", "oo", "opo", "sige", "okay", "ok"].includes(choice);
}

function isNoChoice(choice = "") {
  return ["no", "nope", "nah", "not", "hindi", "di", "hinde"].includes(choice);
}

function isSkipChoice(choice = "") {
  return ["skip", "pass", "later", "not now", "next", "i dont know", "idk"].includes(choice);
}

function isQuestionLike(value = "") {
  const raw = String(value || "").trim();
  const text = normalizeChoice(raw);
  if (raw.includes("?")) return true;
  return /^(why|how|what|where|when|can|could|should|would|do|does|is|are|will|may)\b/i.test(text);
}

function looksLikeUrgentIssue(value = "") {
  const text = normalizeChoice(value);
  return [
    "can i buy", "should i buy", "i want to buy", "i bought", "stress", "stressed", "problem", "issue",
    "debt", "overspend", "overspending", "worried", "pressure", "emergency", "short money", "kulang"
  ].some((phrase) => text.includes(phrase));
}

function createEmptyBehaviorAudit() {
  return BEHAVIOR_AUDIT_CATEGORIES.reduce((audit, category) => {
    audit[category.id] = { score: 0, evidence: [] };
    return audit;
  }, {});
}

function categoryById(id) {
  return BEHAVIOR_AUDIT_CATEGORIES.find((category) => category.id === id) || null;
}

function getCategoryScore(audit, id) {
  return Number(audit?.[id]?.score || 0);
}

function estimateAnswerQuality(text = "", isFocus = false) {
  const value = String(text || "").trim();
  const choice = normalizeChoice(value);
  const words = value.split(/\s+/).filter(Boolean).length;

  if (!value || isProceedChoice(choice)) return 8;
  if (isSkipChoice(choice)) return 25;

  let score = 20;
  if (words >= 4) score = 35;
  if (words >= 9) score = 50;
  if (words >= 18) score = 65;
  if (words >= 35) score = 82;

  if (/\b(because|usually|madalas|kapag|when|every|monthly|weekly|after|before|since|kasi)\b/i.test(value)) score += 8;
  if (/₱|php|peso|salary|sweldo|family|stress|tired|pressure|goal|save|debt|utang/i.test(value)) score += 8;
  if (isFocus) score += 8;

  return Math.min(95, score);
}

function textMatchesCategory(text = "", category = {}) {
  const normalized = normalizeChoice(text);
  return (category.keywords || []).some((keyword) => normalized.includes(normalizeChoice(keyword)));
}

function updateBehaviorAuditFromUserText(audit, text, currentFocusId) {
  const nextAudit = { ...(audit || createEmptyBehaviorAudit()) };
  const snippet = String(text || "").trim().slice(0, 140);

  for (const category of BEHAVIOR_AUDIT_CATEGORIES) {
    const isFocus = category.id === currentFocusId;
    const matched = isFocus || textMatchesCategory(text, category);
    if (!matched) continue;

    const previous = nextAudit[category.id] || { score: 0, evidence: [] };
    const quality = estimateAnswerQuality(text, isFocus);
    const score = Math.max(previous.score || 0, quality);
    const evidence = snippet ? [...(previous.evidence || []), snippet].slice(-3) : previous.evidence || [];

    nextAudit[category.id] = { score, evidence };
  }

  return nextAudit;
}

function getWeakAuditCategories(audit, limit = 8) {
  return [...BEHAVIOR_AUDIT_CATEGORIES]
    .filter((category) => getCategoryScore(audit, category.id) < BEHAVIOR_CONFIDENCE_TARGET)
    .sort((a, b) => a.level - b.level || a.priority - b.priority)
    .slice(0, limit);
}

function chooseNextAuditFocus(audit, currentFocusId, userText = "") {
  const choice = normalizeChoice(userText);
  const current = categoryById(currentFocusId);
  const currentScore = current ? getCategoryScore(audit, current.id) : 0;

  if (current && currentScore < BEHAVIOR_CONFIDENCE_TARGET && !isSkipChoice(choice)) {
    return current.id;
  }

  const nextWeak = getWeakAuditCategories(audit, 1)[0];
  return nextWeak?.id || "complete";
}

function auditProgressSummary(audit) {
  const satisfied = BEHAVIOR_AUDIT_CATEGORIES
    .filter((category) => getCategoryScore(audit, category.id) >= BEHAVIOR_CONFIDENCE_TARGET)
    .map((category) => `${category.label} (${getCategoryScore(audit, category.id)}%)`)
    .slice(0, 10);

  const weak = getWeakAuditCategories(audit, 12)
    .map((category) => `${category.label} (${getCategoryScore(audit, category.id)}%)`);

  return {
    satisfied: satisfied.length ? satisfied.join(", ") : "none yet",
    weak: weak.length ? weak.join(", ") : "none",
  };
}

function titleCaseName(value = "") {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function extractLikelyName(value = "") {
  const raw = String(value || "").trim();
  const choice = normalizeChoice(raw);
  if (!raw || isProceedChoice(choice) || isSkipChoice(choice) || isNoChoice(choice) || isQuestionLike(raw)) return "";

  const cleaned = raw
    .replace(/^(my name is|i am|i'm|im|call me|you can call me|it is|it's|its)\s+/i, "")
    .replace(/[^a-zA-ZÀ-ÿ\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || cleaned.split(/\s+/).length > 3 || cleaned.length > 32) return "";
  return titleCaseName(cleaned);
}

function profileDisplayName(profile = {}) {
  return profile.name || profile.pendingName || "there";
}

function buildTalkIntroQuestionPrompt(userText = "") {
  return `The user is still in the short Talk to CLARA introduction.

User question or response:
${String(userText || "").trim()}

Answer the user's question naturally as CLARA.
Use clean mobile chat formatting: short paragraphs, blank lines between different thoughts, and simple bullets only if they make the answer clearer.
Keep it brief, warm, and practical.
Do not restart the full explanation.
End by asking: "Can we proceed to the next part, or do you have another question?"`;
}

function buildNameStartPrompt() {
  return `The user agreed to proceed into Talk to CLARA.

Start the profile-building conversation naturally.
Ask only for the user's preferred name first.
Do not explain the feature again.
Keep it warm, short, and mobile-friendly.`;
}

function buildNameConfirmationPrompt(name = "") {
  return `The user gave this preferred name: ${name}.

Reply warmly and ask if CLARA should call them ${name} moving forward.
Do not ask another profile question yet.
Keep it short.`;
}

function buildNameCorrectionPrompt() {
  return `The user did not confirm the name.

Ask what name they prefer CLARA to use.
Keep it short and warm.`;
}

function buildBehavioralAuditPrompt({ userText = "", audit, currentFocusId, nextFocusId, profile = {} }) {
  const currentFocus = categoryById(currentFocusId);
  const nextFocus = categoryById(nextFocusId);
  const summary = auditProgressSummary(audit);
  const name = profileDisplayName(profile);

  return `CLARA is in Talk to CLARA behavioral profiling mode.

This must FEEL like pure AI conversation to the user, but the local system is silently auditing the user's behavioral finance profile.
Do NOT reveal category names, confidence scores, audit logic, or internal tracking.

User's latest message:
${String(userText || "").trim()}

Known user name: ${name}
Current audit focus: ${currentFocus ? `${currentFocus.label} (${getCategoryScore(audit, currentFocus.id)}%)` : "none"}
Recommended next focus: ${nextFocus ? `${nextFocus.label} (${getCategoryScore(audit, nextFocus.id)}%)` : "none"}
Satisfied areas: ${summary.satisfied}
Weak or missing areas: ${summary.weak}

Behavioral framework CLARA is auditing:
Level 1 Core Identity: income pattern, living situation, responsibilities, work type, relationship status, dependents, current financial pressure, survival pressure level, main financial goal, emotional state trend.
Level 2 Behavioral Spending Profile: emotional triggers, stress spending habits, reward system, common impulsive purchases, biggest spending weakness, coping mechanisms, motivation style, financial fear, guilt patterns, social pressure triggers.
Level 3 Life Pattern Intelligence: schedule/routine, sleep pattern, work exhaustion, social environment, relationship conflicts, hobby patterns, energy trends, burnout indicators.
Level 4 Financial Infrastructure: wallets, budgets, emergency fund, savings goals, recurring expenses, debt, subscriptions, transfers, payday cycle.

Your job:
- Judge whether the user's latest answer gives enough depth for the current focus.
- If the answer is shallow, vague, or only an agreement like "yes/continue", ask a natural probing follow-up for the same focus.
- If the answer gives enough context, briefly acknowledge what it suggests and move to the recommended next missing focus.
- If the user reveals a real urgent money/life problem, pause profiling and help with that issue first.
- Ask exactly ONE question at the end.
- Keep it conversational, warm, and human. No checklist, no survey tone, no labels.
- Do not claim anything was permanently saved.
- Use clean mobile chat formatting with short paragraphs.`;
}

function buildTalkToClaraPrompt(userText = "", audit, profile = {}) {
  const summary = auditProgressSummary(audit || createEmptyBehaviorAudit());
  return `Talk to CLARA is active.

Actual user message:
${String(userText || "").trim()}

Known user name: ${profileDisplayName(profile)}
Internal behavioral context already understood: ${summary.satisfied}
Internal weak context still useful later: ${summary.weak}

Respond naturally as CLARA.
Use clean mobile chat formatting.
If the user shares a real issue, help with that issue first.
If it is natural to ask a follow-up, ask only one gentle question.
Do not reveal internal categories or scores.
Do not claim information was permanently saved.`;
}

function makeMessage(role, text, meta = {}) {
  return { id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`, role, text, ...meta };
}

function clean(text = "") {
  return String(text || "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-•]\s+/gm, "• ")
    .replace(/[ \t]+([,.!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeNaturalChatReply(text = "") {
  return clean(text)
    .replace(/\b(Money Signal|Spending Signal|Next Move|Risk|Budget|Wallet|Savings|Emergency Fund|Question|CLARA says|Money Note|Smart Action):\s*/gi, "")
    .replace(/[ \t]*\|[ \t]*/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function hiddenMessage(message = {}) {
  const text = String(message.text || "").toLowerCase();
  return text.includes("what are you thinking of buying") || text.includes("setting up the right clara check") || text.includes("wiring each action");
}

function formatMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 0 })}` : null;
}

function fallbackReply(prompt, context) {
  const direct = buildContextualFinanceReply(prompt, context);
  if (direct) return direct;

  const snapshot = buildClaraFinanceSnapshot(context || {});
  const local = normalizeNaturalChatReply(generateClaraLocalReply(prompt, context));

  if (local && !local.includes("I can help with money decisions") && !local.includes("What do you want to check?")) return local;

  const available = formatMoney(snapshot.availableMoney);
  const spent = formatMoney(snapshot.monthlySpent);

  if (!snapshot.hasAnyData) return "I need a little more finance data first.\n\nAdd your wallet, expenses, budget, savings, or emergency fund, then I can guide you better.";
  if (available && spent) return `You have ${available} visible money right now, and your spending shows ${spent}.\n\nKeep the next decision planned, necessary, and aligned with your current money pressure.`;
  if (available) return `You have ${available} visible money right now.\n\nKeep your next spending decision planned and aligned with your current budget.`;

  return "I can read your loaded finance context now.\n\nKeep the next decision planned, necessary, and aligned with your current money pressure.";
}

function getFallbackReplyForAction(prompt, context, action) {
  if (action?.id === "talk_to_clara_context") {
    if (prompt.includes("behavioral profiling mode")) {
      return "That helps me understand you a little better.\n\nCan you tell me more about what usually affects your spending the most lately?";
    }

    return "Good question. This space helps me understand the story behind your spending, not only the numbers.\n\nCan we proceed to the next part, or do you have another question?";
  }

  return fallbackReply(prompt, context);
}

function MessageText({ text }) {
  const reply = normalizeNaturalChatReply(text);
  const blocks = reply.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return (
    <div className="space-y-3 text-[13px] leading-[1.65] text-slate-100/90">
      {blocks.map((block, index) => {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
        const isBulletList = lines.length > 1 && lines.every((line) => line.startsWith("• "));

        if (isBulletList) {
          return (
            <ul key={`${block}-${index}`} className="list-disc space-y-1 pl-4">
              {lines.map((line) => <li key={line}>{line.replace(/^•\s*/, "")}</li>)}
            </ul>
          );
        }

        return <p key={`${block}-${index}`} className="whitespace-pre-wrap">{block}</p>;
      })}
    </div>
  );
}

function Insight({ text, source }) {
  return (
    <div className="space-y-2.5">
      {SHOW_DEBUG_SOURCE ? (
        <div className="inline-flex rounded-full bg-white/[0.05] px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/35">
          Source: {source === "gemini" ? "Gemini" : source === "local_context" ? "Local context" : source === "local_finance" ? "Local finance" : "Local fallback"}
        </div>
      ) : null}

      <MessageText text={text} />
    </div>
  );
}

function PanelButton({ active, children, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-full border px-3 py-2 text-[11px] font-black transition active:scale-95 ${active ? "border-emerald-200/25 bg-emerald-300/15 text-emerald-100" : "border-white/10 bg-white/[0.055] text-white/60 hover:bg-white/[0.08]"}`}>
      {children}
    </button>
  );
}

function OptionCard({ item, disabled, onClick }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="group min-h-[82px] rounded-[22px] border border-white/10 bg-white/[0.055] p-3 text-left shadow-[0_12px_26px_rgba(0,0,0,0.14)] transition hover:bg-white/[0.085] active:scale-[0.98] disabled:opacity-45">
      <p className="text-[12px] font-black leading-tight text-white group-active:text-emerald-100">{item.shortTitle || item.title}</p>
      <p className="mt-1.5 line-clamp-3 text-[10.5px] leading-4 text-slate-300/66">{item.description}</p>
    </button>
  );
}

function PanelInstructionBoard({ panel, greeting, onClose }) {
  const copy = panel ? PANEL_COPY[panel] : greeting;

  return (
    <div className="relative rounded-[30px] border border-white/10 bg-white/[0.045] px-5 pb-5 pt-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition-all duration-300">
      <button type="button" onClick={onClose} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-white/12 bg-white/[0.075] text-white/72 transition hover:bg-white/[0.12] active:scale-95" aria-label="Close CLARA AI mode">
        <X className="h-4 w-4" />
      </button>
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/55">{copy.eyebrow}</p>
      <h3 className="mt-3 text-2xl font-black leading-tight tracking-tight text-white">{copy.heading}</h3>
      <div className="mx-auto mt-3 max-w-[300px] space-y-2 text-sm leading-6 text-slate-300/75">
        {copy.body.map((line) => <p key={line}>{line}</p>)}
      </div>
    </div>
  );
}

function FloatingCloseButton({ onClose }) {
  return (
    <button type="button" onClick={onClose} className="absolute right-4 top-[max(env(safe-area-inset-top),18px)] z-10 grid h-9 w-9 place-items-center rounded-full border border-white/12 bg-white/[0.075] text-white/72 shadow-[0_14px_34px_rgba(0,0,0,0.16)] backdrop-blur-xl transition hover:bg-white/[0.12] active:scale-95" aria-label="Close CLARA AI mode">
      <X className="h-4 w-4" />
    </button>
  );
}

export default function ClaraAiEnvironmentOverlay({ isActive = false, messages = [], claraAssistantContext = {}, onClose }) {
  const [draft, setDraft] = useState("");
  const [localMessages, setLocalMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [panel, setPanel] = useState(null);
  const [greeting, setGreeting] = useState(() => pickDefaultGreeting());
  const [chatInputPlaceholder, setChatInputPlaceholder] = useState(() => pickChatInputPlaceholder());
  const [talkIntroState, setTalkIntroState] = useState("not_shown");
  const [talkProfile, setTalkProfile] = useState(EMPTY_TALK_PROFILE);
  const [behaviorAudit, setBehaviorAudit] = useState(() => createEmptyBehaviorAudit());
  const [behaviorFocus, setBehaviorFocus] = useState(null);
  const [talkPhase, setTalkPhase] = useState("intro");
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const visibleMessages = useMemo(() => {
    const externalMessages = Array.isArray(messages) ? messages : [];
    return [...externalMessages, ...localMessages].filter((message) => !hiddenMessage(message));
  }, [messages, localMessages]);

  useEffect(() => {
    if (!isActive) {
      setDraft("");
      setLocalMessages([]);
      setIsThinking(false);
      setPanel(null);
      setTalkIntroState("not_shown");
      setTalkProfile(EMPTY_TALK_PROFILE);
      setBehaviorAudit(createEmptyBehaviorAudit());
      setBehaviorFocus(null);
      setTalkPhase("intro");
      return undefined;
    }

    setPanel(null);
    setTalkIntroState("not_shown");
    setTalkProfile(EMPTY_TALK_PROFILE);
    setBehaviorAudit(createEmptyBehaviorAudit());
    setBehaviorFocus(null);
    setTalkPhase("intro");
    setGreeting(pickDefaultGreeting());
    setChatInputPlaceholder(pickChatInputPlaceholder());
    setLocalMessages((current) => current.filter((message) => !hiddenMessage(message)));
    const timer = window.setTimeout(() => inputRef.current?.focus?.(), 180);
    return () => window.clearTimeout(timer);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return undefined;
    const handleEscape = (event) => event.key === "Escape" && onClose?.();
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isActive, onClose]);

  useEffect(() => {
    if (isActive) messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [isActive, visibleMessages.length, isThinking]);

  if (!isActive) return null;

  const pushLocalClaraReply = ({ userText, reply, action = null, source = "local_context" }) => {
    setLocalMessages((current) => [
      ...current.filter((message) => !hiddenMessage(message)),
      makeMessage("user", userText),
      makeMessage("clara", reply, {
        source,
        ...(action ? { smartAction: action } : {})
      })
    ]);
  };

  const runClara = async ({ prompt, displayText = prompt, action = null }) => {
    const cleanPrompt = String(prompt || "").trim();
    const cleanDisplay = String(displayText || cleanPrompt).trim();

    if (!cleanPrompt || isThinking) return;

    const pending = makeMessage("clara", "Thinking...", { source: "system" });
    setIsThinking(true);

    setLocalMessages((current) => [
      ...current.filter((message) => !hiddenMessage(message)),
      makeMessage("user", cleanDisplay),
      pending
    ]);

    try {
      let reply = "";
      let source = "local_fallback";
      const directFinanceReply = action?.id === "talk_to_clara_context" ? "" : buildContextualFinanceReply(cleanPrompt, claraAssistantContext);

      if (directFinanceReply) {
        reply = directFinanceReply;
        source = "local_finance";
      } else if (hasGeminiConfig()) {
        try {
          reply = await generateClaraGeminiReply({
            message: `${cleanPrompt}\n\n${PRESENTATION_RULES}`,
            context: claraAssistantContext,
            mode: action?.id || "ai_environment",
            conversationHistory: [...visibleMessages, makeMessage("user", cleanDisplay)],
          });
          source = "gemini";
        } catch (error) {
          console.warn("[CLARA AI] Gemini failed, using local fallback", {
            message: error?.message,
            status: error?.status,
            payload: error?.payload,
          });
          reply = getFallbackReplyForAction(cleanPrompt, claraAssistantContext, action);
          source = action?.id === "talk_to_clara_context" ? "local_context" : "local_fallback";
        }
      } else {
        console.warn("[CLARA AI] Gemini configuration missing, using local fallback");
        reply = getFallbackReplyForAction(cleanPrompt, claraAssistantContext, action);
        source = action?.id === "talk_to_clara_context" ? "local_context" : "local_fallback";
      }

      setLocalMessages((current) => current.map((message) => {
        if (message.id !== pending.id) return message;
        return {
          ...message,
          text: normalizeNaturalChatReply(reply),
          source,
          ...(action ? { smartAction: action } : {})
        };
      }));
    } catch (error) {
      console.error("[CLARA AI] Fatal assistant modal error", error);

      setLocalMessages((current) => current.map((message) => {
        if (message.id !== pending.id) return message;
        return {
          ...message,
          text: getFallbackReplyForAction(cleanPrompt, claraAssistantContext, action),
          source: action?.id === "talk_to_clara_context" ? "local_context" : "local_fallback",
          ...(action ? { smartAction: action } : {})
        };
      }));
    } finally {
      setIsThinking(false);
    }
  };

  const submitDraft = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const isTalkToClaraMode = panel === "talk";

    if (isTalkToClaraMode && talkIntroState !== "confirmed") {
      const choice = normalizeChoice(text);
      let reply = TALK_TO_CLARA_LANGUAGE_PROMPT;
      let nextState = "awaiting_language";

      if (talkIntroState === "awaiting_language") {
        if (isEnglishChoice(choice)) {
          reply = TALK_TO_CLARA_INTRO_EN;
          nextState = "awaiting_continue_or_question";
        } else if (isTagalogChoice(choice)) {
          reply = TALK_TO_CLARA_INTRO_TL;
          nextState = "awaiting_continue_or_question";
        } else {
          reply = TALK_TO_CLARA_LANGUAGE_REMINDER_REPLY;
        }
      } else if (talkIntroState === "awaiting_continue_or_question") {
        if (isProceedChoice(choice)) {
          nextState = "confirmed";
          setTalkPhase("ask_name");
          runClara({ prompt: buildNameStartPrompt(), displayText: text, action: TALK_TO_CLARA_CONTEXT_ACTION });
          setTalkIntroState(nextState);
          setDraft("");
          return;
        }

        if (isEnglishChoice(choice)) {
          reply = TALK_TO_CLARA_INTRO_EN;
          nextState = "awaiting_continue_or_question";
        } else if (isTagalogChoice(choice)) {
          reply = TALK_TO_CLARA_INTRO_TL;
          nextState = "awaiting_continue_or_question";
        } else if (choice.length < 2) {
          reply = TALK_TO_CLARA_PROCEED_REMINDER_REPLY;
        } else {
          runClara({ prompt: buildTalkIntroQuestionPrompt(text), displayText: text, action: TALK_TO_CLARA_CONTEXT_ACTION });
          setDraft("");
          return;
        }
      }

      pushLocalClaraReply({ userText: text, reply, action: TALK_TO_CLARA_CONTEXT_ACTION });
      setTalkIntroState(nextState);
      setDraft("");
      return;
    }

    if (isTalkToClaraMode && talkPhase === "ask_name") {
      const name = extractLikelyName(text);

      if (!name || isQuestionLike(text) || looksLikeUrgentIssue(text)) {
        runClara({
          prompt: `CLARA is trying to learn what to call the user. The user said: ${text}\n\nIf this is a question or issue, answer naturally. Then gently ask what CLARA should call them. Keep it short.`,
          displayText: text,
          action: TALK_TO_CLARA_CONTEXT_ACTION,
        });
        setDraft("");
        return;
      }

      const nextProfile = { ...talkProfile, pendingName: name };
      setTalkProfile(nextProfile);
      setTalkPhase("confirm_name");
      runClara({ prompt: buildNameConfirmationPrompt(name), displayText: text, action: TALK_TO_CLARA_CONTEXT_ACTION });
      setDraft("");
      return;
    }

    if (isTalkToClaraMode && talkPhase === "confirm_name") {
      const choice = normalizeChoice(text);

      if (isProceedChoice(choice)) {
        const name = talkProfile.pendingName || "there";
        const nextProfile = { ...talkProfile, name };
        const nextFocus = chooseNextAuditFocus(behaviorAudit, null, text);

        setTalkProfile(nextProfile);
        setBehaviorFocus(nextFocus);
        setTalkPhase("behavioral_audit");
        runClara({
          prompt: buildBehavioralAuditPrompt({ userText: text, audit: behaviorAudit, currentFocusId: null, nextFocusId: nextFocus, profile: nextProfile }),
          displayText: text,
          action: TALK_TO_CLARA_CONTEXT_ACTION,
        });
        setDraft("");
        return;
      }

      if (isNoChoice(choice)) {
        setTalkProfile({ ...talkProfile, pendingName: "" });
        setTalkPhase("ask_name");
        runClara({ prompt: buildNameCorrectionPrompt(), displayText: text, action: TALK_TO_CLARA_CONTEXT_ACTION });
        setDraft("");
        return;
      }

      const newName = extractLikelyName(text);
      if (newName) {
        setTalkProfile({ ...talkProfile, pendingName: newName });
        runClara({ prompt: buildNameConfirmationPrompt(newName), displayText: text, action: TALK_TO_CLARA_CONTEXT_ACTION });
        setDraft("");
        return;
      }

      runClara({
        prompt: `CLARA is confirming whether to call the user ${talkProfile.pendingName || "by that name"}. The user said: ${text}\n\nRespond naturally and ask for a clear confirmation or the preferred name.`,
        displayText: text,
        action: TALK_TO_CLARA_CONTEXT_ACTION,
      });
      setDraft("");
      return;
    }

    if (isTalkToClaraMode && talkPhase === "behavioral_audit") {
      const nextAudit = updateBehaviorAuditFromUserText(behaviorAudit, text, behaviorFocus);
      const nextFocus = chooseNextAuditFocus(nextAudit, behaviorFocus, text);

      setBehaviorAudit(nextAudit);
      setBehaviorFocus(nextFocus);

      runClara({
        prompt: buildBehavioralAuditPrompt({ userText: text, audit: nextAudit, currentFocusId: behaviorFocus, nextFocusId: nextFocus, profile: talkProfile }),
        displayText: text,
        action: TALK_TO_CLARA_CONTEXT_ACTION,
      });
      setDraft("");
      return;
    }

    runClara({
      prompt: isTalkToClaraMode ? buildTalkToClaraPrompt(text, behaviorAudit, talkProfile) : text,
      displayText: text,
      action: isTalkToClaraMode ? TALK_TO_CLARA_CONTEXT_ACTION : null,
    });
    setDraft("");
  };

  return (
    <div className="fixed inset-0 z-[250] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-slate-950/72 px-4 pb-[max(env(safe-area-inset-bottom),14px)] pt-[max(env(safe-area-inset-top),18px)] text-white backdrop-blur-[2px]" data-clara-ai-brain-version={CLARA_AI_BRAIN_VERSION}>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_4%,rgba(45,212,191,0.24),transparent_32%),radial-gradient(circle_at_88%_22%,rgba(124,58,237,0.22),transparent_36%),linear-gradient(180deg,rgba(2,6,23,0.88),rgba(2,6,23,0.96))]" />
      {visibleMessages.length ? <FloatingCloseButton onClose={onClose} /> : null}

      <main className="min-h-0 flex-1 overflow-y-auto px-1 py-3 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
        {visibleMessages.length ? (
          <div className="flex min-h-full flex-col justify-end gap-3 pb-2 pt-12">
            {visibleMessages.map((message) => {
              const isUser = message.role === "user";
              const action = message.smartAction;
              return (
                <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div className={`px-4 py-3.5 text-[13px] leading-5 shadow-[0_14px_34px_rgba(0,0,0,0.16)] ${isUser ? "max-w-[88%] rounded-[24px] bg-emerald-300 text-slate-950" : "max-w-[88%] rounded-[24px] bg-white/[0.075] text-white/86 backdrop-blur-xl"}`}>
                    {isUser ? clean(message.text) : <Insight text={message.text} source={message.source} />}
                    {action && !isUser && action.chips?.length ? (
                      <div className="mt-3 border-t border-white/10 pt-3">
                        <p className="text-[12px] leading-5 text-emerald-100/85">What should we narrow down next?</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {action.chips.map((chip) => <button key={chip} type="button" disabled={isThinking} onClick={() => runClara({ prompt: `${action.prompt}\nUser selected: ${chip}`, displayText: chip, action })} className="rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-1.5 text-[11px] font-bold text-emerald-100 active:scale-95 disabled:opacity-45">{chip}</button>)}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex min-h-full flex-col justify-center gap-4 pb-2">
            <PanelInstructionBoard panel={panel} greeting={greeting} onClose={onClose} />

            <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
              <div className="grid grid-cols-3 gap-2">
                <PanelButton active={panel === "talk"} onClick={() => { setPanel("talk"); setTalkIntroState("not_shown"); setTalkProfile(EMPTY_TALK_PROFILE); setBehaviorAudit(createEmptyBehaviorAudit()); setBehaviorFocus(null); setTalkPhase("intro"); setChatInputPlaceholder(pickChatInputPlaceholder()); }}>Talk to CLARA</PanelButton>
                <PanelButton active={panel === "core"} onClick={() => setPanel("core")}>Core Features</PanelButton>
                <PanelButton active={panel === "smart"} onClick={() => setPanel("smart")}>Smart Actions</PanelButton>
              </div>

              {panel === "smart" ? <div className="mt-3 grid grid-cols-2 gap-2">{SMART_ACTIONS.map((action) => <OptionCard key={action.id} item={action} disabled={isThinking} onClick={() => runClara({ prompt: action.prompt, displayText: action.title, action })} />)}</div> : null}
              {panel === "core" ? <div className="mt-3 grid grid-cols-2 gap-2">{CORE_FEATURES.map((feature) => <OptionCard key={feature.id} item={feature} disabled={isThinking} onClick={() => runClara({ prompt: feature.prompt, displayText: feature.title, action: { ...feature, chips: ["Can I buy this?", "Next move", "Check risk"] } })} />)}</div> : null}
            </div>
          </div>
        )}
      </main>

      <form onSubmit={submitDraft} className="shrink-0 rounded-[28px] border border-white/16 bg-slate-950/68 p-2.5 shadow-[0_-18px_50px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl">
        <div className="flex items-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.055] px-3 py-2">
          <input ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} className="min-w-0 flex-1 bg-transparent py-2 text-[14px] font-medium text-white outline-none placeholder:text-slate-400/70" placeholder={panel === "talk" ? chatInputPlaceholder : DEFAULT_CHAT_INPUT_PLACEHOLDER} inputMode="text" />
          <button type="submit" disabled={!draft.trim() || isThinking} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-300 text-slate-950 shadow-[0_0_26px_rgba(110,231,183,0.22)] transition disabled:opacity-45 active:scale-95" aria-label="Send to CLARA"><ArrowUp className="h-5 w-5" /></button>
        </div>
      </form>
    </div>
  );
}
