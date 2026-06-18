import { Suspense, lazy, useState } from "react";
import { ScrollText } from "lucide-react";
import DailyTipCard from "../daily-tip";
import {
  openCommittedVersionModal,
  useCommittedFeatureAccess,
} from "@/components/fresh/main-dashboard/program-access/committedFeatureAccess";
import LearningHubToggleButton from "./ui/LearningHubToggleButton";

const LearningHubLoaded = lazy(() => import("./LearningHubLoaded"));

function ClaraGuideButton({ hasNewGuide = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="clara-learning-motion relative inline-flex h-9 shrink-0 items-center justify-center gap-1.5 overflow-visible rounded-full border border-cyan-200/15 bg-[rgba(6,18,38,0.62)] px-3 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-50/72 shadow-[0_10px_26px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-xl transition hover:border-cyan-200/28 hover:bg-white/[0.08] active:scale-[0.98]"
      aria-label="Open CLARA Guide Mode"
    >
      <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.16),transparent_46%),radial-gradient(circle_at_bottom_right,rgba(129,140,248,0.14),transparent_50%)]" />
      <ScrollText className="relative z-10 h-3.5 w-3.5 text-cyan-100/70" />
      <span className="relative z-10 hidden sm:inline">Guide</span>
      {hasNewGuide ? (
        <span className="absolute -right-1.5 -top-2 z-20 rounded-full border border-cyan-100/25 bg-cyan-300 px-1.5 py-0.5 text-[7px] font-black leading-none tracking-[0.12em] text-slate-950 shadow-[0_8px_18px_rgba(34,211,238,0.28)]">
          NEW
        </span>
      ) : null}
    </button>
  );
}

function DailyTipGuideBubble() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-full z-[80] mt-3 w-[min(92vw,372px)] -translate-x-1/2">
      <div className="relative rounded-[30px] border border-cyan-100/28 bg-[rgba(3,12,29,0.94)] px-6 py-5 text-white shadow-[0_28px_82px_rgba(0,0,0,0.58),0_0_48px_rgba(34,211,238,0.16)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute -top-2 left-11 h-4 w-4 rotate-45 border-l border-t border-cyan-100/28 bg-[rgba(3,12,29,0.94)]" />
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/68">
          Daily Money Tip
        </p>
        <p className="mt-3 text-[13px] font-semibold leading-relaxed text-cyan-50/88">
          CLARA gives you one quick money reminder before you spend. Select the Daily Money Tip card to continue.
        </p>
      </div>
    </div>
  );
}

export default function LearningHub({
  isGuideMode = false,
  guideStep = 0,
  isDailyTipGuideActive = false,
  hasNewGuide = false,
  onOpenGuideIntro,
  onGuideDailyTipTap,
}) {
  const [shouldLoadHub, setShouldLoadHub] = useState(false);
  const realHasCommittedAccess = useCommittedFeatureAccess();
  const hasCommittedAccess = isGuideMode ? true : realHasCommittedAccess;
  const isLocked = !hasCommittedAccess;

  const handleOpenHub = () => {
    if (isGuideMode) return;

    if (isLocked) {
      openCommittedVersionModal();
      return;
    }

    setShouldLoadHub(true);
  };

  return (
    <section className="clara-budget-focus-shift clara-budget-focus-hub w-full">
      <div className="relative flex w-full flex-col gap-[var(--clara-hub-rail-gap,14px)] overflow-visible px-1 py-0">
        <div className={`${isDailyTipGuideActive ? "relative z-[65]" : "relative"} overflow-visible`}>
          <DailyTipCard
            hasCommittedAccess={hasCommittedAccess}
            onOpenCommitmentBooklet={openCommittedVersionModal}
            flushSpacing
            isGuideMode={isGuideMode}
            guideStep={guideStep}
            onGuideDailyTipTap={onGuideDailyTipTap}
          />

          {isDailyTipGuideActive ? <DailyTipGuideBubble /> : null}
        </div>

        {!shouldLoadHub ? (
          <div
            data-clara-learning-hub-bridge="true"
            className="relative grid w-full items-center"
            style={{ gridTemplateColumns: "1fr auto 1fr" }}
          >
            <span aria-hidden="true" />
            <LearningHubToggleButton
              isExpanded={false}
              isLocked={isLocked}
              isInsideCategory={false}
              headerLabel="Learning Hub"
              onClick={handleOpenHub}
              flushSpacing
            />

            {!isGuideMode ? (
              <div className="clara-guide-float ml-1.5 justify-self-start">
                <ClaraGuideButton hasNewGuide={hasNewGuide} onClick={onOpenGuideIntro} />
              </div>
            ) : (
              <span aria-hidden="true" />
            )}
          </div>
        ) : (
          <Suspense fallback={null}>
            <LearningHubLoaded initialExpanded flushSpacing={true} />
          </Suspense>
        )}
      </div>
    </section>
  );
}
