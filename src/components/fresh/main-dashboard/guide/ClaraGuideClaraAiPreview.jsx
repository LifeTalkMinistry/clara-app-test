import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import ClaraAiEnvironmentOverlay from "@/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlay";

const GUIDE_ACTION_ARM_DELAY = 680;
const LIVE_AI_SELECTOR = '[data-clara-ai-brain-version]';
const LIVE_AI_CLOSE_SELECTOR = 'button[aria-label="Close CLARA AI mode"]';

export default function ClaraGuideClaraAiPreview({ onNext }) {
  const shellRef = useRef(null);
  const [actionsArmed, setActionsArmed] = useState(false);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    const guideOverlay = shell?.querySelector?.(LIVE_AI_SELECTOR);

    if (!guideOverlay) return undefined;

    guideOverlay.setAttribute("inert", "");
    guideOverlay.setAttribute("aria-disabled", "true");

    const activeElement = document.activeElement;
    if (activeElement && guideOverlay.contains(activeElement)) {
      activeElement.blur?.();
    }

    return () => {
      guideOverlay.removeAttribute("inert");
      guideOverlay.removeAttribute("aria-disabled");
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";

    const closeExternalLiveAi = () => {
      const shell = shellRef.current;

      document.querySelectorAll(LIVE_AI_SELECTOR).forEach((overlay) => {
        if (shell?.contains(overlay)) return;

        const closeButton = overlay.querySelector(LIVE_AI_CLOSE_SELECTOR);
        if (closeButton instanceof HTMLButtonElement) {
          closeButton.click();
        }
      });
    };

    closeExternalLiveAi();

    const observer = new MutationObserver(closeExternalLiveAi);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const cleanupTimer = window.setInterval(closeExternalLiveAi, 80);
    const armTimer = window.setTimeout(() => {
      closeExternalLiveAi();
      setActionsArmed(true);
    }, GUIDE_ACTION_ARM_DELAY);

    return () => {
      observer.disconnect();
      window.clearInterval(cleanupTimer);
      window.clearTimeout(armTimer);
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
    };
  }, []);

  const blockOpeningGesture = useCallback(
    (event) => {
      if (actionsArmed) return;

      event.preventDefault?.();
      event.stopPropagation?.();
      event.nativeEvent?.stopImmediatePropagation?.();
    },
    [actionsArmed]
  );

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
      onClickCapture={blockOpeningGesture}
      onDoubleClickCapture={blockOpeningGesture}
      onPointerUpCapture={blockOpeningGesture}
      onContextMenuCapture={blockOpeningGesture}
    >
      <style>{`
        [data-clara-guide-ai-preview-shell="true"]
        [data-clara-ai-brain-version] {
          z-index: 10 !important;
          pointer-events: none !important;
        }

        [data-clara-guide-ai-preview-shell="true"]
        [data-clara-ai-brain-version]
        button[aria-label="Close CLARA AI mode"] {
          display: none !important;
        }

        [data-clara-guide-ai-preview-shell="true"]
        [data-clara-ai-brain-version]
        :is(button, input, form) {
          pointer-events: none !important;
        }
      `}</style>

      <ClaraAiEnvironmentOverlay
        isActive
        messages={[]}
        onClose={() => {}}
      />

      <section className="pointer-events-auto absolute inset-x-4 top-[calc(env(safe-area-inset-top)+14px)] z-30 rounded-[28px] border border-cyan-100/22 bg-[linear-gradient(145deg,rgba(5,18,36,0.985),rgba(10,22,54,0.985)_52%,rgba(27,18,65,0.985))] px-5 py-4 shadow-[0_22px_70px_rgba(0,0,0,0.68),0_0_38px_rgba(34,211,238,0.15)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_12%_0%,rgba(45,212,191,0.17),transparent_38%),radial-gradient(circle_at_92%_14%,rgba(124,58,237,0.22),transparent_40%)]" />

        <div className="relative pr-10">
          <p
            id="clara-guide-ai-preview-title"
            className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100"
          >
            HOLD — CHAT WITH CLARA
          </p>
          <p className="mt-2 text-[14px] font-bold leading-6 text-white">
            Holding the orb opens CLARA’s money decision space.
          </p>
          <p className="mt-2 text-[12.5px] font-semibold leading-5 text-cyan-50/68">
            Use Buy Check before a purchase, Forecast to see what may happen next, or Analytic to understand your current money pattern.
          </p>
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={!actionsArmed}
          aria-disabled={!actionsArmed}
          aria-label="Close CLARA demonstration and continue"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/70 bg-white/[0.06] text-white shadow-[0_12px_30px_rgba(0,0,0,0.24)] transition disabled:pointer-events-none disabled:opacity-45 hover:bg-white/[0.12] active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative mt-3 flex items-center justify-between gap-3 border-t border-cyan-100/14 pt-3">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.13em] text-cyan-100/68">
              Guide mode
            </p>
            <p className="mt-0.5 truncate text-[10px] font-semibold text-white/42">
              No message will be sent
            </p>
          </div>

          <button
            type="button"
            data-clara-guide-orb-preview-next="true"
            onClick={handleNext}
            disabled={!actionsArmed}
            aria-disabled={!actionsArmed}
            className="inline-flex min-h-[42px] min-w-[104px] shrink-0 items-center justify-center rounded-full border border-cyan-100/30 bg-[linear-gradient(135deg,rgba(207,250,254,0.18),rgba(103,232,249,0.10)_48%,rgba(129,140,248,0.13))] px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-50 shadow-[0_10px_28px_rgba(2,8,23,0.34),0_0_18px_rgba(34,211,238,0.10),inset_0_1px_0_rgba(255,255,255,0.14)] transition disabled:pointer-events-none disabled:opacity-45 hover:border-cyan-100/45 hover:bg-cyan-100/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-[0.985]"
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
