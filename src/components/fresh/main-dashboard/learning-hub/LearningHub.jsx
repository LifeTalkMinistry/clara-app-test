import { useMemo } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Clock3,
  Gamepad2,
  Lock,
  PlayCircle,
  Sparkles,
  Target,
  Wrench,
  X,
} from "lucide-react";
import useLearningHub from "./logic/useLearningHub";
import LearningMaterialModal from "./modal/LearningMaterialModal";
import {
  openCommittedVersionModal,
  useCommittedFeatureAccess,
} from "@/components/fresh/main-dashboard/program-access/committedFeatureAccess";

const categoryIconMap = {
  video: PlayCircle,
  book: BookOpen,
  practice: Wrench,
  game: Gamepad2,
  challenge: Target,
};

const categoryEyebrowMap = {
  video: "Watch first",
  book: "Read deeper",
  practice: "Practice",
  game: "Train decisions",
  challenge: "Build discipline",
};

const materialTypeLabelMap = {
  video: "Video",
  book: "Guide",
  practice: "Practice",
  game: "Game",
  challenge: "Challenge",
};

const getMaterialImage = (material) =>
  material?.coverImage || material?.thumbnail || "";

const getMaterialActionLabel = (material, hasCommittedAccess) => {
  if (!hasCommittedAccess) return "Unlock";
  if (material?.status === "locked") return "Locked";
  if (material?.status === "coming-soon") return "Preview";

  switch (material?.type) {
    case "video":
      return "Watch";
    case "book":
      return "Read";
    case "practice":
      return "Open tool";
    case "game":
      return "Play";
    case "challenge":
      return "Start";
    default:
      return "Open";
  }
};

const getStatusLabel = (material, hasCommittedAccess) => {
  if (!hasCommittedAccess) return "PRO";
  if (material?.status === "coming-soon") return "Coming soon";
  if (material?.status === "locked") return "Locked";
  return material?.duration || "Available";
};

const getLauncherTitle = (material) => {
  if (material?.status === "locked") return "This lesson is locked.";
  if (material?.status === "coming-soon") return "This material is coming soon.";

  switch (material?.type) {
    case "video":
      return "Video lesson";
    case "practice":
      return "Practice tool";
    case "game":
      return "Money game";
    case "challenge":
      return "Challenge details";
    default:
      return "Learning material";
  }
};

const getLauncherMessage = (material) => {
  if (material?.status === "locked") {
    return "This learning material is reserved for the committed version.";
  }

  if (material?.type === "video" && material?.videoUrl) {
    return material.description || "Watch this CLARA coaching lesson.";
  }

  switch (material?.type) {
    case "video":
      return "The video slot is already prepared in the Learning Hub. Once the actual lesson is connected, this card can open the video player directly.";
    case "practice":
      return "This practice tool has a reserved place in CLARA. Once the guided exercise is built, this card can open the tool screen.";
    case "game":
      return "This game launcher is prepared so CLARA can add simple money games without changing the Learning Hub structure again.";
    case "challenge":
      return "This challenge card is ready for the future challenge details flow. For now, it safely opens this coming-soon preview.";
    default:
      return "This material is reserved for a future CLARA Learning Hub release.";
  }
};

