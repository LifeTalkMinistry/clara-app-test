import { Suspense, lazy, useEffect, useMemo, useState } from "react";
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

function buildDedicatedCarouselItems(items) {
  if (!Array.isArray(items)) return items;

  const featuredMasterclass = items.find((item) => item?.id === "video");
  const moneyFoundations = items.find((item) => item?.id === "money-foundations");
  const remainingItems = items.filter(
    (item) => item?.id !== "video" && item?.id !== "money-foundations",
  );

  const masterclassItem = featuredMasterclass
    ? {
        ...featuredMasterclass,
        kind: "masterclass",
        type: "video",
        status: "available",
        constructionLabel: "",
        featured: true,
        masterclassPreviewOnly: true,
        thumbnail: "/learning-hub/money-foundations/masterclass.png",
        badge: "CLARA MASTERCLASS",
        coverLabel: "FLAGSHIP CLASS",
        contentTypeLabel: "₱99 Masterclass",
        title: "Why Your Money Keeps Disappearing After Payday",
        subtitle: "A Practical Budgeting Masterclass for Filipino Earners.",
        description:
          "Understand why money disappears after payday, how budgeting actually works, and how accountability turns knowledge into a repeatable money system.",
        ctaLabel: "Preview masterclass",
        progressText: "₱99",
        progressLabel: "₱99",
      }
    : null;

  return [moneyFoundations, masterclassItem, ...remainingItems].filter(Boolean);
}

function resolveBoardMeta(item) {
  if (!item) {
    return {
      eyebrow: "LEARNING HUB",
      features: [],
      latestUpdate: "Choose a learning path to see what it offers.",
    };
  }

  if (item.id === "money-foundations") {
    return {
      eyebrow: "WATCH FIRST · FOUNDATION PATH",
      features: ["10 curated lessons", "Money basics", "Learn at your pace"],
      latestUpdate: "10 Money Foundations lessons are available now.",
    };
  }

  if (item.masterclassPreviewOnly) {
    return {
      eyebrow: "CLARA MASTERCLASS · ₱99",
      features: ["Payday cycle", "Budget system", "Accountability"],
      latestUpdate: "Flagship masterclass announced · currently in production.",
    };
  }

  if (item.id === "game") {
    return {
      eyebrow: "MONEY GAMES",
      features: ["Interactive practice", "Fast feedback", "Decision training"],
      latestUpdate:
        "4 Icons 1 Money Word, Money Rush, and Money Pulse are available to play.",
    };
  }

  if (item.id === "book") {
    return {
      eyebrow: "BOOKS & GUIDES",
      features: ["Read deeper", "Structured guides", "Self-paced"],
      latestUpdate: "Books & Guides is being prepared for a future Learning Hub update.",
    };
  }

  if (item.id === "practice") {
    return {
      eyebrow: "PRACTICE TOOLS",
      features: ["Guided exercises", "Apply lessons", "Hands-on practice"],
      latestUpdate: "Practice Tools is currently under construction.",
    };
  }

  if (item.id === "challenge") {
    return {
      eyebrow: "CLARA CHALLENGES",
      features: ["Small actions", "Build discipline", "Repeatable habits"],
      latestUpdate: "Learning challenges are being prepared for a future release.",
    };
  }

  const features = Array.isArray(item.tags)
    ? item.tags.slice(0, 3).map((tag) => String(tag))
    : [];

  return {
    eyebrow: item.contentTypeLabel || item.coverLabel || "LEARNING MATERIAL",
    features,
    latestUpdate:
      item.status === "available"
        ? "This learning material is available now."
        : "This learning material is being prepared.",
  };
}

function extractActiveCarouselTitle(card) {
  if (!(card instanceof HTMLElement)) return "";

  const heading = card.querySelector("h3")?.textContent?.trim();
  if (heading) return heading;

  const imageAlt = card.querySelector("img[alt$=' cover']")?.getAttribute("alt") || "";
  return imageAlt.replace(/\s+cover$/i, "").trim();
}

