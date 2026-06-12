import { useMemo, useState } from "react";
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

const buildCategoryLessonMaterials = () =>
  learningHubCategories.flatMap((category) => {
    if (!Array.isArray(category?.lessons)) return [];

    return category.lessons.filter(Boolean).map((lesson, index) => {
      const lessonNumber = Number.isFinite(lesson.lessonNumber)
        ? lesson.lessonNumber
        : index + 1;
      const order = Number.isFinite(lesson.order) ? lesson.order : lessonNumber;
      const coverLabel =
        lesson.coverLabel ||
        (lessonNumber ? `Lesson ${padLessonNumber(lessonNumber)}` : category.badge || "Lesson");

      return {
        kind: "material",
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
      };
    });
  });

export default function useLearningHub() {
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [launcherMaterial, setLauncherMaterial] = useState(null);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const baseCategories = useMemo(
    () =>
      [...learningHubCategories]
        .filter(Boolean)
        .map((category) => ({
          ...category,
          kind: "category",
          type: "category",
          categoryId: category.id,
          sourceType: category.sourceType || category.type,
          coverLabel:
            category.coverLabel || category.badge || CATEGORY_COVER_LABELS[category.id] || "Explore",
          status: category.status || "available",
        }))
        .sort(sortByOrder),
    [],
  );

  const materials = useMemo(
    () =>
      [...buildCategoryLessonMaterials(), ...learningHubData]
        .filter(Boolean)
        .map((material) => ({
          kind: "material",
          status: "available",
          category: material?.category || material?.type || "book",
          ...material,
        }))
        .sort(sortByOrder),
    [],
  );

  const materialsByCategory = useMemo(() => {
    return baseCategories.reduce((groupedMaterials, category) => {
      groupedMaterials[category.id] = materials
        .filter((material) => (material.category || material.type) === category.id)
        .sort(sortByOrder);

      return groupedMaterials;
    }, {});
  }, [baseCategories, materials]);

  const categories = useMemo(
    () =>
      baseCategories.map((category) => {
        const categoryMaterials = materialsByCategory[category.id] || [];
        const totalLessons = categoryMaterials.length;
        const completedLessons = categoryMaterials.filter(isCompletedLearningItem).length;
        const shouldShowProgress = category.id === "money-foundations";

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
    [baseCategories, materialsByCategory],
  );

  const featuredVideo = useMemo(() => {
    const videoMaterials = materialsByCategory.video || [];

    return (
      videoMaterials.find((material) => material.featured) ||
      videoMaterials[0] ||
      null
    );
  }, [materialsByCategory]);

  const featuredBook = useMemo(() => {
    const bookMaterials = materialsByCategory.book || [];

    return (
      bookMaterials.find((material) => material.featured) ||
      bookMaterials[0] ||
      null
    );
  }, [materialsByCategory]);

  const activeCategoryMeta = useMemo(
    () => categories.find((category) => category.id === activeCategory) || null,
    [activeCategory, categories],
  );

  const carouselItems = useMemo(
    () => (activeCategory ? materialsByCategory[activeCategory] || [] : categories),
    [activeCategory, categories, materialsByCategory],
  );

  const openCategory = (categoryId) => {
    if (!categoryId) return;
    setActiveCategory(categoryId);
  };

  const backToHome = () => {
    setActiveCategory(null);
  };

  const getMaterialsByCategory = (categoryId) =>
    materialsByCategory[categoryId] || [];

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
