import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useTheme } from "@/theme/ThemeProvider";

const PRIVACY_KEY = "clara_money_summary_visible";
const PRIVACY_EVENT = "clara:money-summary-privacy-updated";

const normalizeLabel = (label) =>
  String(label || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const isMoneyLeftLabel = (label) => {
  const text = normalizeLabel(label);
  return (
    text === "money left" ||
    text === "total money left" ||
    text === "total money" ||
    text.includes("money left") ||
    text.includes("left money") ||
    text.includes("cash left") ||
    text.includes("remaining money") ||
    text.includes("money remaining") ||
    text.includes("available money") ||
    text.includes("money available") ||
    text.includes("remaining balance") ||
    text.includes("available balance") ||
    text.includes("balance left")
  );
};

const isExpenseLabel = (label) => {
  const text = normalizeLabel(label);
  return (
    text === "total expense" ||
    text === "total expenses" ||
    text.includes("total expense") ||
    text.includes("total expenses") ||
    text.includes("monthly expense") ||
    text.includes("month expense") ||
    text.includes("expense total")
  );
};

const isMoneySummaryLabel = (label) => isMoneyLeftLabel(label) || isExpenseLabel(label);

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
  } catch (error) {
    console.error("Failed to save money summary privacy setting:", error);
  }
  return visible;
};

const hiddenValueFor = (label) => (isMoneyLeftLabel(label) ? "₱••••••" : "₱•••••");

const getThemeGlow = (theme) => {
  const raw = String(theme?.accent || theme?.accentColor || theme?.primary || theme?.colors?.accent || theme?.colors?.primary || "").toLowerCase();
  if (raw.includes("rose") || raw.includes("pink") || raw.includes("red")) return "rgba(244,63,94,0.16)";
  if (raw.includes("blue") || raw.includes("sky") || raw.includes("cyan")) return "rgba(56,189,248,0.16)";
  if (raw.includes("violet") || raw.includes("purple") || raw.includes("indigo")) return "rgba(167,139,250,0.16)";
  if (raw.includes("amber") || raw.includes("yellow") || raw.includes("gold")) return "rgba(251,191,36,0.16)";
  return "rgba(16,185,129,0.16)";
};

