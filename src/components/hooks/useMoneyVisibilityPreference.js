import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "clara_money_visibility";
const VISIBLE_VALUE = "visible";
const HIDDEN_VALUE = "hidden";

function readStoredMoneyVisibilityPreference() {
  if (typeof window === "undefined" || !window.localStorage) {
    return true;
  }

  try {
    const savedPreference = window.localStorage.getItem(STORAGE_KEY);

    if (savedPreference === HIDDEN_VALUE) {
      return false;
    }

    if (savedPreference === VISIBLE_VALUE) {
      return true;
    }
  } catch (error) {
    console.warn("[CLARA] Failed to load money visibility preference:", error);
  }

  return true;
}

function persistMoneyVisibilityPreference(visible) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, visible ? VISIBLE_VALUE : HIDDEN_VALUE);
  } catch (error) {
    console.warn("[CLARA] Failed to save money visibility preference:", error);
  }
}

export default function useMoneyVisibilityPreference() {
  const [moneyAmountsVisible, setMoneyAmountsVisible] = useState(() =>
    readStoredMoneyVisibilityPreference()
  );
  const [isMoneyVisibilityLoaded, setIsMoneyVisibilityLoaded] = useState(false);

  useEffect(() => {
    setMoneyAmountsVisible(readStoredMoneyVisibilityPreference());
    setIsMoneyVisibilityLoaded(true);
  }, []);

  const setMoneyVisibility = useCallback((visible) => {
    const nextValue = Boolean(visible);

    setMoneyAmountsVisible(nextValue);
    persistMoneyVisibilityPreference(nextValue);
  }, []);

  const toggleMoneyVisibility = useCallback(() => {
    setMoneyAmountsVisible((currentValue) => {
      const nextValue = !currentValue;
      persistMoneyVisibilityPreference(nextValue);
      return nextValue;
    });
  }, []);

  return {
    moneyAmountsVisible,
    isMoneyVisibilityLoaded,
    setMoneyVisibility,
    toggleMoneyVisibility,
  };
}
