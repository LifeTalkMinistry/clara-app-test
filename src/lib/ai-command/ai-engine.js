import { executeAICommand, resolveAuthenticatedUser } from "@/lib/ai-command/command-executor";
import { computeFinanceSummary, loadFinanceSnapshot } from "@/lib/ai-command/finance-context";
import {
  AI_INTENTS,
  WRITE_INTENTS,
  buildCommand,
  formatPeso,
  isCancelText,
  isNoText,
  isYesText,
  parseCommand,
} from "@/lib/ai-command/command-parser";
import { askGeminiForUnderstanding, getGeminiStatus } from "@/lib/ai-command/gemini-service";
import {
  attachRouteToCommand,
  routeAssistantInput,
  shouldUseGeminiForRoute,
} from "@/lib/ai-command/clara-router";

const READ_INTENTS = new Set([
  AI_INTENTS.GET_LAST_EXPENSE,
  AI_INTENTS.CHECK_BALANCE,
  AI_INTENTS.READ_SPENDING,
  AI_INTENTS.READ_WALLET_HISTORY,
  AI_INTENTS.READ_BUDGET_STATUS,
  AI_INTENTS.READ_SAVINGS_STATUS,
  AI_INTENTS.ANALYZE_SPENDING,
  AI_INTENTS.SUGGEST_SAVINGS,
  AI_INTENTS.PLAN_SPENDING,
  AI_INTENTS.EMERGENCY_FUND_PLAN,
  AI_INTENTS.DECISION_GUIDANCE,
]);

const STATIC_READ_INTENTS = new Set([
  AI_INTENTS.GET_LAST_EXPENSE,
  AI_INTENTS.CHECK_BALANCE,
  AI_INTENTS.READ_SPENDING,
  AI_INTENTS.READ_WALLET_HISTORY,
  AI_INTENTS.READ_BUDGET_STATUS,
  AI_INTENTS.READ_SAVINGS_STATUS,
  AI_INTENTS.EMERGENCY_FUND_PLAN,
]);

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getDisplayName(user) {
  return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.name || user?.email?.split("@")?.[0] || "there";
}

function cancelledTurn(message = "Okay, I cancelled that.") {
  return {
    command: null,
    assistantMessage: message,
    executionResult: null,
    status: "cancelled",
    awaitingConfirmation: false,
    cancellationState: "cancelled",
  };
}

async function safeResolveUser(user) {
  try {
    return (await resolveAuthenticatedUser(user)) || user || { id: "local-user" };
  } catch (error) {
    console.warn("CLARA AI user resolution failed:", error);
    return user || { id: "local-user" };
  }
}

async function safeLoadFinanceSnapshot(user) {
  try {
    const snapshot = await loadFinanceSnapshot(user);
    return {
      ...(snapshot || {}),
      summary: snapshot?.summary || computeFinanceSummary(snapshot || {}),
    };
  } catch (error) {
    console.warn("CLARA AI finance snapshot failed:", error);
    const empty = { expenses: [], wallets: [], walletTransactions: [], budgets: [], savingsGoals: [], transfers: [] };
    return { ...empty, summary: computeFinanceSummary(empty) };
  }
}

function isPureSmallTalk(text) {
  const input = normalizeText(text).replace(/[!?.]+$/g, "");
  return /^(hi|hello|hey|yo|good morning|good afternoon|good evening|kumusta|kamusta|how are you|thanks|thank you)$/.test(input);
}

