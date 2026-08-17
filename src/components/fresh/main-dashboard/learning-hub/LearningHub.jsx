import { Suspense, lazy, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, LoaderCircle } from "lucide-react";
import {
  openCommittedVersionModal,
  useCommittedFeatureAccess,
} from "@/components/fresh/main-dashboard/program-access/committedFeatureAccess";
import LearningHubToggleButton from "./ui/LearningHubToggleButton";

let learningHubModulePromise = null;

function loadLearningHubModule() {
  if (!learningHubModulePromise) {
    learningHubModulePromise = import("./LearningHubLoaded").catch((error) => {
      learningHubModulePromise = null;
      throw error;
    });
  }

  return learningHubModulePromise;
}

function preloadLearningHub() {
  return loadLearningHubModule().catch((error) => {
    console.warn("Learning Hub preload failed:", error?.message || error);
    return null;
  });
}

const LearningHubLoaded = lazy(loadLearningHubModule);

function CoachingCalendarButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-clara-coaching-calendar-button="true"
      className="clara-learning-motion relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-visible rounded-full border border-cyan-200/20 bg-[rgba(6,18,38,0.68)] text-cyan-50 shadow-[0_10px_26px_rgba(0,0,0,0.22),0_0_24px_rgba(34,211,238,0.10),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition hover:border-cyan-200/36 hover:bg-white/[0.09] active:scale-[0.96]"
      aria-label="Open CLARA Coaching Calendar"
      title="CLARA Coaching Calendar"
    >
      <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.22),transparent_48%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.24),transparent_52%)]" />
      <CalendarDays className="relative z-10 h-4 w-4 text-cyan-100/85" />
      <span className="absolute -right-2 -top-2 z-20 rounded-full border border-emerald-100/25 bg-emerald-300 px-1.5 py-0.5 text-[7px] font-black leading-none text-emerald-950 shadow-[0_8px_18px_rgba(52,211,153,0.28)]">
        30m
      </span>
    </button>
  );
}

function LearningHubOpeningPlaceholder() {
  return (
    <div
      data-clara-learning-hub-opening="true"
      role="status"
      aria-live="polite"
      className="mx-auto flex min-h-10 w-fit items-center justify-center gap-2 rounded-full border border-cyan-100/15 bg-[rgba(6,18,38,0.68)] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-50/72 shadow-[0_10px_26px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)]"
    >
      <LoaderCircle className="h-4 w-4 animate-spin text-cyan-100/80" />
      <span>Opening Learning Hub</span>
    </div>
  );
}

export default function LearningHub({ hubOpen = false, onOpenHub, onCloseHub }) {
  const navigate = useNavigate();
  const hasCommittedAccess = useCommittedFeatureAccess();
  const isLocked = !hasCommittedAccess;

  useEffect(() => {
    if (isLocked || hubOpen || typeof window === "undefined") {
      return undefined;
    }

    let cancelled = false;
    const warmLearningHub = () => {
      if (!cancelled) void preloadLearningHub();
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(warmLearningHub, { timeout: 1200 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback?.(idleId);
      };
    }

    const timeoutId = window.setTimeout(warmLearningHub, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [hubOpen, isLocked]);

  const handleOpenHub = () => {
    if (isLocked) {
      openCommittedVersionModal();
      return;
    }

    void preloadLearningHub();
    onOpenHub?.();
  };

  const handleCloseHub = () => {
    onCloseHub?.();
  };

  return (
    <section
      data-clara-learning-hub-section="true"
      className="clara-budget-focus-shift clara-budget-focus-hub w-full"
    >
      <div className="relative flex w-full flex-col gap-[var(--clara-hub-rail-gap,14px)] overflow-visible px-1 py-0">
        {!hubOpen ? (
          <div
            data-clara-learning-hub-bridge="true"
            className="relative grid w-full items-center"
            style={{ gridTemplateColumns: "1fr auto 1fr" }}
          >
            <div className="mr-1.5 justify-self-end">
              <CoachingCalendarButton onClick={() => navigate("/welcome-session")} />
            </div>

            <LearningHubToggleButton
              isExpanded={false}
              isLocked={isLocked}
              isInsideCategory={false}
              headerLabel="Learning Hub"
              onClick={handleOpenHub}
              flushSpacing
            />

            <span aria-hidden="true" />
          </div>
        ) : (
          <Suspense fallback={<LearningHubOpeningPlaceholder />}>
            <LearningHubLoaded
              initialExpanded
              flushSpacing={true}
              onCollapse={handleCloseHub}
            />
          </Suspense>
        )}
      </div>
    </section>
  );
}