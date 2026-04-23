import { useCallback, useMemo, useState } from "react";
import { executeAICommand } from "@/lib/ai-command/command-executor";
import { buildCommand, isCancelText, isYesText, parseCommand } from "@/lib/ai-command/command-parser";

const initialSession = (mode = "speak") => ({
  activeMode: mode,
  inputMode: mode,
  rawUserInput: "",
  currentCommand: null,
  missingFields: [],
  currentQuestion: "",
  history: [
    {
      role: "assistant",
      content:
        mode === "speak"
          ? "I’m listening. Tell me what to log, add, budget, or save for."
          : "Type what you want CLARA to do.",
    },
  ],
  awaitingConfirmation: false,
  correctionState: null,
  executionResult: null,
  cancellationState: null,
  status: "idle",
});

export default function useAiCommandSession({ user, mode = "speak" } = {}) {
  const [session, setSession] = useState(() => initialSession(mode));
  const [processing, setProcessing] = useState(false);

  const reset = useCallback((nextMode = mode) => {
    setSession(initialSession(nextMode));
  }, [mode]);

  const append = useCallback((messages) => {
    const items = Array.isArray(messages) ? messages : [messages];
    setSession((current) => ({
      ...current,
      history: [...current.history, ...items],
    }));
  }, []);

  const submitText = useCallback(
    async (input) => {
      const text = String(input || "").trim();
      if (!text || processing) return;

      setProcessing(true);
      setSession((current) => ({
        ...current,
        rawUserInput: text,
        history: [...current.history, { role: "user", content: text }],
      }));

      try {
        let nextCommand;
        let assistantMessage = "";
        let shouldExecute = false;

        if (isCancelText(text)) {
          nextCommand = buildCommand("UNKNOWN", {}, 0);
          nextCommand.status = "cancelled";
          assistantMessage = "Alright, I won’t make any changes.";
          setSession((current) => ({
            ...current,
            currentCommand: null,
            missingFields: [],
            currentQuestion: "",
            awaitingConfirmation: false,
            cancellationState: "cancelled",
            status: "cancelled",
            history: [...current.history, { role: "assistant", content: assistantMessage }],
          }));
          return;
        }

        const previous = session.currentCommand;
        if (previous?.status === "awaiting_confirmation" && isYesText(text)) {
          nextCommand = { ...previous, status: "ready_to_execute", canExecute: true };
          shouldExecute = true;
        } else {
          nextCommand = parseCommand(text, previous);
          assistantMessage =
            nextCommand.status === "awaiting_confirmation"
              ? nextCommand.confirmationText
              : nextCommand.userPrompt;
        }

        if (shouldExecute) {
          const result = await executeAICommand(nextCommand, { user });
          setSession((current) => ({
            ...current,
            currentCommand: { ...nextCommand, status: result.success ? "executed" : "error" },
            missingFields: [],
            currentQuestion: "",
            awaitingConfirmation: false,
            executionResult: result,
            status: result.success ? "executed" : "error",
            history: [...current.history, { role: "assistant", content: result.message }],
          }));
          return;
        }

        setSession((current) => ({
          ...current,
          currentCommand: nextCommand,
          missingFields: nextCommand.missingFields,
          currentQuestion: nextCommand.userPrompt,
          awaitingConfirmation: nextCommand.status === "awaiting_confirmation",
          correctionState:
            previous?.status === "awaiting_confirmation" && nextCommand.status === "awaiting_confirmation"
              ? "corrected"
              : null,
          status: nextCommand.status,
          history: assistantMessage
            ? [...current.history, { role: "assistant", content: assistantMessage }]
            : current.history,
        }));
      } finally {
        setProcessing(false);
      }
    },
    [processing, session.currentCommand, user]
  );

  const confirm = useCallback(() => submitText("yes"), [submitText]);
  const cancel = useCallback(() => submitText("cancel"), [submitText]);

  return useMemo(
    () => ({
      session,
      processing,
      reset,
      append,
      submitText,
      confirm,
      cancel,
    }),
    [append, cancel, confirm, processing, reset, session, submitText]
  );
}

