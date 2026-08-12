import { Suspense, lazy, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, PlayCircle, Sparkles, X } from "lucide-react";
import useLearningHub from "./logic/useLearningHub";
import LearningHubCarousel from "./ui/LearningHubCarousel";
import { LearningHubCollapseProvider } from "./ui/LearningHubToggleButton";
import {
  openCommittedVersionModal,
  useCommittedFeatureAccess,
} from "@/components/fresh/main-dashboard/program-access/committedFeatureAccess";

const loadLearningMaterialModal = () => import("./modal/LearningMaterialModal");
const loadLearningVideoWatchModal = () => import("./modal/LearningVideoWatchModal");
const loadFourPicsOneMoneyWordModal = () => import("./modal/FourPicsOneMoneyWordModal");
const loadMoneyRushModal = () => import("./modal/MoneyRushModal");
const loadMoneyPulseModal = () => import("./modal/MoneyPulseModal");

const LearningMaterialModal = lazy(loadLearningMaterialModal);
const LearningVideoWatchModal = lazy(loadLearningVideoWatchModal);
const FourPicsOneMoneyWordModal = lazy(loadFourPicsOneMoneyWordModal);
const MoneyRushModal = lazy(loadMoneyRushModal);
const MoneyPulseModal = lazy(loadMoneyPulseModal);

function isDedicatedLearningPage() {
  if (typeof window === "undefined") return false;

  const rawHash = String(window.location.hash || "").replace(/^#/, "");
  const [pathname, query = ""] = rawHash.split("?");
  if (pathname !== "/community") return false;

  const params = new URLSearchParams(query);
  return params.get("view") === "home" && params.get("learning") === "hub";
}

function useDedicatedLearningPage() {
  const [dedicated, setDedicated] = useState(isDedicatedLearningPage);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const sync = () => setDedicated(isDedicatedLearningPage());
    window.addEventListener("hashchange", sync);
    sync();

    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return dedicated;
}

function FlagshipMasterclassCard() {
  return (
    <section
      aria-label="Featured CLARA Masterclass"
      className="relative mx-auto mt-3 w-[calc(100%-8px)] overflow-hidden rounded-[30px] border border-blue-300/18 bg-[radial-gradient(circle_at_2%_0%,rgba(14,165,233,0.24),transparent_42%),radial-gradient(circle_at_100%_100%,rgba(124,58,237,0.26),transparent_48%),linear-gradient(135deg,rgba(4,28,55,0.99),rgba(8,19,49,0.995)_48%,rgba(31,13,72,0.99))] px-5 py-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.07)] sm:px-6 sm:py-6"
    >
      <div className="pointer-events-none absolute -left-16 -top-20 h-44 w-44 rounded-full border border-cyan-200/10 bg-cyan-300/[0.05]" />
      <div className="pointer-events-none absolute -bottom-20 -right-12 h-48 w-48 rounded-full border border-violet-200/10 bg-violet-400/[0.06]" />
      <div className="pointer-events-none absolute right-5 top-[74px] h-24 w-20 rotate-6 rounded-[18px] border border-white/10 bg-white/[0.035] shadow-[0_14px_34px_rgba(0,0,0,0.22)]" />
      <div className="pointer-events-none absolute right-10 top-[92px] h-24 w-20 -rotate-6 rounded-[18px] border border-cyan-100/10 bg-cyan-100/[0.035]" />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <span className="inline-flex min-h-7 items-center rounded-full border border-yellow-200/18 bg-yellow-300/[0.08] px-3 text-[9px] font-black uppercase tracking-[0.20em] text-yellow-200/90">
          CLARA MASTERCLASS
        </span>
        <span className="inline-flex min-h-8 shrink-0 items-center rounded-full border border-white/14 bg-black/20 px-3 text-[14px] font-black tracking-[-0.02em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          ₱99
        </span>
      </div>

      <div className="relative z-10 mt-5 max-w-[76%] sm:max-w-[70%]">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/58">
          Flagship financial class
        </p>
        <h2 className="mt-2 text-[23px] font-black leading-[1.03] tracking-[-0.045em] text-white sm:text-[28px]">
          Why Your Money Keeps Disappearing After Payday
        </h2>
        <p className="mt-3 max-w-[31ch] text-[12px] font-semibold leading-5 text-blue-100/62 sm:text-[13px]">
          A Practical Budgeting Masterclass for Filipino Earners.
        </p>
      </div>

      <div className="relative z-10 mt-5 flex flex-wrap items-center gap-2">
        <span className="inline-flex min-h-7 items-center rounded-full border border-cyan-100/12 bg-cyan-100/[0.055] px-3 text-[9px] font-extrabold text-cyan-50/70">
          Budgeting
        </span>
        <span className="inline-flex min-h-7 items-center rounded-full border border-blue-100/12 bg-blue-100/[0.055] px-3 text-[9px] font-extrabold text-blue-50/70">
          Money System
        </span>
        <span className="inline-flex min-h-7 items-center rounded-full border border-violet-100/12 bg-violet-100/[0.055] px-3 text-[9px] font-extrabold text-violet-50/70">
          Accountability
        </span>
      </div>

      <div className="relative z-10 mt-5 flex items-center justify-between border-t border-white/[0.08] pt-4">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/52">
          <PlayCircle className="h-4 w-4 text-cyan-100/72" />
          Deep structured learning
        </div>
        <span className="rounded-full border border-cyan-100/16 bg-cyan-100/[0.08] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-50/78">
          Coming Soon
        </span>
      </div>
    </section>
  );
}

function preloadMaterialExperience(item) {
  if (!item || item.status !== "available") return;

  if (item.type === "book") {
    void loadLearningMaterialModal();
    return;
  }

  if (item.type === "video" && (item.embedUrl || item.youtubeId)) {
    void loadLearningVideoWatchModal();
    return;
  }

  if (item.type !== "game") return;

  if (item.id === "money-rush") {
    void loadMoneyRushModal();
  } else if (item.id === "money-pulse") {
    void loadMoneyPulseModal();
  } else if (item.id === "four-pics-one-money-word") {
    void loadFourPicsOneMoneyWordModal();
  }
}

function LearningExperienceOpeningFallback({ label = "Opening lesson" }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[9998] flex min-h-[100dvh] items-center justify-center bg-black/54 px-5 text-white backdrop-blur-sm"
    >
      <div className="flex items-center gap-3 rounded-full border border-cyan-100/16 bg-[rgba(5,18,36,0.94)] px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-50 shadow-[0_24px_70px_rgba(0,0,0,0.52)]">
        <LoaderCircle className="h-4 w-4 animate-spin text-cyan-100/86" />
        <span>{label}</span>
      </div>
    </div>,
    document.body,
  );
}

