import { useState } from "react";
import { learningHubData } from "./learningHubData";

export default function useLearningHub() {
  const [materials] = useState(learningHubData);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const openMaterial = (material) => {
    setSelectedMaterial(material);
    setIsOpen(true);
  };

  const closeMaterial = () => {
    setSelectedMaterial(null);
    setIsOpen(false);
  };

  return {
    materials,
    selectedMaterial,
    isOpen,
    openMaterial,
    closeMaterial,
  };
}