function isReflectiveMemoryMessage(text) {
  const input = normalizeText(text);

  if (!input) return false;

  const reflectiveSignal = /\b(i'?ve been|i have been|i noticed|lately|recently|because|helps me|helped me|trying to|i feel|i think|i realize|i realized|become more|improve|improving|better|balanced|discipline|disciplined|stress|emotionally|routine|habit|pattern|after work|sleep|energy|basketball|exercise|gym|jogging|fitness)\b/i.test(input);
  const explicitFinanceRead = /\b(how much|what'?s my balance|what is my balance|show my balance|check my balance|wallet balance|money left|available balance|latest transaction|last transaction|budget remaining|budget left|how much did i spend)\b/i.test(input);
  const explicitWrite = /\b(log|i spent|spent \d|paid \d|bought|add money|deposit|transfer|move money|create budget|set budget)\b/i.test(input);

  return reflectiveSignal && !explicitFinanceRead && !explicitWrite;
}

function buildConversationalFallback(text, user) {
  const input = normalizeText(text);
  const name = getDisplayName(user);
  if (/^(hi|hello|hey|yo|good morning|good afternoon|good evening|kumusta|kamusta)/.test(input)) {
    return `Hi ${name}! Want to check your wallet, log an expense, or move money today?`;
  }
  if (/how are you/.test(input)) return "I’m good — ready to help you stay on top of your money. What do you want to check first?";
  if (/thank/.test(input)) return "You’re welcome. I’m here when you want to check, log, move, or plan your money.";
  return "I can help with wallets, expenses, budgets, savings, and spending decisions. What do you want to do?";
}

function isBalanceQuestion(text) {
  if (isReflectiveMemoryMessage(text)) return false;
  const input = normalizeText(text);
  return (
    /\b(how much|what'?s|what is|show|check)\b.*\b(money|balance|wallet|cash|funds|have)\b/.test(input) ||
    /\b(total balance|wallet balance|money left|available money|currently have|current balance)\b/.test(input)
  );
}

function isLastTransactionRequest(text) {
  if (isReflectiveMemoryMessage(text)) return false;
  const input = normalizeText(text);
  return /\b(last|latest|recent|previous)\b.*\b(transaction|activity|wallet activity|movement)\b/.test(input);
}

function buildLatestTransactionMessage(snapshot = {}) {
  const latest = (snapshot.walletTransactions || [])[0];
  if (!latest) return "I do not see wallet activity yet.";
  const wallet = (snapshot.wallets || []).find((item) => String(item.id) === String(latest.wallet_id));
  const type = String(latest.type || "transaction").replace(/_/g, " ");
  const walletName = wallet?.name || wallet?.wallet_name || "a wallet";
  const note = latest.notes ? ` — ${latest.notes}` : "";
  return `Your latest wallet activity is ${type} of ${formatPeso(latest.amount)} in ${walletName}${note}.`;
}

function shouldExecuteImmediately(command, input = "") {
  if (!command?.canExecute) return false;
  if (command.status === "awaiting_confirmation") return false;
  if (WRITE_INTENTS.has(command.intent)) return false;
  if (command.route?.preferAssistantMessage && command.assistantMessage) return false;
  if (isReflectiveMemoryMessage(input) && STATIC_READ_INTENTS.has(command.intent)) return false;
  return command.status === "ready_to_execute" || READ_INTENTS.has(command.intent);
}

function shouldPreferLocalCommand(command, input = "") {
  if (!command || command.intent === AI_INTENTS.UNKNOWN) return false;
  if (isReflectiveMemoryMessage(input) && READ_INTENTS.has(command.intent)) return false;
  if (WRITE_INTENTS.has(command.intent)) return true;
  if (command.intent === AI_INTENTS.DECISION_GUIDANCE) return false;
  if (READ_INTENTS.has(command.intent)) return true;
  return Number(command.confidence || 0) >= 0.78;
}

async function understandInput({ text, session, financeSnapshot }) {
  const localCommand = parseCommand(text, session?.currentCommand || null);
  const routeResult = routeAssistantInput({ text, session, localCommand });

  if (shouldPreferLocalCommand(localCommand, text) && !shouldUseGeminiForRoute(routeResult, localCommand)) {
    return attachRouteToCommand(localCommand, routeResult);
  }

  try {
    if (shouldUseGeminiForRoute(routeResult, localCommand)) {
      const geminiCommand = await askGeminiForUnderstanding({ text, session, financeSnapshot });
      if (geminiCommand?.intent && geminiCommand.intent !== AI_INTENTS.UNKNOWN) {
        return attachRouteToCommand(geminiCommand, routeResult);
      }
    }
  } catch (error) {
    console.warn("CLARA Gemini understanding failed:", error);
  }

  return localCommand.intent === AI_INTENTS.UNKNOWN
    ? attachRouteToCommand(
        buildCommand(
          AI_INTENTS.GENERAL_GUIDANCE,
          { label: text },
          0.45,
          "I can help with wallets, expenses, budgets, savings, and money decisions. Try asking me to check your balance or log an expense."
        ),
        routeResult
      )
    : attachRouteToCommand(localCommand, routeResult);
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

  const activeUser = await safeResolveUser(user);
  const previous = session?.currentCommand;

  if (previous?.status === "awaiting_confirmation" && isYesText(input)) {
    const command = { ...previous, status: "ready_to_execute", canExecute: true };
    const financeSnapshot = await safeLoadFinanceSnapshot(activeUser);
    const result = await executeAICommand(command, { user: activeUser, financeSnapshot });
    return {
      command: { ...command, status: result.success ? "executed" : "error" },
      assistantMessage: result.message,
      executionResult: result,
      status: result.success ? "executed" : "error",
      awaitingConfirmation: false,
    };
  }

  if (previous?.status === "awaiting_confirmation" && isNoText(input)) {
    return cancelledTurn("No problem. I paused that action. Tell me what to change, or start a new command.");
  }

  if (isPureSmallTalk(input)) {
    const command = buildCommand(AI_INTENTS.GENERAL_GUIDANCE, {}, 0.9);
    const routeResult = routeAssistantInput({ text: input, session, localCommand: command });
    return {
      command: attachRouteToCommand(command, routeResult),
      assistantMessage: buildConversationalFallback(input, activeUser),
      executionResult: null,
      status: "detected",
      awaitingConfirmation: false,
    };
  }

  const financeSnapshot = await safeLoadFinanceSnapshot(activeUser);

  if (isBalanceQuestion(input)) {
    const command = buildCommand(AI_INTENTS.CHECK_BALANCE, { scope: "all" }, 0.98);
    const routeResult = routeAssistantInput({ text: input, session, localCommand: command });
    const routedCommand = attachRouteToCommand(command, routeResult);
    const result = await executeAICommand(routedCommand, { user: activeUser, financeSnapshot });
    return {
      command: { ...routedCommand, status: result.success ? "executed" : "error" },
      assistantMessage: result.message,
      executionResult: result,
      status: result.success ? "executed" : "error",
      awaitingConfirmation: false,
    };
  }

  if (isLastTransactionRequest(input)) {
    const command = buildCommand(AI_INTENTS.READ_WALLET_HISTORY, { localAction: "latest_transaction" }, 0.95);
    const routeResult = routeAssistantInput({ text: input, session, localCommand: command });
    return {
      command: attachRouteToCommand(command, routeResult),
      assistantMessage: buildLatestTransactionMessage(financeSnapshot),
      executionResult: null,
      status: "detected",
      awaitingConfirmation: false,
    };
  }

  const command = await understandInput({ text: input, session, financeSnapshot });

  if (shouldExecuteImmediately(command, input)) {
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
      : command.assistantMessage || command.userPrompt || buildConversationalFallback(input, activeUser);

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
