import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/theme/ThemeProvider";

const normalizeLabel = (label) =>
  String(label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const isMoneySummaryLabel = (label) => {
  const compact = normalizeLabel(label);

  return (
    compact === "money left" ||
    compact === "total expense" ||
    compact === "total expenses" ||
    compact === "total money" ||
    compact.includes("money left") ||
    compact.includes("left money") ||
    compact.includes("cash left") ||
    compact.includes("remaining money") ||
    compact.includes("money remaining") ||
    compact.includes("available money") ||
    compact.includes("money available") ||
    compact.includes("remaining balance") ||
    compact.includes("available balance") ||
    compact.includes("balance left") ||
    compact.includes("total expense") ||
    compact.includes("total expenses") ||
    compact.includes("monthly expense") ||
    compact.includes("month expense") ||
    compact.includes("expense total")
  );
};

const getThemeGlow = (theme) => {
  const raw = String(
    theme?.accent ||
      theme?.accentColor ||
      theme?.primary ||
      theme?.colors?.accent ||
      theme?.colors?.primary ||
      ""
  ).toLowerCase();

  if (raw.includes("rose") || raw.includes("pink") || raw.includes("red")) {
    return "rgba(244,63,94,0.16)";
  }
  if (raw.includes("blue") || raw.includes("sky") || raw.includes("cyan")) {
    return "rgba(56,189,248,0.16)";
  }
  if (raw.includes("violet") || raw.includes("purple") || raw.includes("indigo")) {
    return "rgba(167,139,250,0.16)";
  }
  if (raw.includes("amber") || raw.includes("yellow") || raw.includes("gold")) {
    return "rgba(251,191,36,0.16)";
  }
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
  const isMoneySummaryDisplayOnly = isMoneySummaryLabel(label);
  const isClickable = !isMoneySummaryDisplayOnly && Boolean(to || onClick);

  const stopMoneySummaryEvent = useCallback(
    (event) => {
      if (!isMoneySummaryDisplayOnly) return;
      event.preventDefault?.();
      event.stopPropagation?.();
      event.nativeEvent?.stopImmediatePropagation?.();
    },
    [isMoneySummaryDisplayOnly]
  );

  const handleClick = useCallback(() => {
    if (isMoneySummaryDisplayOnly) return;

    if (typeof onClick === "function") {
      onClick();
      return;
    }

    if (to) {
      navigate(to);
    }
  }, [isMoneySummaryDisplayOnly, navigate, onClick, to]);

  const variants = {
    default: {
      wrapper:
        "theme-panel-card backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
      icon: "bg-white/10 text-white",
      value: "text-white",
      label: "text-white/75",
      sub: "text-white/60",
    },
    yellow: {
      wrapper:
        "border border-[#D4AF37]/30 bg-[linear-gradient(135deg,rgba(56,44,10,0.98)_0%,rgba(92,72,18,0.96)_100%)] backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
      icon: "bg-white/10 text-[#FFF4B0]",
      value: "text-white",
      label: "text-[#FDE68A]",
      sub: "text-[#FFF7CC]",
    },
    green: {
      wrapper:
        "border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(10,24,20,0.98)_0%,rgba(16,52,38,0.96)_100%)] backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
      icon: "bg-white/10 text-white",
      value: "text-white",
      label: "text-white/80",
      sub: "text-white/65",
    },
    blue: {
      wrapper:
        "border border-sky-500/20 bg-[linear-gradient(135deg,rgba(10,18,36,0.98)_0%,rgba(18,52,120,0.96)_100%)] backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
      icon: "bg-white/10 text-white",
      value: "text-white",
      label: "text-white/80",
      sub: "text-white/65",
    },
    danger: {
      wrapper:
        "border border-red-500/30 bg-[linear-gradient(135deg,rgba(40,10,10,0.98)_0%,rgba(90,20,20,0.96)_100%)] backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
      icon: "bg-white/10 text-red-200",
      value: "text-white",
      label: "text-red-200",
      sub: "text-red-100",
    },
  };

  const v = variants[variant] || variants.default;
  const interactionClassName = isClickable
    ? "cursor-pointer active:scale-[0.97] hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
    : "cursor-default";

  const cardClassName = `relative flex h-full flex-col overflow-hidden rounded-2xl p-4 text-left transition-all duration-300 ${interactionClassName} ${
    highlight
      ? "ring-1 ring-emerald-400/30 shadow-[0_0_25px_rgba(16,185,129,0.15)]"
      : ""
  } ${v.wrapper} ${className}`;

  const content = (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${themeGlow} 0%, transparent 58%)`,
        }}
      />

      <div className="relative mb-3 flex items-center justify-between gap-3">
        <span
          className={`text-[11px] font-semibold uppercase tracking-wide ${v.label}`}
        >
          {label}
        </span>

        {Icon ? (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${v.icon}`}
          >
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>

      <p className={`relative break-words text-2xl font-bold leading-tight ${v.value}`}>
        {value}
      </p>

      {sub ? (
        <p className={`relative mt-2 text-sm leading-snug ${v.sub}`}>{sub}</p>
      ) : null}
    </>
  );

  const displayOnlyProps = isMoneySummaryDisplayOnly
    ? {
        role: "presentation",
        onClick: stopMoneySummaryEvent,
        onClickCapture: stopMoneySummaryEvent,
        onMouseDown: stopMoneySummaryEvent,
        onMouseDownCapture: stopMoneySummaryEvent,
        onPointerDown: stopMoneySummaryEvent,
        onPointerDownCapture: stopMoneySummaryEvent,
        onTouchStart: stopMoneySummaryEvent,
        onTouchStartCapture: stopMoneySummaryEvent,
      }
    : {};

  if (isClickable) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cardClassName}
        aria-label={`Open ${label}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cardClassName} {...displayOnlyProps}>
      {content}
    </div>
  );
}
