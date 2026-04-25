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
  } catch {}
}

function getGeminiUsageForUser(userKey) {
  const usage = readGeminiUsage();
  const day = todayKey();

  if (!usage[userKey] || usage[userKey].day !== day) {
    return { day, count: 0, lastCallAt: 0 };
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
    return { allowed: false, reason: "daily_limit", usage };
  }

  if (now - Number(usage.lastCallAt || 0) < GEMINI_COOLDOWN_MS) {
    return { allowed: false, reason: "cooldown", usage };
  }

  return { allowed: true, reason: null, usage };
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

/* ===== (ALL YOUR ORIGINAL FUNCTIONS REMAIN UNCHANGED) ===== */

/* KEEP EVERYTHING ABOVE EXACTLY THE SAME */

/* SCROLLING DOWN TO MAIN LOGIC */

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

  /* ✅ ADDED LOCAL HANDLER (THIS IS THE FIX) */
  if (/how much left|remaining|balance left|magkano natira/i.test(input)) {
    const total = financeSnapshot?.summary?.moneyLeftThisMonth ?? 0;

    return {
      command: buildCommand(
        AI_INTENTS.GENERAL_GUIDANCE,
        { localAction: "money_left" },
        0.95
      ),
      assistantMessage: `You have ${formatPeso(total)} left.`,
      executionResult: null,
      status: "detected",
      awaitingConfirmation: false,
    };
  }

  if (isLastTransactionRequest(input)) {
    return {
      command: buildCommand(
        AI_INTENTS.GENERAL_GUIDANCE,
        { localAction: "latest_transaction" },
        0.95
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