import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const CLARA_MONEY_CHAT_EVENT = "clara:money-card-chat";
export const CLARA_MONEY_CHAT_REQUEST_EVENT = "clara:money-card-chat-request";

const EMPTY_MESSAGES = [];

const createInitialState = () => ({
  active: false,
  messages: EMPTY_MESSAGES,
  source: "dashboard-shell",
  lastUpdatedAt: null,
});

export default function useClaraAiEnvironment() {
  const inputRef = useRef(null);
  const [environment, setEnvironment] = useState(createInitialState);

  const focusInput = useCallback((delay = 120) => {
    if (typeof window === "undefined") return;

    window.setTimeout(() => {
      inputRef.current?.focus?.();
    }, delay);
  }, []);

  const syncFromMoneyCard = useCallback((event) => {
    const detail = event?.detail || {};
    const nextMessages = Array.isArray(detail.messages)
      ? detail.messages
      : EMPTY_MESSAGES;

    setEnvironment((current) => ({
      ...current,
      active: Boolean(detail.active),
      messages: nextMessages,
      source: detail.source || "money-summary",
      lastUpdatedAt: Date.now(),
    }));

    if (detail.active) {
      focusInput();
    }
  }, [focusInput]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    window.addEventListener(CLARA_MONEY_CHAT_EVENT, syncFromMoneyCard);

    return () => {
      window.removeEventListener(CLARA_MONEY_CHAT_EVENT, syncFromMoneyCard);
    };
  }, [syncFromMoneyCard]);

  const requestFeaturePrompt = useCallback((prompt) => {
    const cleanPrompt = String(prompt || "").trim();
    if (!cleanPrompt || typeof window === "undefined") return;

    window.dispatchEvent(
      new CustomEvent(CLARA_MONEY_CHAT_REQUEST_EVENT, {
        detail: {
          prompt: cleanPrompt,
          source: "clara-ai-environment",
        },
      })
    );
  }, []);

  const clearEnvironment = useCallback(() => {
    setEnvironment(createInitialState());
  }, []);

  return useMemo(
    () => ({
      ...environment,
      isActive: environment.active,
      inputRef,
      focusInput,
      requestFeaturePrompt,
      clearEnvironment,
    }),
    [clearEnvironment, environment, focusInput, requestFeaturePrompt]
  );
}