export default function LearningHub() {
  const {
    activeCategory,
    backToHome,
    categories,
    closeLauncher,
    closeMaterial,
    featuredBook,
    featuredVideo,
    getMaterialsByCategory,
    isLauncherOpen,
    isOpen,
    launcherMaterial,
    openCategory,
    openMaterial,
    selectedMaterial,
  } = useLearningHub();
  const hasCommittedAccess = useCommittedFeatureAccess();

  const activeCategoryMeta = useMemo(
    () => categories.find((category) => category.id === activeCategory) || null,
    [activeCategory, categories],
  );

  const activeCategoryMaterials = activeCategory
    ? getMaterialsByCategory(activeCategory)
    : [];

  const handleOpenMaterial = (material) => {
    if (!hasCommittedAccess) {
      openCommittedVersionModal();
      return;
    }

    openMaterial(material);
  };

  return (
    <section className="clara-budget-focus-shift clara-budget-focus-hub w-full px-1 py-0 text-white">
      {activeCategoryMeta ? (
        <LearningHubCategoryView
          category={activeCategoryMeta}
          featuredBook={featuredBook}
          materials={activeCategoryMaterials}
          hasCommittedAccess={hasCommittedAccess}
          onBack={backToHome}
          onOpenMaterial={handleOpenMaterial}
        />
      ) : (
        <LearningHubHome
          categories={categories}
          featuredVideo={featuredVideo}
          getMaterialsByCategory={getMaterialsByCategory}
          hasCommittedAccess={hasCommittedAccess}
          onOpenCategory={openCategory}
          onOpenMaterial={handleOpenMaterial}
        />
      )}

      <LearningMaterialModal
        isOpen={hasCommittedAccess && isOpen}
        material={selectedMaterial}
        onClose={closeMaterial}
      />

      <MaterialLaunchModal
        isOpen={hasCommittedAccess && isLauncherOpen}
        material={launcherMaterial}
        onClose={closeLauncher}
      />
    </section>
  );
}

function LearningHubHome({
  categories,
  featuredVideo,
  getMaterialsByCategory,
  hasCommittedAccess,
  onOpenCategory,
  onOpenMaterial,
}) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <LearningHubHeader />

      <FeaturedVideoMaterial
        material={featuredVideo}
        hasCommittedAccess={hasCommittedAccess}
        onOpenMaterial={onOpenMaterial}
        onOpenCategory={() => onOpenCategory("video")}
      />

      <div className="space-y-4">
        {categories.map((category) => {
          const categoryMaterials = getMaterialsByCategory(category.id);
          const previewLimit = category.id === "video" || category.id === "book" ? 3 : 2;

          return (
            <LearningCategoryPreview
              key={category.id}
              category={category}
              materials={categoryMaterials.slice(0, previewLimit)}
              totalCount={categoryMaterials.length}
              hasCommittedAccess={hasCommittedAccess}
              onOpenCategory={() => onOpenCategory(category.id)}
              onOpenMaterial={onOpenMaterial}
            />
          );
        })}
      </div>
    </div>
  );
}

function LearningHubHeader() {
  return (
    <header className="relative overflow-hidden rounded-[28px] border border-cyan-100/10 bg-[radial-gradient(circle_at_-12%_-18%,rgba(34,211,238,0.17),transparent_44%),radial-gradient(circle_at_112%_118%,rgba(129,140,248,0.15),transparent_48%),linear-gradient(135deg,rgba(6,48,66,0.78),rgba(7,20,48,0.82)_48%,rgba(37,13,74,0.74))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.24)] sm:p-5">
      <div className="pointer-events-none absolute -right-14 -top-16 h-36 w-36 rounded-full bg-cyan-300/[0.07] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 left-12 h-44 w-44 rounded-full bg-indigo-400/[0.08] blur-3xl" />
      <div className="relative z-10 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-100/14 bg-white/[0.075] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)]">
          <Sparkles className="h-5 w-5 text-cyan-100/78" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/58">
            Learning system
          </p>
          <h2 className="mt-1 text-[22px] font-black leading-tight tracking-[-0.02em] text-white sm:text-2xl">
            CLARA Learning Hub
          </h2>
          <p className="mt-1.5 max-w-xl text-[13px] leading-snug text-white/64 sm:text-sm">
            Learn money behavior, not just money math.
          </p>
        </div>
      </div>
    </header>
  );
}

