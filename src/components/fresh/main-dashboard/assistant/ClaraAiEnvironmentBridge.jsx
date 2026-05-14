import { useEffect } from "react";
import ClaraAiEnvironmentOverlay from "@/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlay";
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

  @media (prefers-reduced-motion: reduce) {
    .clara-ai-environment-active [data-clara-ai-background="true"],
    [data-clara-ai-background="true"],
    .clara-ai-environment-active [data-clara-ai-focus-anchor="money-summary"],
    [data-clara-ai-focus-anchor="money-summary"] {
      transition-duration: 0ms !important;
      transform: none !important;
      will-change: auto !important;
    }
  }
`;

export default function ClaraAiEnvironmentBridge() {
  const claraAiEnvironment = useClaraAiEnvironment();

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const root = document.documentElement;
    const body = document.body;
    const isActive = Boolean(claraAiEnvironment.isActive);

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
  }, [claraAiEnvironment.isActive]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const activateFromMoneyOrb = (event) => {
      const target = event.target;
      const orb = target?.closest?.('[data-clara-manual-expense-orb="true"]');

      if (!orb) return;

      event.preventDefault?.();
      event.stopPropagation?.();
      event.stopImmediatePropagation?.();
      event.nativeEvent?.stopImmediatePropagation?.();

      claraAiEnvironment.activateOverlay?.("money-left-orb");
    };

    document.addEventListener("pointerdown", activateFromMoneyOrb, true);
    document.addEventListener("click", activateFromMoneyOrb, true);
    document.addEventListener("touchstart", activateFromMoneyOrb, true);

    return () => {
      document.removeEventListener("pointerdown", activateFromMoneyOrb, true);
      document.removeEventListener("click", activateFromMoneyOrb, true);
      document.removeEventListener("touchstart", activateFromMoneyOrb, true);
    };
  }, [claraAiEnvironment]);

  return (
    <>
      <style>{CLARA_AI_ENVIRONMENT_STYLES}</style>

      <ClaraAiEnvironmentOverlay
        isActive={claraAiEnvironment.isActive}
        messages={claraAiEnvironment.messages}
        requestFeaturePrompt={claraAiEnvironment.requestFeaturePrompt}
      />
    </>
  );
}
