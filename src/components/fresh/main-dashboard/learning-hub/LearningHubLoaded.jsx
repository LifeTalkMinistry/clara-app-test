import { Suspense, lazy } from "react";
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