function FeaturedVideoMaterial({
  material,
  hasCommittedAccess,
  onOpenCategory,
  onOpenMaterial,
}) {
  const Icon = categoryIconMap.video;

  if (!material) return null;

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-cyan-100/12 bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,0.20),transparent_42%),radial-gradient(circle_at_95%_100%,rgba(99,102,241,0.17),transparent_48%),linear-gradient(135deg,rgba(5,38,55,0.92),rgba(7,20,48,0.94)_50%,rgba(30,19,68,0.88))] p-4 shadow-[0_18px_42px_rgba(0,0,0,0.26)] sm:p-5">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.055] via-transparent to-black/20" />
      <div className="relative z-10 grid gap-4 sm:grid-cols-[1.05fr_0.95fr] sm:items-stretch">
        <div className="flex min-h-[170px] flex-col justify-between rounded-[24px] border border-white/10 bg-black/16 p-4 backdrop-blur-md">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100/14 bg-white/[0.075] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-50/82">
              <Icon className="h-3.5 w-3.5" />
              Featured Video Material
            </div>
            <h3 className="mt-4 text-[24px] font-black leading-[1.04] tracking-[-0.03em] text-white sm:text-3xl">
              {material.title}
            </h3>
            <p className="mt-2 max-w-md text-[13px] leading-snug text-white/66">
              {material.subtitle}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenMaterial(material)}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-100/16 bg-cyan-100/[0.10] px-4 py-2 text-[12px] font-black text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] transition hover:bg-cyan-100/[0.16] active:scale-[0.98]"
            >
              <PlayCircle className="h-4 w-4" />
              {getMaterialActionLabel(material, hasCommittedAccess)}
            </button>
            <button
              type="button"
              onClick={onOpenCategory}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-[12px] font-bold text-white/74 transition hover:bg-white/[0.09] hover:text-white active:scale-[0.98]"
            >
              See all videos
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <MaterialPreviewSurface
          material={material}
          hasCommittedAccess={hasCommittedAccess}
          className="min-h-[170px]"
        />
      </div>
    </section>
  );
}

function LearningCategoryPreview({
  category,
  materials,
  totalCount,
  hasCommittedAccess,
  onOpenCategory,
  onOpenMaterial,
}) {
  const Icon = categoryIconMap[category.id] || BookOpen;

  return (
    <section className="rounded-[28px] border border-white/8 bg-white/[0.035] p-3 shadow-[0_14px_34px_rgba(0,0,0,0.16)] backdrop-blur-xl sm:p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onOpenCategory}
          className="group flex min-w-0 items-start gap-3 text-left"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-100/10 bg-white/[0.06] text-cyan-50/76 transition group-hover:bg-white/[0.10]">
            <Icon className="h-4.5 w-4.5" />
          </span>
          <span className="min-w-0">
            <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/48">
              {categoryEyebrowMap[category.id] || "Learn"}
            </span>
            <span className="mt-0.5 block text-[15px] font-black leading-tight text-white">
              {category.title}
            </span>
            <span className="mt-1 line-clamp-2 block text-[11.5px] leading-snug text-white/54">
              {category.subtitle}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenCategory}
          className="shrink-0 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-[10px] font-black text-white/68 transition hover:bg-white/[0.09] hover:text-white active:scale-[0.98]"
        >
          See all
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {materials.length > 0 ? (
          materials.map((material) => (
            <LearningMaterialTile
              key={material.id}
              material={material}
              category={category}
              hasCommittedAccess={hasCommittedAccess}
              onClick={() => onOpenMaterial(material)}
              compact
            />
          ))
        ) : (
          <EmptyComingSoonTile category={category} />
        )}

        <button
          type="button"
          onClick={onOpenCategory}
          className="flex min-h-[150px] min-w-[148px] flex-col items-center justify-center rounded-[22px] border border-dashed border-cyan-100/14 bg-cyan-100/[0.045] px-4 text-center text-white/72 transition hover:border-cyan-100/22 hover:bg-cyan-100/[0.07] active:scale-[0.98]"
        >
          <ChevronRight className="mb-2 h-5 w-5 text-cyan-100/70" />
          <span className="text-[11px] font-black">See all</span>
          <span className="mt-1 text-[9px] font-semibold text-white/42">
            {totalCount} items
          </span>
        </button>
      </div>
    </section>
  );
}