export default function LearningHubLoaded({
  initialExpanded = false,
  flushSpacing = false,
  onCollapse,
}) {
  const {
    activeCategory,
    activeCategoryMeta,
    backToHome,
    carouselItems,
    selectedMaterial,
    isOpen,
    selectedVideo,
    isVideoOpen,
    closeVideo,
    selectedGame,
    isGameOpen,
    closeGame,
    openCategory,
    openMaterial,
    closeMaterial,
    launcherMaterial,
    isLauncherOpen,
    closeLauncher,
  } = useLearningHub();
  const hasCommittedAccess = useCommittedFeatureAccess();
  const dedicatedLearningPage = useDedicatedLearningPage();

  const handleOpenItem = (item) => {
    if (!hasCommittedAccess) {
      openCommittedVersionModal();
      return;
    }

    if (item?.kind === "category") {
      if (item.status !== "available") {
        openMaterial(item);
        return;
      }

      openCategory(item.id);
      return;
    }

    preloadMaterialExperience(item);
    openMaterial(item);
  };

  return (
    <>
      <LearningHubCollapseProvider onCollapse={onCollapse}>
        <LearningHubCarousel
          items={carouselItems}
          activeCategory={activeCategory}
          activeCategoryLabel={activeCategoryMeta?.title || ""}
          hasCommittedAccess={hasCommittedAccess}
          initialExpanded={initialExpanded}
          flushSpacing={flushSpacing}
          onBackToCategories={backToHome}
          onOpenCommitmentBooklet={openCommittedVersionModal}
          onOpenItem={handleOpenItem}
        />
      </LearningHubCollapseProvider>

      {dedicatedLearningPage && !activeCategory ? <FlagshipMasterclassCard /> : null}

      {hasCommittedAccess && isOpen && selectedMaterial ? (
        <Suspense fallback={<LearningExperienceOpeningFallback label="Opening book" />}>
          <LearningMaterialModal
            isOpen={isOpen}
            material={selectedMaterial}
            onClose={closeMaterial}
          />
        </Suspense>
      ) : null}

      {hasCommittedAccess && isVideoOpen && selectedVideo ? (
        <Suspense fallback={<LearningExperienceOpeningFallback label="Opening video" />}>
          <LearningVideoWatchModal
            isOpen={isVideoOpen}
            material={selectedVideo}
            onClose={closeVideo}
          />
        </Suspense>
      ) : null}

      {hasCommittedAccess && isGameOpen && selectedGame ? (
        <Suspense fallback={<LearningExperienceOpeningFallback label="Opening game" />}>
          {selectedGame.id === "money-rush" ? (
            <MoneyRushModal
              isOpen={isGameOpen}
              material={selectedGame}
              onClose={closeGame}
            />
          ) : selectedGame.id === "money-pulse" ? (
            <MoneyPulseModal
              isOpen={isGameOpen}
              material={selectedGame}
              onClose={closeGame}
            />
          ) : (
            <FourPicsOneMoneyWordModal
              isOpen={isGameOpen}
              material={selectedGame}
              onClose={closeGame}
            />
          )}
        </Suspense>
      ) : null}

      <LearningComingSoonModal
        isOpen={hasCommittedAccess && isLauncherOpen}
        material={launcherMaterial}
        onClose={closeLauncher}
      />
    </>
  );
}

