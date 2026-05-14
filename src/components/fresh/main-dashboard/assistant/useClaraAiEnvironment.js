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

  const activateOverlay = useCallback((source = "money-summary") => {
    setEnvironment((current) => ({
      ...current,
      active: true,
      source,
      lastUpdatedAt: Date.now(),
    }));

    focusInput();
  }, [focusInput]);

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

  const syncOverlayRequest = useCallback((event) => {
    const detail = event?.detail || {};

    activateOverlay(detail.source || "overlay-request");
  }, [activateOverlay]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    window.addEventListener(CLARA_MONEY_CHAT_EVENT, syncFromMoneyCard);
    window.addEventListener(CLARA_MONEY_CHAT_REQUEST_EVENT, syncOverlayRequest);

    return () => {
      window.removeEventListener(CLARA_MONEY_CHAT_EVENT, syncFromMoneyCard);
      window.removeEventListener(CLARA_MONEY_CHAT_REQUEST_EVENT, syncOverlayRequest);
    };
  }, [syncFromMoneyCard, syncOverlayRequest]);

  const requestFeaturePrompt = useCallback((prompt) => {
    const cleanPrompt = String(prompt || "").trim();
    if (!cleanPrompt || typeof window === "undefined") return;

    activateOverlay("clara-ai-environment");

    window.dispatchEvent(
      new CustomEvent(CLARA_MONEY_CHAT_REQUEST_EVENT, {
        detail: {
          prompt: cleanPrompt,
          source: "clara-ai-environment",
        },
      })
    );
  }, [activateOverlay]);

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
      activateOverlay,
    }),
    [activateOverlay, clearEnvironment, environment, focusInput, requestFeaturePrompt]
  );
}
