import { useCallback, useMemo, useRef, useState } from "react";
import { learningHubCategories, learningHubData } from "./learningHubData";

const CATEGORY_COVER_LABELS = {
  "money-foundations": "Watch First",
  video: "Watch First",
  book: "Read Deeper",
  practice: "Practice",
  game: "Play",
  challenge: "Challenge",
};

const MONEY_GAME_CATEGORY_OVERRIDE = Object.freeze({
  status: "available",
  constructionLabel: "",
  badge: "PLAY",
  contentTypeLabel: "Money Game Concepts",
  subtitle: "Train financial decisions through simple money games.",
  description: "Explore early CLARA game concepts for learning money terms, spending choices, leaks, needs, wants, and payday survival.",
  ctaLabel: "See all games",
});

const MONEY_GAME_CONCEPTS = Object.freeze([
  {
    id: "four-pics-one-money-word",
    type: "game",
    category: "game",
    title: "4 Pics 1 Money Word",
    subtitle: "Guess the financial term from four visual clues.",
    description:
      "A picture puzzle where four clues point to one money term like Emergency Fund, Cash Flow, Asset, Liability, Inflation, or Budget.",
    status: "available",
    order: 1,
    coverLabel: "Picture Puzzle",
    tags: ["jargon", "vocabulary", "money terms"],
  },
  {
    id: "budget-rescue",
    type: "game",
    category: "game",
    title: "Budget Rescue",
    subtitle: "Choose what to protect, cut, delay, or adjust when money gets tight.",
    description:
      "A decision game where users face real budget pressure and must rescue the month by choosing smarter tradeoffs.",
    status: "coming-soon",
    order: 2,
    coverLabel: "Decision Game",
    tags: ["budget", "tradeoffs", "control"],
  },
  {
    id: "leak-hunter",
    type: "game",
    category: "game",
    title: "Leak Hunter",
    subtitle: "Spot the small spending leaks hiding inside everyday expenses.",
    description:
      "A pattern-recognition game where users hunt small repeated expenses that quietly drain the budget before payday.",
    status: "coming-soon",
    order: 3,
    coverLabel: "Leak Game",
    tags: ["spending leaks", "awareness", "payday"],
  },
  {
    id: "needs-vs-wants-rush",
    type: "game",
    category: "game",
    title: "Needs vs Wants Rush",
    subtitle: "Sort expenses fast into need, want, delay, or avoid.",
    description:
      "A quick sorting game that trains users to pause and classify expenses before emotion or pressure decides for them.",
    status: "coming-soon",
    order: 4,
    coverLabel: "Sorting Game",
    tags: ["needs", "wants", "discipline"],
  },
  {
    id: "payday-survival",
    type: "game",
    category: "game",
    title: "Payday Survival",
    subtitle: "Make a salary last until the next payday without breaking essentials.",
    description:
      "A survival-style money game where every bill, food choice, invite, and impulse affects whether the user survives until payday.",
    status: "coming-soon",
    order: 5,
    coverLabel: "Survival Game",
    tags: ["payday", "cash flow", "survival"],
  },
]);

const HOME_CATEGORY_ORDER_OVERRIDES = Object.freeze({
  "money-foundations": 0,
  game: 1,
  video: 2,
  book: 3,
  practice: 4,
  challenge: 5,
});

const sortByOrder = (first, second) => {
  const firstOrder = Number.isFinite(first?.order) ? first.order : 999;
  const secondOrder = Number.isFinite(second?.order) ? second.order : 999;

  return firstOrder - secondOrder;
};

const getHomeCategoryOrder = (category) => {
  const overrideOrder = HOME_CATEGORY_ORDER_OVERRIDES[category?.id];

  if (Number.isFinite(overrideOrder)) return overrideOrder;
  if (Number.isFinite(category?.order)) return category.order;

  return 999;
};

