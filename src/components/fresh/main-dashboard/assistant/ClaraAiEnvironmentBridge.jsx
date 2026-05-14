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

  .clara-ai-environment-active [data-clara-ai-focus-anchor="money-summary"] {
    position: relative;
    z-index: 70;
    transform: translate3d(0, -4px, 0);
    transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  [data-clara-ai-focus-anchor="money-summary"] {
    transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1);
  }
`;

function hasInlineClaraInput() {
  if (typeof document === "undefined") return false;

  return Boolean(
    document.querySelector('input[placeholder*="Item + price"], input[placeholder*="shoes ₱1,200"]')
  );
}

export default function ClaraAiEnvironmentBridge() {
  const claraAiEnvironment = useClaraAiEnvironment();
  const [forceActive, setForceActive] = useState(false);

  const isActive = Boolean(claraAiEnvironment.isActive || forceActive);

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
    if (typeof window === "undefined") return undefined;

    const activateOverlay = () => {
      setForceActive(true);
      claraAiEnvironment.activateOverlay?.("forced-overlay");
    };

    window.addEventListener(CLARA_MONEY_CHAT_EVENT, activateOverlay);
    window.addEventListener(CLARA_MONEY_CHAT_REQUEST_EVENT, activateOverlay);

    return () => {
      window.removeEventListener(CLARA_MONEY_CHAT_EVENT, activateOverlay);
      window.removeEventListener(CLARA_MONEY_CHAT_REQUEST_EVENT, activateOverlay);
    };
  }, [claraAiEnvironment]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const observer = new MutationObserver(() => {
      if (!hasInlineClaraInput()) return;

      setForceActive(true);
      claraAiEnvironment.activateOverlay?.("inline-detected");
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [claraAiEnvironment]);

  return (
    <>
      <style>{CLARA_AI_ENVIRONMENT_STYLES}</style>

      <ClaraAiEnvironmentOverlay
        isActive={isActive}
        messages={claraAiEnvironment.messages}
        requestFeaturePrompt={claraAiEnvironment.requestFeaturePrompt}
      />
    </>
  );
}