function LearningHubCategoryView({
  category,
  featuredBook,
  materials,
  hasCommittedAccess,
  onBack,
  onOpenMaterial,
}) {
  const Icon = categoryIconMap[category.id] || BookOpen;
  const featuredItem =
    category.id === "book"
      ? featuredBook || materials[0] || null
      : materials.find((material) => material.featured) || materials[0] || null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <header className="relative overflow-hidden rounded-[28px] border border-cyan-100/10 bg-[radial-gradient(circle_at_-12%_-18%,rgba(34,211,238,0.17),transparent_44%),radial-gradient(circle_at_112%_118%,rgba(129,140,248,0.15),transparent_48%),linear-gradient(135deg,rgba(6,48,66,0.78),rgba(7,20,48,0.82)_48%,rgba(37,13,74,0.74))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.24)] sm:p-5">
        <div className="relative z-10 flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Learning Hub home"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-white/72 transition hover:bg-white/[0.09] hover:text-white active:scale-[0.98]"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>

          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-100/14 bg-white/[0.075] shadow-[inset_0_1px_0_rgba(255,255,255,0.09)]">
              <Icon className="h-5 w-5 text-cyan-100/78" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/58">
                {categoryEyebrowMap[category.id] || "Category"}
              </p>
              <h2 className="mt-1 text-[22px] font-black leading-tight tracking-[-0.02em] text-white sm:text-2xl">
                {category.title}
              </h2>
              <p className="mt-1.5 max-w-xl text-[13px] leading-snug text-white/64 sm:text-sm">
                {category.subtitle}
              </p>
            </div>
          </div>
        </div>
      </header>

      {category.id === "book" && featuredItem ? (
        <ContinueReadingSection
          material={featuredItem}
          hasCommittedAccess={hasCommittedAccess}
          onOpenMaterial={onOpenMaterial}
        />
      ) : featuredItem ? (
        <CategoryFeaturedItem
          category={category}
          material={featuredItem}
          hasCommittedAccess={hasCommittedAccess}
          onOpenMaterial={onOpenMaterial}
        />
      ) : null}

      <section className="rounded-[28px] border border-white/8 bg-white/[0.035] p-3 shadow-[0_14px_34px_rgba(0,0,0,0.16)] backdrop-blur-xl sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-[14px] font-black text-white">
              All {category.title}
            </h3>
            <p className="mt-0.5 text-[11px] font-semibold text-white/46">
              Focused list for this category only.
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-[10px] font-black text-white/58">
            {materials.length} items
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {materials.length > 0 ? (
            materials.map((material) => (
              <LearningMaterialTile
                key={material.id}
                material={material}
                category={category}
                hasCommittedAccess={hasCommittedAccess}
                onClick={() => onOpenMaterial(material)}
              />
            ))
          ) : (
            <EmptyComingSoonTile category={category} />
          )}
        </div>
      </section>
    </div>
  );
}

function CategoryFeaturedItem({
  category,
  material,
  hasCommittedAccess,
  onOpenMaterial,
}) {
  const Icon = categoryIconMap[category.id] || Sparkles;

  return (
    <section className="grid gap-3 rounded-[28px] border border-cyan-100/10 bg-[radial-gradient(circle_at_12%_-20%,rgba(34,211,238,0.16),transparent_42%),linear-gradient(135deg,rgba(6,48,66,0.60),rgba(15,23,42,0.76))] p-3 shadow-[0_16px_36px_rgba(0,0,0,0.18)] sm:grid-cols-[1fr_0.9fr] sm:p-4">
      <div className="flex flex-col justify-between rounded-[22px] border border-white/10 bg-black/14 p-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100/14 bg-white/[0.075] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-50/82">
            <Icon className="h-3.5 w-3.5" />
            Featured {materialTypeLabelMap[material.type] || "Material"}
          </div>
          <h3 className="mt-4 text-[22px] font-black leading-[1.06] tracking-[-0.025em] text-white">
            {material.title}
          </h3>
          <p className="mt-2 text-[13px] leading-snug text-white/62">
            {material.subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpenMaterial(material)}
          className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-100/16 bg-cyan-100/[0.10] px-4 py-2 text-[12px] font-black text-cyan-50 transition hover:bg-cyan-100/[0.16] active:scale-[0.98]"
        >
          {getMaterialActionLabel(material, hasCommittedAccess)}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <MaterialPreviewSurface material={material} hasCommittedAccess={hasCommittedAccess} />
    </section>
  );
}

