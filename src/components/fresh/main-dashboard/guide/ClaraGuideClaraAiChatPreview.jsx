import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import ClaraAiEnvironmentOverlay from "@/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlay";

const LIVE_AI_SELECTOR = "[data-clara-ai-brain-version]";
const LIVE_AI_CLOSE_SELECTOR = 'button[aria-label="Close CLARA AI mode"]';
const GUIDE_ACTION_ARM_DELAY = 680;
const GUIDE_MESSAGE_PANEL_GAP = 20;
const GUIDE_CHAT_MESSAGES = [
  {
    id: "guide-clara-welcome",
    role: "clara",
    text: "What are you thinking of buying?",
  },
  {
    id: "guide-user-sample",
    role: "user",
    text: "Shoes ₱1,200",
  },
  {
    id: "guide-clara-sample-reply",
    role: "clara",
    text: "Before you buy it, let’s check your money left, budget, and what this purchase could affect.",
  },
];

export default function ClaraGuideClaraAiChatPreview({ onNext }) {
  const shellRef = useRef(null);
  const guidePanelRef = useRef(null);
  const [actionsArmed, setActionsArmed] = useState(false);

  useLayoutEffect(() => {
    const guideOverlay = shellRef.current?.querySelector?.(LIVE_AI_SELECTOR);
    if (!guideOverlay) return undefined;

    guideOverlay.setAttribute("inert", "");
    guideOverlay.setAttribute("aria-disabled", "true");

    return () => {
      guideOverlay.removeAttribute("inert");
      guideOverlay.removeAttribute("aria-disabled");
    };
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return undefined;

    const shell = shellRef.current;
    const guidePanel = guidePanelRef.current;
    const messageStack = shell?.querySelector?.('[data-clara-ai-message-stack="true"]');

    if (!shell || !guidePanel || !messageStack) return undefined;

    const updateMessageOffset = () => {
      const panelRect = guidePanel.getBoundingClientRect();
      const stackRect = messageStack.getBoundingClientRect();
      const topOffset = Math.max(
        0,
        Math.ceil(panelRect.bottom - stackRect.top + GUIDE_MESSAGE_PANEL_GAP)
      );

      shell.style.setProperty("--clara-guide-message-top-offset", `${topOffset}px`);
    };

    updateMessageOffset();
    const animationFrame = window.requestAnimationFrame(updateMessageOffset);
    const resizeObserver =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(updateMessageOffset)
        : null;

    resizeObserver?.observe(guidePanel);
    window.addEventListener("resize", updateMessageOffset);
    window.visualViewport?.addEventListener?.("resize", updateMessageOffset);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateMessageOffset);
      window.visualViewport?.removeEventListener?.("resize", updateMessageOffset);
      shell.style.removeProperty("--clara-guide-message-top-offset");
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const closeExternalLiveAi = () => {
      const shell = shellRef.current;
      document.querySelectorAll(LIVE_AI_SELECTOR).forEach((overlay) => {
        if (shell?.contains(overlay)) return;
        const closeButton = overlay.querySelector(LIVE_AI_CLOSE_SELECTOR);
        closeButton?.click?.();
      });
    };

    closeExternalLiveAi();
    const cleanupTimer = window.setInterval(closeExternalLiveAi, 80);
    const armTimer = window.setTimeout(() => {
      closeExternalLiveAi();
      setActionsArmed(true);
    }, GUIDE_ACTION_ARM_DELAY);

    return () => {
      window.clearInterval(cleanupTimer);
      window.clearTimeout(armTimer);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  const handleNext = useCallback(
    (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      event?.nativeEvent?.stopImmediatePropagation?.();
      if (!actionsArmed) return;
      onNext?.();
    },
    [actionsArmed, onNext]
  );

  const preview = (
    <div
      ref={shellRef}
      className="fixed inset-0 z-[380] isolate overflow-hidden bg-slate-950 text-white"
      data-clara-guide-ai-preview-shell="true"
      data-clara-guide-orb-preview="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clara-guide-ai-preview-title"
    >
      <style>{`
        [data-clara-guide-ai-preview-shell="true"]
        [data-clara-ai-layout-variant="guide-preview"]
        [data-clara-ai-message-stack="true"] {
          padding-top: var(
            --clara-guide-message-top-offset,
            calc(env(safe-area-inset-top) + 246px)
          ) !important;
          padding-bottom: 128px !important;
        }

        [data-clara-guide-ai-preview-shell="true"] [data-clara-ai-brain-version] {
          z-index: 10 !important;
          pointer-events: none !important;
        }

        [data-clara-guide-ai-preview-shell="true"] [data-clara-ai-brain-version]
        button[aria-label="Close CLARA AI mode"] {
          display: none !important;
        }

        [data-clara-guide-ai-preview-shell="true"] [data-clara-ai-brain-version]
        :is(button, input, form) {
          pointer-events: none !important;
        }
      `}</style>

      <ClaraAiEnvironmentOverlay
        isActive
        messages={GUIDE_CHAT_MESSAGES}
        onClose={() => {}}
        layoutVariant="guide-preview"
      />

      <section
        ref={guidePanelRef}
        className="pointer-events-auto absolute inset-x-4 top-[calc(env(safe-area-inset-top)+14px)] z-30 rounded-[28px] border border-cyan-100/22 bg-[linear-gradient(145deg,rgba(5,18,36,0.985),rgba(10,22,54,0.985)_52%,rgba(27,18,65,0.985))] px-5 py-4 shadow-[0_22px_70px_rgba(0,0,0,0.68),0_0_38px_rgba(34,211,238,0.15)] backdrop-blur-2xl"
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_12%_0%,rgba(45,212,191,0.17),transparent_38%),radial-gradient(circle_at_92%_14%,rgba(124,58,237,0.22),transparent_40%)]" />

        <div className="relative pr-10">
          <p
            id="clara-guide-ai-preview-title"
            className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100"
          >
            HOLD — PAUSE BEFORE BUYING
          </p>
          <p className="mt-2 text-[14px] font-bold leading-6 text-white">
            Holding the orb opens CLARA’s Pause Before Buying decision space.
          </p>
          <p className="mt-2 text-[12.5px] font-semibold leading-5 text-cyan-50/68">
            Use it before an unplanned purchase so CLARA can help you check the price against your money left, budget, and current priorities before you decide.
          </p>
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={!actionsArmed}
          aria-label="Close Pause Before Buying demonstration and continue"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/70 bg-white/[0.06] text-white transition disabled:pointer-events-none disabled:opacity-45 active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative mt-3 flex items-center justify-between gap-3 border-t border-cyan-100/14 pt-3">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.13em] text-cyan-100/68">
              Guide mode
            </p>
            <p className="mt-0.5 truncate text-[10px] font-semibold text-white/42">
              Static preview — no purchase or message is recorded
            </p>
          </div>

          <button
            type="button"
            data-clara-guide-orb-preview-next="true"
            onClick={handleNext}
            disabled={!actionsArmed}
            className="inline-flex min-h-[42px] min-w-[104px] shrink-0 items-center justify-center rounded-full border border-cyan-100/30 bg-[linear-gradient(135deg,rgba(207,250,254,0.18),rgba(103,232,249,0.10)_48%,rgba(129,140,248,0.13))] px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-50 transition disabled:pointer-events-none disabled:opacity-45 active:scale-[0.985]"
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );

  if (typeof document === "undefined") return preview;
  return createPortal(preview, document.body);
}
