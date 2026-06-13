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

const sortByOrder = (first, second) => {
  const firstOrder = Number.isFinite(first?.order) ? first.order : 999;
  const secondOrder = Number.isFinite(second?.order) ? second.order : 999;

  return firstOrder - secondOrder;
};

const padLessonNumber = (lessonNumber) =>
  String(lessonNumber || "").padStart(2, "0");

const isCompletedLearningItem = (item) =>
  item?.completed === true ||
  item?.isCompleted === true ||
  item?.status === "completed" ||
  Boolean(item?.completedAt);

const normalizeCategory = (category) => ({
  ...category,
  kind: "category",
  type: "category",
  categoryId: category.id,
  sourceType: category.sourceType || category.type,
  coverLabel:
    category.coverLabel || category.badge || CATEGORY_COVER_LABELS[category.id] || "Explore",
  status: category.status || "available",
});

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
  const materialsCacheRef = useRef({});

  const baseCategories = useMemo(
    () =>
      [...learningHubCategories]
        .filter(Boolean)
        .map(normalizeCategory)
        .sort(sortByOrder),
    [],
  );

  const categories = useMemo(
    () =>
      baseCategories.map((category) => {
        const categoryLessons = Array.isArray(category.lessons)
          ? category.lessons.filter(Boolean)
          : [];
        const totalLessons = categoryLessons.length;
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

  return {
    activeCategory,
    activeCategoryMeta,
    backToHome,
    carouselItems,
    categories,
    closeLauncher,
    closeMaterial,
    closeVideo,
    featuredBook,
    featuredVideo,
    getMaterialsByCategory,
    isLauncherOpen,
    isOpen,
    isVideoOpen,
    launcherMaterial,
    materials,
    materialsByCategory,
    openCategory,
    openMaterial,
    selectedMaterial,
    selectedVideo,
  };
}