function ContinueReadingSection({ material, hasCommittedAccess, onOpenMaterial }) {
  return (
    <section className="grid gap-3 rounded-[28px] border border-cyan-100/10 bg-[radial-gradient(circle_at_12%_-20%,rgba(34,211,238,0.16),transparent_42%),linear-gradient(135deg,rgba(6,48,66,0.60),rgba(15,23,42,0.76))] p-3 shadow-[0_16px_36px_rgba(0,0,0,0.18)] sm:grid-cols-[1fr_0.9fr] sm:p-4">
      <div className="flex flex-col justify-between rounded-[22px] border border-white/10 bg-black/14 p-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100/14 bg-white/[0.075] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-50/82">
            <BookOpen className="h-3.5 w-3.5" />
            Continue Reading
          </div>
          <h3 className="mt-4 text-[22px] font-black leading-[1.06] tracking-[-0.025em] text-white">
            {material.title}
          </h3>
          <p className="mt-2 text-[13px] leading-snug text-white/62">
            {material.subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpenMaterial(material)}
          className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-100/16 bg-cyan-100/[0.10] px-4 py-2 text-[12px] font-black text-cyan-50 transition hover:bg-cyan-100/[0.16] active:scale-[0.98]"
        >
          {getMaterialActionLabel(material, hasCommittedAccess)}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <MaterialPreviewSurface material={material} hasCommittedAccess={hasCommittedAccess} />
    </section>
  );
}

function LearningMaterialTile({
  material,
  category,
  hasCommittedAccess,
  onClick,
  compact = false,
}) {
  const Icon = categoryIconMap[material?.type || category?.id] || BookOpen;
  const statusLabel = getStatusLabel(material, hasCommittedAccess);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[24px] border border-white/9 bg-[radial-gradient(circle_at_0%_-12%,rgba(34,211,238,0.10),transparent_46%),linear-gradient(135deg,rgba(15,23,42,0.88),rgba(7,20,48,0.86)_50%,rgba(30,19,68,0.78))] text-left shadow-[0_14px_28px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:border-cyan-100/16 hover:bg-white/[0.045] active:scale-[0.985] ${
        compact ? "min-h-[150px] min-w-[210px] p-3" : "min-h-[190px] p-3"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.045] via-transparent to-black/18" />
      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-100/12 bg-white/[0.065] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-cyan-50/76">
            <Icon className="h-3 w-3" />
            {materialTypeLabelMap[material?.type] || category?.title || "Material"}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.055] px-2.5 py-1 text-[9px] font-black text-white/58">
            {statusLabel}
          </span>
        </div>

        <div className="mt-3">
          <MaterialArtwork material={material} compact={compact} />
        </div>

        <div className="mt-3 min-w-0">
          <h4 className="line-clamp-2 text-[15px] font-black leading-tight text-white">
            {material.title}
          </h4>
          <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-snug text-white/54">
            {material.subtitle}
          </p>
        </div>

        <div className="mt-auto pt-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-[10px] font-black text-white/70 transition group-hover:bg-cyan-100/[0.10] group-hover:text-cyan-50">
            {getMaterialActionLabel(material, hasCommittedAccess)}
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </button>
  );
}

function MaterialPreviewSurface({ material, hasCommittedAccess, className = "" }) {
  return (
    <div className={`relative overflow-hidden rounded-[24px] border border-white/10 bg-black/18 p-3 ${className}`}>
      <MaterialArtwork material={material} compact={false} large />
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-[10px] font-black text-white/68">
          <Clock3 className="h-3.5 w-3.5 text-cyan-100/68" />
          {getStatusLabel(material, hasCommittedAccess)}
        </span>
        <span className="rounded-full border border-cyan-100/12 bg-cyan-100/[0.07] px-3 py-1.5 text-[10px] font-black text-cyan-50/78">
          {materialTypeLabelMap[material?.type] || "Material"}
        </span>
      </div>
    </div>
  );
}

