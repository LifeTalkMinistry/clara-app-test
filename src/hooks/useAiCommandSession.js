import { useCallback, useMemo, useState } from "react";
import { processAssistantTurn } from "@/lib/ai-command/ai-engine";

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
          ? "I am listening. Tell me what you want to log, move, check, plan, or decide."
          : "Type what you want CLARA to help with.",
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

  const reset = useCallback(
    (nextMode = mode) => {
      setSession(initialSession(nextMode));
    },
    [mode]
  );

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
      const activeSession = {
        ...session,
        rawUserInput: text,
        history: [...session.history, { role: "user", content: text }],
      };

      setSession(activeSession);

      try {
        const turn = await processAssistantTurn({ text, session: activeSession, user });
        setSession((current) => ({
          ...current,
          currentCommand: turn.command,
          missingFields: turn.command?.missingFields || [],
          currentQuestion: turn.command?.userPrompt || "",
          awaitingConfirmation: turn.awaitingConfirmation,
          correctionState:
            session.currentCommand?.status === "awaiting_confirmation" && turn.command?.status === "awaiting_confirmation"
              ? "corrected"
              : null,
          executionResult: turn.executionResult,
          cancellationState: turn.cancellationState || null,
          status: turn.status,
          history: turn.assistantMessage
            ? [...current.history, { role: "assistant", content: turn.assistantMessage }]
            : current.history,
        }));
      } catch (error) {
        console.error("CLARA assistant turn failed:", error);
        setSession((current) => ({
          ...current,
          status: "error",
          history: [
            ...current.history,
            {
              role: "assistant",
              content: "I hit a connection issue, but the session is still here. Try again or type the command.",
            },
          ],
        }));
      } finally {
        setProcessing(false);
      }
    },
    [processing, session, user]
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
