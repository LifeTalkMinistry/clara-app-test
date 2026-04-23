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

async function understandInput({ text, session, financeSnapshot }) {
  const previous = session?.currentCommand;
  const geminiStatus = getGeminiStatus();

  if (geminiStatus.configured) {
    try {
      return await askGeminiForUnderstanding({ text, session, financeSnapshot });
    } catch (error) {
      console.warn("CLARA Gemini understanding failed:", error);
      return parseCommand(text, previous);
    }
  }

  return parseCommand(text, previous);
}

function shouldExecuteImmediately(command) {
  return command?.canExecute && !WRITE_INTENTS.has(command.intent);
}

function cancelledTurn() {
  return {
    command: null,
    assistantMessage: "Alright, I will not make any changes.",
    executionResult: null,
    status: "cancelled",
    awaitingConfirmation: false,
    cancellationState: "cancelled",
  };
}

function buildConversationalFallback(input) {
  const text = String(input || "").trim().toLowerCase();
  if (/^(hi|hello|hey|good morning|good evening)/.test(text)) {
    return "Hi. I’m here with you. Ask me about your spending, wallets, budgets, savings goals, or any money decision you want to think through.";
  }
  if (/can i ask|may i ask|can you help me/.test(text)) {
    return "Yes, absolutely. Ask me the full question and I’ll help you reason through it using your real financial data when it applies.";
  }
  return "I’m here with you. Tell me the full money question or action you want help with, and I’ll reason it through step by step.";
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

  const lastUserTurn = [...(session?.history || [])]
    .reverse()
    .find((message) => message.role === "user")?.content;
  if (
    session?.status === "executed" &&
    lastUserTurn &&
    String(lastUserTurn).trim().toLowerCase() === input.toLowerCase()
  ) {
    return {
      command: session?.currentCommand || null,
      assistantMessage:
        "That looks like the same command you just sent. If you want me to do it again, say repeat it.",
      executionResult: null,
      status: "awaiting_repeat_confirmation",
      awaitingConfirmation: false,
    };
  }

  const activeUser = await resolveAuthenticatedUser(user);
  const previous = session?.currentCommand;
  if (
    session?.status === "awaiting_repeat_confirmation" &&
    previous?.canExecute &&
    /^(repeat( it)?|do it again|yes)$/i.test(input)
  ) {
    const result = await executeAICommand(previous, { user: activeUser });
    return {
      command: { ...previous, status: result.success ? "executed" : "error" },
      assistantMessage: result.message,
      executionResult: result,
      status: result.success ? "executed" : "error",
      awaitingConfirmation: false,
    };
  }

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

  const financeSnapshot = await loadFinanceSnapshot(activeUser);
  const command = await understandInput({ text: input, session, financeSnapshot });

  if (shouldExecuteImmediately(command)) {
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
      : command.userPrompt ||
        ([AI_INTENTS.UNKNOWN, AI_INTENTS.GENERAL_GUIDANCE].includes(command.intent)
          ? buildConversationalFallback(input)
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