function useActiveLearningBoardItem({ enabled, items }) {
  const [activeItemId, setActiveItemId] = useState(() => items?.[0]?.id || "");

  useEffect(() => {
    if (!Array.isArray(items) || items.length === 0) {
      setActiveItemId("");
      return;
    }

    if (!items.some((item) => item?.id === activeItemId)) {
      setActiveItemId(items[0]?.id || "");
    }
  }, [activeItemId, items]);

  useEffect(() => {
    if (!enabled || typeof document === "undefined" || !Array.isArray(items) || !items.length) {
      return undefined;
    }

    let frameId = null;

    const syncFromCarousel = () => {
      frameId = null;
      const hub = document.querySelector(".clara-community-home-learning-hub");
      if (!(hub instanceof HTMLElement)) return;

      const cards = Array.from(hub.querySelectorAll(".clara-learning-hub-card"));
      if (!cards.length) return;

      const activeCard = cards.reduce((best, card) => {
        const cardZ = Number.parseFloat(card.style.zIndex || "0") || 0;
        const bestZ = Number.parseFloat(best?.style?.zIndex || "-1") || -1;
        return cardZ > bestZ ? card : best;
      }, null);

      const title = extractActiveCarouselTitle(activeCard);
      if (!title) return;

      const match = items.find((item) => item?.title === title);
      if (match?.id) {
        setActiveItemId((current) => (current === match.id ? current : match.id));
      }
    };

    const queueSync = () => {
      if (frameId !== null || typeof window === "undefined") return;
      frameId = window.requestAnimationFrame(syncFromCarousel);
    };

    queueSync();

    const observer = new MutationObserver(queueSync);
    const hub = document.querySelector(".clara-community-home-learning-hub");
    observer.observe(hub || document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style"],
    });

    window.addEventListener("resize", queueSync);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", queueSync);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [enabled, items]);

  return items.find((item) => item?.id === activeItemId) || items?.[0] || null;
}

function LearningHubInfoBoard({ item }) {
  const meta = resolveBoardMeta(item);

  if (!item) return null;

  return (
    <section
      aria-live="polite"
      aria-label={`${item.title} details`}
      className="relative mx-auto mt-4 w-[calc(100%-8px)] overflow-hidden rounded-[24px] border border-blue-300/14 bg-[radial-gradient(circle_at_0%_0%,rgba(14,165,233,0.13),transparent_42%),radial-gradient(circle_at_100%_100%,rgba(124,58,237,0.12),transparent_46%),rgba(5,17,36,0.91)] px-4 py-4 text-white shadow-[0_16px_44px_rgba(0,0,0,0.20),inset_0_1px_0_rgba(255,255,255,0.05)] sm:px-5"
    >
      <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full border border-violet-200/10 bg-violet-400/[0.045]" />
      <div className="pointer-events-none absolute -bottom-14 -left-10 h-24 w-24 rounded-full border border-cyan-200/10 bg-cyan-300/[0.035]" />

      <div className="relative z-10">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cyan-100/14 bg-cyan-100/[0.07] text-cyan-50/80">
            {item.masterclassPreviewOnly || item.type === "video" ? (
              <PlayCircle className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-[8.5px] font-black uppercase tracking-[0.18em] text-yellow-200/78">
              {meta.eyebrow}
            </p>
            <p className="mt-0.5 text-[15px] font-black leading-tight tracking-[-0.025em] text-white/94">
              {item.title}
            </p>
          </div>
        </div>

        <p className="mt-3 text-[11px] font-semibold leading-[1.55] text-blue-100/58">
          {item.description || item.subtitle || "Explore this CLARA learning path."}
        </p>

        {meta.features.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Main features">
            {meta.features.map((feature) => (
              <span
                key={feature}
                className="rounded-full border border-cyan-100/12 bg-cyan-100/[0.055] px-2.5 py-1 text-[8.5px] font-extrabold text-cyan-50/70"
              >
                {feature}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-3 border-t border-white/[0.07] pt-3">
          <p className="text-[8px] font-black uppercase tracking-[0.18em] text-white/38">
            Latest update
          </p>
          <p className="mt-1 text-[10.5px] font-bold leading-[1.45] text-white/68">
            {meta.latestUpdate}
          </p>
        </div>
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
  const displayedCarouselItems = useMemo(
    () =>
      dedicatedLearningPage && !activeCategory
        ? buildDedicatedCarouselItems(carouselItems)
        : carouselItems,
    [activeCategory, carouselItems, dedicatedLearningPage],
  );
  const boardItem = useActiveLearningBoardItem({
    enabled: dedicatedLearningPage && !activeCategory,
    items: displayedCarouselItems,
  });

  const handleOpenItem = (item) => {
    if (item?.masterclassPreviewOnly) {
      openMaterial(item);
      return;
    }

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
          items={displayedCarouselItems}
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

      {dedicatedLearningPage && !activeCategory ? (
        <LearningHubInfoBoard item={boardItem} />
      ) : null}

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
        isOpen={
          isLauncherOpen &&
          (hasCommittedAccess || Boolean(launcherMaterial?.masterclassPreviewOnly))
        }
        material={launcherMaterial}
        onClose={closeLauncher}
      />
    </>
  );
}

function LearningComingSoonModal({ isOpen, material, onClose }) {
  if (!isOpen || !material || typeof document === "undefined") return null;

  const isVideo = material.type === "video";
  const materialTypeLabel = material.masterclassPreviewOnly
    ? "CLARA Masterclass"
    : {
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
          {material.masterclassPreviewOnly || isVideo ? (
            <PlayCircle className="h-5 w-5" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
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
            {material.masterclassPreviewOnly
              ? "This ₱99 CLARA Masterclass is being prepared as a deeper, structured learning experience. It will live here in the Learning Hub when ready."
              : "This CLARA material is being prepared. It already has a place in the Learning Hub."}
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
