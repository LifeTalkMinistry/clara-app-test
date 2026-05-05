import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/theme/ThemeProvider";
import StatCardUI from "../ui/StatCard.ui.jsx";

const PRIVACY_KEY = "clara_money_summary_visible";
const PRIVACY_EVENT = "clara:money-summary-privacy-updated";

const readPrivacy = () => {
  try {
    return localStorage.getItem(PRIVACY_KEY) === "true";
  } catch {
    return false;
  }
};

const savePrivacy = (visible) => {
  try {
    localStorage.setItem(PRIVACY_KEY, String(visible));
    window.dispatchEvent(new CustomEvent(PRIVACY_EVENT, { detail: { visible } }));
  } catch {}
  return visible;
};

export default function StatCardLogic(props) {
  const navigate = useNavigate();
  const themeContext = useTheme?.() || {};

  const [moneyVisible, setMoneyVisible] = useState(() => readPrivacy());

  const togglePrivacy = useCallback((event) => {
    event.stopPropagation();
    setMoneyVisible((current) => savePrivacy(!current));
  }, []);

  const handleClick = useCallback(() => {
    if (props.to) navigate(props.to);
    if (props.onClick) props.onClick();
  }, [navigate, props]);

  const logic = {
    moneyVisible,
    togglePrivacy,
    handleClick,
  };

  return <StatCardUI {...props} logic={logic} />;
}
