import { executeAICommand, resolveAuthenticatedUser } from "@/lib/ai-command/command-executor";
import { loadFinanceSnapshot } from "@/lib/ai-command/finance-context";
import {
  AI_INTENTS,
  WRITE_INTENTS,
  buildCommand,
  isCancelText,
  isNoText,
  isYesText,
  parseCommand,
} from "@/lib/ai-command/command-parser";
import { askGeminiForUnderstanding, getGeminiStatus } from "@/lib/ai-command/gemini-service";

const GEMINI_COOLDOWN_MS = 2500;
const GEMINI_DAILY_LIMIT = 40;
const GEMINI_USAGE_KEY = "clara_ai_gemini_usage_v1";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getUserKey(user) {
  return user?.id || user?.email || "guest";
}

function getDisplayName(user) {
  return (
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.full_name ||
    user?.name ||
    user?.email?.split("@")?.[0] ||
    "there"
  );
}

function personalize(message, user) {
  const name = getDisplayName(user);
  return String(message || "").replaceAll("{name}", name);
}

function readGeminiUsage() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(GEMINI_USAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeGeminiUsage(usage) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GEMINI_USAGE_KEY, JSON.stringify(usage));
  } catch {
    // Ignore storage failure.
  }
}

function getGeminiUsageForUser(userKey) {
  const usage = readGeminiUsage();
  const day = todayKey();

  if (!usage[userKey] || usage[userKey].day !== day) {
    return {
      day,
      count: 0,
      lastCallAt: 0,
    };
  }

  return usage[userKey];
}

function saveGeminiUsageForUser(userKey, nextUsage) {
  const usage = readGeminiUsage();
  usage[userKey] = nextUsage;
  writeGeminiUsage(usage);
}

function canUseGemini(userKey) {
  const usage = getGeminiUsageForUser(userKey);
  const now = Date.now();

  if (usage.count >= GEMINI_DAILY_LIMIT) {
    return {
      allowed: false,
      reason: "daily_limit",
      usage,
    };
  }

  if (now - Number(usage.lastCallAt || 0) < GEMINI_COOLDOWN_MS) {
    return {
      allowed: false,
      reason: "cooldown",
      usage,
    };
  }

  return {
    allowed: true,
    reason: null,
    usage,
  };
}

