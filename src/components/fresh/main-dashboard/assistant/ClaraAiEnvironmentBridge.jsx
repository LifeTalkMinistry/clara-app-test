import { useEffect, useState } from "react";
import ClaraAiEnvironmentOverlay from "@/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlay";
import {
  CLARA_MONEY_CHAT_EVENT,
  CLARA_MONEY_CHAT_REQUEST_EVENT,
} from "@/components/fresh/main-dashboard/assistant/useClaraAiEnvironment";
import useClaraAiEnvironment from "@/components/fresh/main-dashboard/assistant/useClaraAiEnvironment";

const CLARA_AI_ENVIRONMENT_STYLES = `
  .clara-ai-environment-active [data-clara-ai-background="true"] {
    opacity: 0.28;
    filter: blur(3.5px) saturate(0.82);
    transform: translate3d(0, -8px, 0) scale(0.985);
    pointer-events: none;
    transition:
      opacity 360ms cubic-bezier(0.22, 1, 0.36, 1),
      filter 360ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 360ms cubic-bezier(0.22, 1, 0.36, 1);
    will-change: opacity, filter, transform;
  }

  [data-clara-ai-background="true"] {
    transition:
      opacity 360ms cubic-bezier(0.22, 1, 0.36, 1),
      filter 360ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 360ms cubic-bezier(0.22, 1, 0.36, 1);
  }
`;

function isMoneyLeftOrbTarget(target) {
  return Boolean(
    target?.closest?.(
      '[data-clara-manual-expense-orb="true"], [aria-label*="Tap to log expense"], [aria-label*="ask CLARA"]'
    )
  );
}

export default function ClaraAiEnvironmentBridge() {
  const claraAiEnvironment = useClaraAiEnvironment();
  const [orbActive, setOrbActive] = useState(false);
  const isActive = Boolean(claraAiEnvironment.isActive || orbActive);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const root = document.documentElement;
    const body = document.body;

    root.classList.toggle("clara-ai-environment-active", isActive);
    root.dataset.claraAiMode = isActive ? "active" : "idle";

    if (body) {
      body.classList.toggle("clara-ai-environment-active", isActive);
      body.dataset.claraAiMode = isActive ? "active" : "idle";
    }

    return () => {
      root.classList.remove("clara-ai-environment-active");
      delete root.dataset.claraAiMode;

      if (body) {
        body.classList.remove("clara-ai-environment-active");
        delete body.dataset.claraAiMode;
      }
    };
  }, [isActive]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const activateFromOrb = (event) => {
      if (!isMoneyLeftOrbTarget(event.target)) return;

      event.preventDefault?.();
      event.stopPropagation?.();
      event.stopImmediatePropagation?.();

      setOrbActive(true);
      claraAiEnvironment.activateOverlay?.("money-left-orb");
    };

    document.addEventListener("pointerdown", activateFromOrb, true);
    document.addEventListener("touchstart", activateFromOrb, true);
    document.addEventListener("click", activateFromOrb, true);

    return () => {
      document.removeEventListener("pointerdown", activateFromOrb, true);
      document.removeEventListener("touchstart", activateFromOrb, true);
      document.removeEventListener("click", activateFromOrb, true);
    };
  }, [claraAiEnvironment]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncLegacyClaraMode = (event) => {
      if (event?.detail?.active) {
        setOrbActive(true);
      }
    };

    const syncPromptRequest = () => {
      setOrbActive(true);
    };

    window.addEventListener(CLARA_MONEY_CHAT_EVENT, syncLegacyClaraMode);
    window.addEventListener(CLARA_MONEY_CHAT_REQUEST_EVENT, syncPromptRequest);

    return () => {
      window.removeEventListener(CLARA_MONEY_CHAT_EVENT, syncLegacyClaraMode);
      window.removeEventListener(CLARA_MONEY_CHAT_REQUEST_EVENT, syncPromptRequest);
    };
  }, []);

  const closeOverlay = () => {
    setOrbActive(false);
    claraAiEnvironment.clearEnvironment?.();
  };

  return (
    <>
      <style>{CLARA_AI_ENVIRONMENT_STYLES}</style>
      <ClaraAiEnvironmentOverlay
        isActive={isActive}
        messages={claraAiEnvironment.messages}
        requestFeaturePrompt={claraAiEnvironment.requestFeaturePrompt}
        onClose={closeOverlay}
      />
    </>
  );
}