const sortHomeCategories = (first, second) => (
  getHomeCategoryOrder(first) - getHomeCategoryOrder(second)
);

const padLessonNumber = (lessonNumber) =>
  String(lessonNumber || "").padStart(2, "0");

const isCompletedLearningItem = (item) =>
  item?.completed === true ||
  item?.isCompleted === true ||
  item?.status === "completed" ||
  Boolean(item?.completedAt);

const normalizeCategory = (category) => {
  const categoryOverrides = category?.id === "game" ? MONEY_GAME_CATEGORY_OVERRIDE : null;
  const normalizedCategory = {
    ...category,
    ...(categoryOverrides || {}),
  };

  return {
    ...normalizedCategory,
    kind: "category",
    type: "category",
    categoryId: normalizedCategory.id,
    sourceType: normalizedCategory.sourceType || normalizedCategory.type,
    coverLabel:
      normalizedCategory.coverLabel || normalizedCategory.badge || CATEGORY_COVER_LABELS[normalizedCategory.id] || "Explore",
    status: normalizedCategory.status || "available",
  };
};

const normalizeMaterial = (material) => ({
  kind: "material",
  status: "available",
  category: material?.category || material?.type || "book",
  ...material,
});

const buildLessonMaterial = (category, lesson, index) => {
  const lessonNumber = Number.isFinite(lesson.lessonNumber)
    ? lesson.lessonNumber
    : index + 1;
  const order = Number.isFinite(lesson.order) ? lesson.order : lessonNumber;
  const coverLabel =
    lesson.coverLabel ||
    (lessonNumber ? `Lesson ${padLessonNumber(lessonNumber)}` : category.badge || "Lesson");

  return normalizeMaterial({
    type: lesson.type || "video",
    category: category.id,
    status: lesson.status || "available",
    provider: lesson.provider || category.sourceType,
    sourceType: lesson.sourceType || category.sourceType,
    contentTypeLabel: lesson.contentTypeLabel || category.contentTypeLabel,
    coverLabel,
    order,
    ...lesson,
    lessonNumber,
    order,
  });
};

function buildMaterialsForCategory(categoryId) {
  if (!categoryId) return [];

  if (categoryId === "game") {
    return MONEY_GAME_CONCEPTS.map(normalizeMaterial).sort(sortByOrder);
  }

  const selectedCategory = learningHubCategories.find(
    (category) => category?.id === categoryId,
  );

  const categoryLessonMaterials = Array.isArray(selectedCategory?.lessons)
    ? selectedCategory.lessons
        .filter(Boolean)
        .map((lesson, index) => buildLessonMaterial(selectedCategory, lesson, index))
    : [];

  const matchingLibraryMaterials = (Array.isArray(learningHubData) ? learningHubData : [])
    .filter((material) => (material?.category || material?.type) === categoryId)
    .map(normalizeMaterial);

  return [...categoryLessonMaterials, ...matchingLibraryMaterials]
    .filter(Boolean)
    .sort(sortByOrder);
}

