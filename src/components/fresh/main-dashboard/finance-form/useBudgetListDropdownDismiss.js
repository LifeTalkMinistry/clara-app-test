import { useEffect } from "react";

export default function useBudgetListDropdownDismiss({
  budgetListOpen,
  budgetListDropdownRef,
  setBudgetListOpen,
}) {
  useEffect(() => {
    if (!budgetListOpen) return;

    const handlePointerDown = (event) => {
      if (!budgetListDropdownRef?.current) return;
      if (budgetListDropdownRef.current.contains(event.target)) return;
      setBudgetListOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setBudgetListOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown, { passive: true });
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [budgetListDropdownRef, budgetListOpen, setBudgetListOpen]);
}