function MaterialArtwork({ material, compact = false, large = false }) {
  const image = getMaterialImage(material);
  const Icon = categoryIconMap[material?.type] || BookOpen;

  return (
    <div
      className={`relative overflow-hidden rounded-[18px] border border-white/8 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,0.22),transparent_46%),radial-gradient(circle_at_100%_100%,rgba(129,140,248,0.16),transparent_52%),linear-gradient(135deg,rgba(5,38,55,0.95),rgba(15,23,42,0.92)_52%,rgba(30,19,68,0.86))] ${
        large ? "h-[160px] sm:h-[190px]" : compact ? "h-[76px]" : "h-[112px]"
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] via-transparent to-black/26" />
      {image ? (
        <img
          src={image}
          alt={material?.title ? `${material.title} cover` : "Learning material cover"}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/64 via-black/8 to-transparent" />
      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
        <span className="rounded-full border border-white/12 bg-black/26 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-white/72 backdrop-blur-md">
          {material?.coverLabel || materialTypeLabelMap[material?.type] || "CLARA"}
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.08] text-cyan-50/76 backdrop-blur-md">
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

function EmptyComingSoonTile({ category }) {
  const Icon = categoryIconMap[category?.id] || Sparkles;

  return (
    <div className="flex min-h-[150px] min-w-[210px] flex-col justify-between rounded-[24px] border border-dashed border-cyan-100/14 bg-cyan-100/[0.045] p-4 text-left">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-100/12 bg-white/[0.055] text-cyan-50/72">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div>
        <p className="text-[14px] font-black text-white">Coming soon</p>
        <p className="mt-1 text-[11px] leading-snug text-white/50">
          Premium {category?.title || "learning"} cards will appear here.
        </p>
      </div>
    </div>
  );
}

function MaterialLaunchModal({ isOpen, material, onClose }) {
  if (!isOpen || !material || typeof document === "undefined") return null;

  const Icon = categoryIconMap[material.type] || Sparkles;
  const canPlayVideo =
    material.type === "video" && material.status === "available" && material.videoUrl;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${material.title} launcher`}
      className="fixed inset-0 z-[9999] flex min-h-[100dvh] items-end justify-center bg-black/70 px-3 pb-3 pt-8 text-white backdrop-blur-md sm:items-center sm:p-6"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-cyan-100/12 bg-[radial-gradient(circle_at_0%_-12%,rgba(34,211,238,0.18),transparent_44%),radial-gradient(circle_at_100%_112%,rgba(129,140,248,0.16),transparent_48%),linear-gradient(135deg,rgba(5,38,55,0.96),rgba(7,20,48,0.96)_52%,rgba(30,19,68,0.92))] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.42)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/24 text-white/70 backdrop-blur-md transition hover:bg-white/[0.08] hover:text-white active:scale-[0.98]"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        <div className="pr-12">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-100/14 bg-white/[0.075] text-cyan-50/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)]">
            {material.status === "locked" ? (
              <Lock className="h-5 w-5" />
            ) : (
              <Icon className="h-5 w-5" />
            )}
          </span>
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.20em] text-cyan-100/54">
            {getLauncherTitle(material)}
          </p>
          <h3 className="mt-1.5 text-[22px] font-black leading-tight tracking-[-0.02em] text-white">
            {material.title}
          </h3>
          <p className="mt-2 text-[13px] leading-snug text-white/62">
            {material.subtitle}
          </p>
        </div>

        {canPlayVideo ? (
          <div className="mt-4 overflow-hidden rounded-[22px] border border-white/10 bg-black/26">
            <iframe
              src={material.videoUrl}
              title={material.title}
              className="aspect-video w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="mt-5 rounded-[22px] border border-white/10 bg-black/18 p-4">
            <p className="text-[13px] leading-relaxed text-white/66">
              {getLauncherMessage(material)}
            </p>
            {Array.isArray(material.tags) && material.tags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {material.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-[10px] font-bold text-white/56"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        )}

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