function markGeminiUsed(userKey) {
  const usage = getGeminiUsageForUser(userKey);

  saveGeminiUsageForUser(userKey, {
    ...usage,
    count: Number(usage.count || 0) + 1,
    lastCallAt: Date.now(),
  });
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function isGreetingText(text) {
  return /^(hi|hello|hey|yo|sup|good morning|good afternoon|good evening|kamusta|kumusta|hi clara|hello clara|hey clara)\b/i.test(
    text,
  );
}

function isReturningText(text) {
  return /\b(i'm back|im back|back again|hello again|hi again|i returned|continue|let's continue|lets continue|where were we|pick up where we left off|continue from earlier)\b/i.test(
    text,
  );
}

function isPresenceText(text) {
  return /\b(are you there|you there|still there|anyone there|nandyan ka|andyan ka)\b/i.test(text);
}

function isHelpStarterText(text) {
  return /\b(can i ask|may i ask|can you help me|help me|tanong lang|ask lang|i need help|need help)\b/i.test(
    text,
  );
}

function isThanksText(text) {
  return /^(thanks|thank you|ty|salamat|okay thanks|ok thanks|thank you clara|thanks clara)\b/i.test(
    text,
  );
}

function isSmallTalkText(text) {
  return /\b(how are you|how's your day|hows your day|what's up|whats up|what are you doing|are you okay|are you real|are you ai|are you an ai|do you remember me|nice to meet you|haha|hehe|lol|lmao)\b/i.test(
    text,
  );
}

function detectMood(text) {
  const clean = normalizeText(text);

  if (
    /\b(happy|good mood|feel good|feeling good|great|excited|motivated|proud|blessed|good news|doing well|amazing|awesome)\b/i.test(
      clean,
    )
  ) {
    return "happy";
  }

  if (
    /\b(stress|stressed|tired|overwhelmed|worried|anxious|broke|struggling|lost|money stress|nahihirapan|problem|issue)\b/i.test(
      clean,
    )
  ) {
    return "stressed";
  }

  if (
    /\b(sad|down|discouraged|defeated|failed|messed up|disappointed|give up|not okay|not ok)\b/i.test(
      clean,
    )
  ) {
    return "sad";
  }

  if (/\b(angry|annoyed|frustrated|irritated|hate this|losing patience)\b/i.test(clean)) {
    return "angry";
  }

  if (
    /\b(confused|don't understand|dont understand|i do not understand|i'm lost|im lost|what should i do|explain this|guide me)\b/i.test(
      clean,
    )
  ) {
    return "confused";
  }

  if (/\b(i'm okay|im okay|i am okay|i'm fine|im fine|nothing much|just checking|just browsing)\b/i.test(clean)) {
    return "neutral";
  }

  return "neutral";
}

function isMoodText(text) {
  return detectMood(text) !== "neutral";
}

function isPureSmallTalk(text) {
  const clean = normalizeText(text);

  if (!clean) return true;
  if (isGreetingText(clean)) return true;
  if (isReturningText(clean)) return true;
  if (isPresenceText(clean)) return true;
  if (isHelpStarterText(clean)) return true;
  if (isThanksText(clean)) return true;
  if (isSmallTalkText(clean)) return true;
  if (isMoodText(clean)) return true;

  return false;
}

function isLikelySimpleFinanceCommand(text) {
  const clean = normalizeText(text);

  const hasAmount = /(?:₱|php|p)\s?\d+|\d+(?:\.\d{1,2})?/.test(clean);
  const hasExpenseWord =
    /\b(spent|expense|bought|paid|bayad|bumili|gastos|gumastos|kain|food|fare|pamasahe|coffee|load)\b/.test(
      clean,
    );

  const hasWalletWord =
    /\b(add funds|deposit|wallet|cash|gcash|bank|transfer|lipat|balance)\b/.test(clean);

  return hasAmount && (hasExpenseWord || hasWalletWord);
}

function isLastTransactionRequest(text) {
  const clean = normalizeText(text);

  return (
    /\b(last|latest|recent|newest|previous)\b/.test(clean) &&
    /\b(transaction|transactions|expense|expenses|spending|spent|purchase|payment|wallet movement|wallet update|history|record)\b/.test(
      clean,
    )
  );
}

function getTransactionTimestamp(item) {
  const rawDate =
    item?.created_at ||
    item?.transaction_date ||
    item?.date ||
    item?.spent_at ||
    item?.updated_at ||
    item?.timestamp ||
    item?.time;

  const time = rawDate ? new Date(rawDate).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function getTransactionAmount(item) {
  const rawAmount =
    item?.amount ??
    item?.total ??
    item?.value ??
    item?.price ??
    item?.cost ??
    item?.balance_change ??
    item?.change_amount;

  const amount = Number(rawAmount);
  return Number.isFinite(amount) ? amount : 0;
}

function getTransactionLabel(item, type) {
  return (
    item?.title ||
    item?.name ||
    item?.description ||
    item?.note ||
    item?.notes ||
    item?.category ||
    item?.type ||
    type ||
    "transaction"
  );
}

function formatPeso(amount) {
  const value = Number(amount || 0);

  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    return `₱${value.toLocaleString("en-PH")}`;
  }
}

function formatTransactionDate(item) {
  const timestamp = getTransactionTimestamp(item);
  if (!timestamp) return "";

  try {
    return new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    return "";
  }
}

function getLatestLocalTransaction(financeSnapshot) {
  const expenses = Array.isArray(financeSnapshot?.expenses) ? financeSnapshot.expenses : [];
  const walletTransactions = Array.isArray(financeSnapshot?.walletTransactions)
    ? financeSnapshot.walletTransactions
    : [];

  const expenseItems = expenses.map((item) => ({
    source: "expense",
    item,
    timestamp: getTransactionTimestamp(item),
  }));

  const walletItems = walletTransactions.map((item) => ({
    source: "wallet transaction",
    item,
    timestamp: getTransactionTimestamp(item),
  }));

  return [...expenseItems, ...walletItems].sort((a, b) => b.timestamp - a.timestamp)[0] || null;
}

function buildLatestTransactionMessage(financeSnapshot, user) {
  const latest = getLatestLocalTransaction(financeSnapshot);

  if (!latest?.item) {
    return personalize("{name}, I don’t see any transaction recorded yet.", user);
  }

  const amount = getTransactionAmount(latest.item);
  const label = getTransactionLabel(latest.item, latest.source);
  const dateText = formatTransactionDate(latest.item);
  const walletName =
    latest.item?.wallet_name ||
    latest.item?.walletName ||
    latest.item?.wallet?.name ||
    latest.item?.wallet ||
    "";

  const details = [
    `Your latest ${latest.source} is ${formatPeso(Math.abs(amount))}`,
    label ? `for ${label}` : "",
    walletName ? `from ${walletName}` : "",
    dateText ? `on ${dateText}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return personalize(`${details}.`, user);
}

function shouldTrustLocalParser(command) {
  if (!command) return false;
  if (!command.intent) return false;

  const passiveIntents = [AI_INTENTS.UNKNOWN, AI_INTENTS.GENERAL_GUIDANCE];

  if (passiveIntents.includes(command.intent)) return false;
  if (command.status === "awaiting_confirmation") return true;
  if (command.canExecute) return true;
  if (Number(command.confidence || 0) >= 0.65) return true;

  return false;
}

function shouldAskGemini({ text, localCommand, geminiStatus }) {
  if (!geminiStatus.configured) return false;
  if (isLastTransactionRequest(text)) return false;
  if (isPureSmallTalk(text)) return false;
  if (isLikelySimpleFinanceCommand(text) && shouldTrustLocalParser(localCommand)) return false;

  if (shouldTrustLocalParser(localCommand)) return false;

  const clean = normalizeText(text);

  const needsReasoning =
    /\b(advice|advise|should i|what should|decide|decision|help me decide|plan|strategy|recommend|recommendation|analyze|analyse|why|how can i|what do you think)\b/.test(
      clean,
    );

  const emotionalOrGuidance =
    /\b(stress|stressed|worried|anxious|scared|confused|overwhelmed|nahihirapan|problem|issue)\b/.test(
      clean,
    );

  return needsReasoning || emotionalOrGuidance || localCommand?.intent === AI_INTENTS.UNKNOWN;
}

async function understandInput({ text, session, financeSnapshot, userKey, user }) {
  const previous = session?.currentCommand;
  const geminiStatus = getGeminiStatus();
  const localCommand = parseCommand(text, previous);

  if (!shouldAskGemini({ text, localCommand, geminiStatus })) {
    return localCommand;
  }

  const geminiAccess = canUseGemini(userKey);

  if (!geminiAccess.allowed) {
    return {
      ...localCommand,
      assistantMessage:
        geminiAccess.reason === "daily_limit"
          ? personalize(
              "{name}, I can still help with tracking and simple finance actions, but I’ll pause deeper AI advice for today to protect your API cost.",
              user,
            )
          : buildConversationalFallback(text, user),
      status: localCommand?.status || "detected",
    };
  }

  try {
    markGeminiUsed(userKey);
    return await askGeminiForUnderstanding({ text, session, financeSnapshot });
  } catch (error) {
    console.warn("CLARA Gemini understanding failed:", error);
    return localCommand;
  }
}

function shouldExecuteImmediately(command) {
  return command?.canExecute && !WRITE_INTENTS.has(command.intent);
}

function hasGeminiMessage(command) {
  return Boolean(command?.assistantMessage && String(command.assistantMessage).trim());
}

function isPassiveConversation(command) {
  return [AI_INTENTS.UNKNOWN, AI_INTENTS.GENERAL_GUIDANCE].includes(command?.intent);
}

function cancelledTurn() {
  return {
    command: null,
    assistantMessage: "Alright, I won’t make any changes.",
    executionResult: null,
    status: "cancelled",
    awaitingConfirmation: false,
    cancellationState: "cancelled",
  };
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function buildConversationalFallback(input, user) {
  const text = normalizeText(input);
  const mood = detectMood(text);

  if (isGreetingText(text)) {
    return personalize(
      pickRandom([
        "Hey {name} 👋 nice to see you. How can I help with your finances today?",
        "Hi {name} 😊 I’m here. Want to check your expenses, budget, or wallet?",
        "Hello {name} 👋 what money move are we working on today?",
        "Hey {name}! How’s your money flow today? Want to track something or review your budget?",
      ]),
      user,
    );
  }

  if (isReturningText(text)) {
    return personalize(
      pickRandom([
        "Welcome back, {name} 👋 want to continue where we left off?",
        "Good to have you back, {name}. Want to check your finances or log something?",
        "Hey {name}, welcome back. Want to review your wallet, budget, or expenses?",
      ]),
      user,
    );
  }

  if (isPresenceText(text)) {
    return personalize(
      pickRandom([
        "Yes {name}, I’m here. What do you want to check or do with your finances?",
        "I’m here, {name} 👍 want to log something, check your budget, or make a money decision?",
      ]),
      user,
    );
  }

  if (isHelpStarterText(text)) {
    return personalize(
      pickRandom([
        "Of course, {name}. Tell me what’s going on and I’ll help you think it through.",
        "I’ve got you, {name}. What are we trying to solve today?",
      ]),
      user,
    );
  }

  if (isThanksText(text)) {
    return personalize(
      pickRandom([
        "You’re welcome, {name}. Keep going — small money decisions add up.",
        "Anytime, {name} 🙌 small wins still count.",
      ]),
      user,
    );
  }

  if (isSmallTalkText(text)) {
    return personalize(
      pickRandom([
        "I’m doing great, {name} 😄 just here keeping your finances in check. Want to manage expenses or check your budget?",
        "Still here and ready, {name}. Want to log an expense, check your wallet, or make a money decision?",
        "I’m good, {name} 😊 what would you like to work on today — expense, budget, or wallet?",
      ]),
      user,
    );
  }

  if (mood === "happy") {
    return personalize(
      pickRandom([
        "I like that energy, {name} 😄 let’s turn it into a smart money move. Want to track something?",
        "Nice, {name}! That’s a good vibe. Want to make a quick financial win today?",
        "Love that, {name}. Want to check your progress or log a win today?",
      ]),
      user,
    );
  }

  if (mood === "stressed") {
    return personalize(
      pickRandom([
        "I get that, {name}… money stress can hit hard. Let’s take it step by step — want me to check your spending?",
        "You’re not alone, {name}. Let’s break it down together. Want to see where your money is going?",
        "That sounds heavy, {name}. Let’s make it lighter — budget, expenses, or wallet first?",
      ]),
      user,
    );
  }

  if (mood === "sad") {
    return personalize(
      pickRandom([
        "Hey {name}… tough days happen. Let’s reset slowly. Want to review your finances together?",
        "I hear you, {name}. Let’s take control one step at a time. Want me to check your budget or expenses?",
        "It’s okay, {name}. We don’t need to fix everything at once. Want to start with one small money check?",
      ]),
      user,
    );
  }

  if (mood === "angry") {
    return personalize(
      pickRandom([
        "That sounds frustrating, {name}. Let’s turn that into action — want to fix something in your finances?",
        "I get it, {name}. Let’s channel that into control. What do you want to adjust?",
      ]),
      user,
    );
  }

  if (mood === "confused") {
    return personalize(
      pickRandom([
        "No worries, {name}. I’ve got you. What part do you want help with?",
        "Let’s figure it out together, {name}. What are you trying to do?",
        "That’s okay, {name}. Want me to guide you through expenses, wallet, or budget?",
      ]),
      user,
    );
  }

  return personalize(
    pickRandom([
      "I’m here, {name}. Tell me what you want help with — expense, wallet, budget, or a money decision.",
      "Tell me what you want to do, {name} — expense, wallet, budget, or decision. I’ve got you.",
      "Got you, {name}. Want to track something, check your money, or decide before spending?",
    ]),
    user,
  );
}

async function safeLoadFinanceSnapshot(user) {
  try {
    return await loadFinanceSnapshot(user);
  } catch (error) {
    console.warn("CLARA finance snapshot load failed:", error);

    return {
      expenses: [],
      wallets: [],
      walletTransactions: [],
      budgets: [],
      savingsGoals: [],
      transfers: [],
      summary: {
        totalBalance: 0,
        incomeThisMonth: 0,
        spentThisMonth: 0,
        spentToday: 0,
        moneyLeftThisMonth: 0,
        walletCount: 0,
        expenseCountThisMonth: 0,
        categoryTotals: {},
        topCategory: { name: "none", amount: 0 },
        budgetTotal: 0,
        savingsTarget: 0,
        savingsSaved: 0,
        savingsProgress: 0,
      },
    };
  }
}

export async function processAssistantTurn({ text, session, user }) {
  const input = String(text || "").trim();

  if (!input) {
    return {
      command: session?.currentCommand || null,
      assistantMessage: "",
      executionResult: null,
      status: session?.status || "idle",
      awaitingConfirmation: Boolean(session?.awaitingConfirmation),
    };
  }

  if (isCancelText(input)) return cancelledTurn();

  const activeUser = await resolveAuthenticatedUser(user);
  const userKey = getUserKey(activeUser);
  const previous = session?.currentCommand;

  if (previous?.status === "awaiting_confirmation" && isYesText(input)) {
    const command = { ...previous, status: "ready_to_execute", canExecute: true };
    const result = await executeAICommand(command, { user: activeUser });

    return {
      command: { ...command, status: result.success ? "executed" : "error" },
      assistantMessage: result.message,
      executionResult: result,
      status: result.success ? "executed" : "error",
      awaitingConfirmation: false,
    };
  }

  if (previous?.status === "awaiting_confirmation" && isNoText(input)) {
    return {
      ...cancelledTurn(),
      assistantMessage: "No problem. I paused that action. Tell me what to change, or start a new command.",
    };
  }

  if (isPureSmallTalk(input)) {
    return {
      command: buildCommand(AI_INTENTS.GENERAL_GUIDANCE, {}, 0.9),
      assistantMessage: buildConversationalFallback(input, activeUser),
      executionResult: null,
      status: "detected",
      awaitingConfirmation: false,
    };
  }

  const financeSnapshot = await safeLoadFinanceSnapshot(activeUser);

  if (isLastTransactionRequest(input)) {
    return {
      command: buildCommand(
        AI_INTENTS.GENERAL_GUIDANCE,
        {
          localAction: "latest_transaction",
        },
        0.95,
      ),
      assistantMessage: buildLatestTransactionMessage(financeSnapshot, activeUser),
      executionResult: null,
      status: "detected",
      awaitingConfirmation: false,
    };
  }

  const command = await understandInput({
    text: input,
    session,
    financeSnapshot,
    userKey,
    user: activeUser,
  });

  if (hasGeminiMessage(command) && isPassiveConversation(command)) {
    return {
      command,
      assistantMessage: command.assistantMessage,
      executionResult: null,
      status: command.status || "detected",
      awaitingConfirmation: false,
    };
  }

  if (shouldExecuteImmediately(command)) {
    if (hasGeminiMessage(command) && command.intent === AI_INTENTS.DECISION_GUIDANCE) {
      return {
        command,
        assistantMessage: command.assistantMessage,
        executionResult: null,
        status: command.status || "ready_to_execute",
        awaitingConfirmation: false,
      };
    }

    const result = await executeAICommand(command, { user: activeUser, financeSnapshot });

    return {
      command: { ...command, status: result.success ? "executed" : "error" },
      assistantMessage: result.message,
      executionResult: result,
      status: result.success ? "executed" : "error",
      awaitingConfirmation: false,
    };
  }

  const assistantMessage =
    command.status === "awaiting_confirmation"
      ? command.confirmationText
      : command.assistantMessage ||
        command.userPrompt ||
        ([AI_INTENTS.UNKNOWN, AI_INTENTS.GENERAL_GUIDANCE].includes(command.intent)
          ? buildConversationalFallback(input, activeUser)
          : "Got it. What should we do next?");

  return {
    command,
    assistantMessage,
    executionResult: null,
    status: command.status,
    awaitingConfirmation: command.status === "awaiting_confirmation",
  };
}

export function createEmptyAssistantCommand() {
  return buildCommand(AI_INTENTS.UNKNOWN, {}, 0.1);
}

export { getGeminiStatus };