export default function StatCard({
  label = "",
  value = "-",
  sub = "",
  icon: Icon = null,
  variant = "default",
  className = "",
  highlight = false,
  to = "",
  onClick = null,
}) {
  const navigate = useNavigate();
  const themeContext = useTheme?.() || {};
  const themeGlow = getThemeGlow(themeContext?.theme || themeContext?.currentTheme || themeContext);
  const isMoneySummary = isMoneySummaryLabel(label);
  const showPrivacyToggle = isExpenseLabel(label);
  const [moneyVisible, setMoneyVisible] = useState(() => readPrivacy());
  const isClickable = !isMoneySummary && Boolean(to || onClick);

  useEffect(() => {
    if (!isMoneySummary) return undefined;
    const onPrivacyUpdate = (event) => setMoneyVisible(typeof event?.detail?.visible === "boolean" ? event.detail.visible : readPrivacy());
    const onStorage = (event) => {
      if (event.key === PRIVACY_KEY) setMoneyVisible(event.newValue === "true");
    };
    window.addEventListener(PRIVACY_EVENT, onPrivacyUpdate);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PRIVACY_EVENT, onPrivacyUpdate);
      window.removeEventListener("storage", onStorage);
    };
  }, [isMoneySummary]);

  const stopMoneySummaryEvent = useCallback((event) => {
    if (!isMoneySummary) return;
    if (event.target?.closest?.("[data-money-privacy-toggle='true']")) return;
    event.preventDefault?.();
    event.stopPropagation?.();
    event.nativeEvent?.stopImmediatePropagation?.();
  }, [isMoneySummary]);

  const togglePrivacy = useCallback((event) => {
    event.preventDefault?.();
    event.stopPropagation?.();
    event.nativeEvent?.stopImmediatePropagation?.();
    setMoneyVisible((current) => savePrivacy(!current));
  }, []);

  const handleClick = useCallback(() => {
    if (isMoneySummary) return;
    if (typeof onClick === "function") return onClick();
    if (to) navigate(to);
  }, [isMoneySummary, navigate, onClick, to]);

  const variants = {
    default: { wrapper: "theme-panel-card backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.28)]", icon: "bg-white/10 text-white", value: "text-white", label: "text-white/75", sub: "text-white/60" },
    yellow: { wrapper: "border border-[#D4AF37]/30 bg-[linear-gradient(135deg,rgba(56,44,10,0.98)_0%,rgba(92,72,18,0.96)_100%)] backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.28)]", icon: "bg-white/10 text-[#FFF4B0]", value: "text-white", label: "text-[#FDE68A]", sub: "text-[#FFF7CC]" },
    green: { wrapper: "border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(10,24,20,0.98)_0%,rgba(16,52,38,0.96)_100%)] backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.28)]", icon: "bg-white/10 text-white", value: "text-white", label: "text-white/80", sub: "text-white/65" },
    blue: { wrapper: "border border-sky-500/20 bg-[linear-gradient(135deg,rgba(10,18,36,0.98)_0%,rgba(18,52,120,0.96)_100%)] backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.28)]", icon: "bg-white/10 text-white", value: "text-white", label: "text-white/80", sub: "text-white/65" },
    danger: { wrapper: "border border-red-500/30 bg-[linear-gradient(135deg,rgba(40,10,10,0.98)_0%,rgba(90,20,20,0.96)_100%)] backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.28)]", icon: "bg-white/10 text-red-200", value: "text-white", label: "text-red-200", sub: "text-red-100" },
  };

  const v = variants[variant] || variants.default;
  const interaction = isClickable ? "cursor-pointer active:scale-[0.97] hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-emerald-400/40" : "cursor-default";
  const cardClassName = `relative flex h-full flex-col overflow-hidden rounded-2xl p-4 text-left transition-all duration-300 ${interaction} ${highlight ? "ring-1 ring-emerald-400/30 shadow-[0_0_25px_rgba(16,185,129,0.15)]" : ""} ${v.wrapper} ${className}`;
  const DisplayIcon = moneyVisible ? Eye : EyeOff;
  const displayValue = isMoneySummary && !moneyVisible ? hiddenValueFor(label) : value;

  const content = (
    <>
      <div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: `radial-gradient(circle at 50% 0%, ${themeGlow} 0%, transparent 58%)` }} />
      {showPrivacyToggle ? (
        <button
          type="button"
          data-money-privacy-toggle="true"
          onClick={togglePrivacy}
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          className="absolute right-2.5 top-2.5 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.07] text-white/55 shadow-[0_0_14px_rgba(255,255,255,0.08)] backdrop-blur-xl transition hover:bg-white/[0.12] hover:text-white/80 active:scale-95"
          aria-label={moneyVisible ? "Hide money summary" : "Show money summary"}
          title={moneyVisible ? "Hide amounts" : "Show amounts"}
        >
          <DisplayIcon className="h-3.5 w-3.5" />
        </button>
      ) : null}
      <div className="relative mb-3 flex items-center justify-between gap-3">
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${showPrivacyToggle ? "pr-8" : ""} ${v.label}`}>{label}</span>
        {Icon ? <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${v.icon}`}><Icon className="h-4 w-4" /></div> : null}
      </div>
      <p className={`relative break-words text-2xl font-bold leading-tight ${v.value}`}>{displayValue}</p>
      {sub ? <p className={`relative mt-2 text-sm leading-snug ${v.sub}`}>{sub}</p> : null}
    </>
  );

  const displayOnlyProps = isMoneySummary ? {
    role: "presentation",
    onClick: stopMoneySummaryEvent,
    onClickCapture: stopMoneySummaryEvent,
    onMouseDown: stopMoneySummaryEvent,
    onMouseDownCapture: stopMoneySummaryEvent,
    onPointerDown: stopMoneySummaryEvent,
    onPointerDownCapture: stopMoneySummaryEvent,
    onTouchStart: stopMoneySummaryEvent,
    onTouchStartCapture: stopMoneySummaryEvent,
  } : {};

  if (isClickable) {
    return <button type="button" onClick={handleClick} className={cardClassName} aria-label={`Open ${label}`}>{content}</button>;
  }

  return <div className={cardClassName} {...displayOnlyProps}>{content}</div>;
}
