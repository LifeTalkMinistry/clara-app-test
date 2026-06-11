import { useMemo, useState } from "react";
import { learningHubCategories, learningHubData } from "./learningHubData";

const sortByOrder = (first, second) => {
  const firstOrder = Number.isFinite(first?.order) ? first.order : 999;
  const secondOrder = Number.isFinite(second?.order) ? second.order : 999;

  return firstOrder - secondOrder;
};

export default function useLearningHub() {
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [launcherMaterial, setLauncherMaterial] = useState(null);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);

  const categories = useMemo(
    () => [...learningHubCategories].sort(sortByOrder),
    [],
  );

  const materials = useMemo(
    () =>
      [...learningHubData]
        .filter(Boolean)
        .map((material) => ({
          status: "available",
          category: material?.category || material?.type || "book",
          ...material,
        }))
        .sort(sortByOrder),
    [],
  );

  const materialsByCategory = useMemo(() => {
    return categories.reduce((groupedMaterials, category) => {
      groupedMaterials[category.id] = materials
        .filter((material) => (material.category || material.type) === category.id)
        .sort(sortByOrder);

      return groupedMaterials;
    }, {});
  }, [categories, materials]);

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

  return {
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
    materials,
    materialsByCategory,
    openCategory,
    openMaterial,
    selectedMaterial,
  };
}