export default function useLearningHub() {
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [launcherMaterial, setLauncherMaterial] = useState(null);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [isGameOpen, setIsGameOpen] = useState(false);
  const materialsCacheRef = useRef({});

  const baseCategories = useMemo(
    () =>
      [...learningHubCategories]
        .filter(Boolean)
        .map(normalizeCategory)
        .sort(sortHomeCategories),
    [],
  );

  const categories = useMemo(
    () =>
      baseCategories.map((category) => {
        const categoryLessons = Array.isArray(category.lessons)
          ? category.lessons.filter(Boolean)
          : [];
        const totalLessons = category.id === "game"
          ? MONEY_GAME_CONCEPTS.length
          : categoryLessons.length;
        const shouldShowProgress = category.id === "money-foundations";
        const completedLessons = shouldShowProgress
          ? categoryLessons.filter(isCompletedLearningItem).length
          : 0;

        return {
          ...category,
          totalLessons,
          completedLessons,
          ...(shouldShowProgress
            ? {
                progressText: `${completedLessons}/${totalLessons}`,
                progressLabel: `${completedLessons} / ${totalLessons}`,
              }
            : {}),
        };
      }),
    [baseCategories],
  );

  const getCachedMaterialsForCategory = useCallback((categoryId) => {
    if (!categoryId) return [];

    if (!materialsCacheRef.current[categoryId]) {
      materialsCacheRef.current[categoryId] = buildMaterialsForCategory(categoryId);
    }

    return materialsCacheRef.current[categoryId];
  }, []);

  const activeCategoryMaterials = useMemo(
    () => (activeCategory ? getCachedMaterialsForCategory(activeCategory) : []),
    [activeCategory, getCachedMaterialsForCategory],
  );

  const materialsByCategory = useMemo(
    () => (activeCategory ? { [activeCategory]: activeCategoryMaterials } : {}),
    [activeCategory, activeCategoryMaterials],
  );

  const materials = activeCategoryMaterials;

  const featuredVideo = useMemo(() => {
    if (activeCategory !== "video") return null;

    return (
      activeCategoryMaterials.find((material) => material.featured) ||
      activeCategoryMaterials[0] ||
      null
    );
  }, [activeCategory, activeCategoryMaterials]);

  const featuredBook = useMemo(() => {
    if (activeCategory !== "book") return null;

    return (
      activeCategoryMaterials.find((material) => material.featured) ||
      activeCategoryMaterials[0] ||
      null
    );
  }, [activeCategory, activeCategoryMaterials]);

  const activeCategoryMeta = useMemo(
    () => categories.find((category) => category.id === activeCategory) || null,
    [activeCategory, categories],
  );

  const carouselItems = useMemo(
    () => (activeCategory ? activeCategoryMaterials : categories),
    [activeCategory, activeCategoryMaterials, categories],
  );

  const openCategory = (categoryId) => {
    if (!categoryId) return;
    setActiveCategory(categoryId);
  };

  const backToHome = () => {
    setActiveCategory(null);
  };

  const getMaterialsByCategory = useCallback(
    (categoryId) => getCachedMaterialsForCategory(categoryId),
    [getCachedMaterialsForCategory],
  );

  const openMaterial = (material) => {
    if (!material) return;

    if (
      material.type === "game" &&
      material.id === "four-pics-one-money-word" &&
      material.status === "available"
    ) {
      setSelectedGame(material);
      setIsGameOpen(true);
      return;
    }

    if (material.type === "book" && material.status === "available") {
      setSelectedMaterial(material);
      setIsOpen(true);
      return;
    }

    if (
      material.type === "video" &&
      material.status === "available" &&
      (material.embedUrl || material.youtubeId)
    ) {
      setSelectedVideo(material);
      setIsVideoOpen(true);
      return;
    }

    setLauncherMaterial(material);
    setIsLauncherOpen(true);
  };

  const closeMaterial = () => {
    setSelectedMaterial(null);
    setIsOpen(false);
  };

  const closeLauncher = () => {
    setLauncherMaterial(null);
    setIsLauncherOpen(false);
  };

  const closeVideo = () => {
    setSelectedVideo(null);
    setIsVideoOpen(false);
  };

  const closeGame = () => {
    setSelectedGame(null);
    setIsGameOpen(false);
  };

  return {
    activeCategory,
    activeCategoryMeta,
    backToHome,
    carouselItems,
    categories,
    closeGame,
    closeLauncher,
    closeMaterial,
    closeVideo,
    featuredBook,
    featuredVideo,
    getMaterialsByCategory,
    isGameOpen,
    isLauncherOpen,
    isOpen,
    isVideoOpen,
    launcherMaterial,
    materials,
    materialsByCategory,
    openCategory,
    openMaterial,
    selectedGame,
    selectedMaterial,
    selectedVideo,
  };
}