function LearningComingSoonModal({ isOpen, material, onClose }) {
  if (!isOpen || !material || typeof document === "undefined") return null;

  const isVideo = material.type === "video";
  const materialTypeLabel = {
    category: "Learning Category",
    video: "Video Material",
    practice: "Practice Tool",
    game: "Money Game",
    challenge: "Challenge",
    book: "Book Material",
  }[material.type] || "Learning Material";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex min-h-[100dvh] items-end justify-center bg-black/70 px-3 pb-3 pt-8 text-white backdrop-blur-md sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${material.title} preview`}
        className="relative w-full max-w-sm overflow-hidden rounded-[28px] border border-cyan-100/12 bg-[radial-gradient(circle_at_0%_-12%,rgba(34,211,238,0.18),transparent_44%),radial-gradient(circle_at_100%_112%,rgba(129,140,248,0.16),transparent_48%),linear-gradient(135deg,rgba(5,38,55,0.96),rgba(7,20,48,0.96)_52%,rgba(30,19,68,0.92))] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.42)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/24 text-white/70 backdrop-blur-md transition hover:bg-white/[0.08] hover:text-white active:scale-[0.98]"
        >
          <X className="h-4 w-4" />
        </button>

        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-100/14 bg-white/[0.075] text-cyan-50/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)]">
          {isVideo ? <PlayCircle className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
        </span>

        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.20em] text-cyan-100/54">
          {materialTypeLabel}
        </p>
        <h3 className="mt-1.5 pr-10 text-[22px] font-black leading-tight tracking-[-0.02em] text-white">
          {material.title}
        </h3>
        <p className="mt-2 text-[13px] leading-snug text-white/62">
          {material.subtitle}
        </p>

        <div className="mt-5 rounded-[22px] border border-white/10 bg-black/18 p-4">
          <p className="text-[13px] leading-relaxed text-white/66">
            This CLARA material is being prepared. It already has a place in the Learning Hub.
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-cyan-100/14 bg-cyan-100/[0.10] px-4 py-2 text-[12px] font-black text-cyan-50 transition hover:bg-cyan-100/[0.16] active:scale-[0.98]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}