import { executeAICommand } from "@/lib/ai-command/command-executor";
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
  if (previous?.status === "collecting_missing_fields" || previous?.status === "awaiting_confirmation") {
    return parseCommand(text, previous);
  }

  try {
    return await askGeminiForUnderstanding({ text, session, financeSnapshot });
  } catch (error) {
    if (error?.code !== "GEMINI_NOT_CONFIGURED") {
      console.warn("CLARA Gemini understanding fell back to local parser:", error);
    }
    return parseCommand(text, previous);
  }
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

  const previous = session?.currentCommand;
  if (previous?.status === "awaiting_confirmation" && isYesText(input)) {
    const command = { ...previous, status: "ready_to_execute", canExecute: true };
    const result = await executeAICommand(command, { user });
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

  const financeSnapshot = await loadFinanceSnapshot(user);
  const command = await understandInput({ text: input, session, financeSnapshot });

  if (shouldExecuteImmediately(command)) {
    const result = await executeAICommand(command, { user, financeSnapshot });
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
        (command.intent === AI_INTENTS.UNKNOWN
          ? "I am not fully sure yet. Tell me if this is about money, planning, a decision, or a goal."
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
