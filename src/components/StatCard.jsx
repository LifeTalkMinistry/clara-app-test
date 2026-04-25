import { useCallback, useMemo, useRef, useState } from "react";
import { BarChart3, ChevronRight, ListChecks } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/theme/ThemeProvider";

const MONEY_TRANSACTION_LABELS = new Set([
  "money left",
  "total money",
  "total expense",
  "total expenses",
]);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getPointerX = (event) => {
  if (event?.touches?.[0]) return event.touches[0].clientX;
  if (event?.changedTouches?.[0]) return event.changedTouches[0].clientX;
  return event.clientX;
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
    return "rgba(244,63,94,0.34)";
  }
  if (raw.includes("blue") || raw.includes("sky") || raw.includes("cyan")) {
    return "rgba(56,189,248,0.34)";
  }
  if (raw.includes("violet") || raw.includes("purple") || raw.includes("indigo")) {
    return "rgba(167,139,250,0.34)";
  }
  if (raw.includes("amber") || raw.includes("yellow") || raw.includes("gold")) {
    return "rgba(251,191,36,0.34)";
  }
  return "rgba(16,185,129,0.34)";
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
  const normalizedLabel = String(label || "").trim().toLowerCase();
  const isMoneyMetric = MONEY_TRANSACTION_LABELS.has(normalizedLabel);
  const autoTransactionTarget = isMoneyMetric ? "/expenses" : "";
  const targetPath = to || autoTransactionTarget;
  const isClickable = Boolean(targetPath || onClick);

  const [activeSlide, setActiveSlide] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({
    startX: 0,
    lastX: 0,
    startTime: 0,
    velocity: 0,
    moved: false,
    longPressTimer: null,
  });

  const slides = useMemo(
    () => [
      { key: "summary", label: "Summary" },
      { key: "transactions", label: "Transactions" },
      { key: "analytics", label: "Analytics" },
    ],
    []
  );

  const handleClick = useCallback(() => {
    if (isDragging || dragRef.current.moved) return;

    if (activeSlide === 1) {
      navigate("/expenses");
      return;
    }

    if (activeSlide === 2) {
      navigate("/analytics");
      return;
    }

    if (typeof onClick === "function") {
      onClick();
      return;
    }

    if (targetPath) {
      navigate(targetPath);
    }
  }, [activeSlide, isDragging, navigate, onClick, targetPath]);

  const goToAnalytics = useCallback(() => {
    if (isMoneyMetric) navigate("/analytics");
  }, [isMoneyMetric, navigate]);

  const clearLongPress = useCallback(() => {
    if (dragRef.current.longPressTimer) {
      window.clearTimeout(dragRef.current.longPressTimer);
      dragRef.current.longPressTimer = null;
    }
  }, []);

  const handlePointerStart = useCallback(
    (event) => {
      if (!isMoneyMetric) return;
      const x = getPointerX(event);
      dragRef.current = {
        startX: x,
        lastX: x,
        startTime: performance.now(),
        velocity: 0,
        moved: false,
        longPressTimer: window.setTimeout(goToAnalytics, 560),
      };
      setIsDragging(true);
      setDragX(0);
    },
    [goToAnalytics, isMoneyMetric]
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (!isMoneyMetric || !isDragging) return;
      const x = getPointerX(event);
      const now = performance.now();
      const delta = x - dragRef.current.startX;
      const frameDelta = x - dragRef.current.lastX;
      const elapsed = Math.max(now - dragRef.current.startTime, 16);
      const atStart = activeSlide === 0 && delta > 0;
      const atEnd = activeSlide === slides.length - 1 && delta < 0;
      const resistance = atStart || atEnd ? 0.32 : 1;
      const resistedDelta = delta * resistance;

      dragRef.current.velocity = frameDelta / elapsed;
      dragRef.current.lastX = x;

      if (Math.abs(delta) > 6) {
        dragRef.current.moved = true;
        clearLongPress();
      }

      setDragX(resistedDelta);
    },
    [activeSlide, clearLongPress, isDragging, isMoneyMetric, slides.length]
  );

  const handlePointerEnd = useCallback(() => {
    if (!isMoneyMetric) return;
    clearLongPress();

    const width = 260;
    const distance = dragX;
    const velocity = dragRef.current.velocity;
    const shouldNext = distance < -width * 0.18 || velocity < -0.18;
    const shouldPrev = distance > width * 0.18 || velocity > 0.18;

    let nextSlide = activeSlide;
    if (shouldNext) nextSlide += 1;
    if (shouldPrev) nextSlide -= 1;

    setActiveSlide(clamp(nextSlide, 0, slides.length - 1));
    setDragX(0);
    setIsDragging(false);

    window.setTimeout(() => {
      dragRef.current.moved = false;
    }, 80);
  }, [activeSlide, clearLongPress, dragX, isMoneyMetric, slides.length]);

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
  const activeGlowStrength = isMoneyMetric ? 0.68 + activeSlide * 0.08 : 0;
  const cardClassName = `relative flex h-full flex-col overflow-hidden rounded-2xl p-4 text-left transition-all duration-300 active:scale-[0.97] hover:scale-[1.01] ${
    isClickable || isMoneyMetric ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400/40" : ""
  } ${
    highlight
      ? "ring-1 ring-emerald-400/30 shadow-[0_0_25px_rgba(16,185,129,0.15)]"
      : ""
  } ${v.wrapper} ${className}`;

  const summaryContent = (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
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

      <p className={`break-words text-2xl font-bold leading-tight ${v.value}`}>
        {value}
      </p>

      {sub ? (
        <p className={`mt-2 text-sm leading-snug ${v.sub}`}>
          {sub}
        </p>
      ) : null}
    </>
  );

  const transactionContent = (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-white/75">
            Transactions
          </span>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
            <ListChecks className="h-4 w-4" />
          </div>
        </div>
        <p className="text-xl font-bold leading-tight text-white">Review movement</p>
        <p className="mt-2 text-sm leading-snug text-white/62">
          Tap to open the transaction list connected to this number.
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/75">
        View transactions
        <ChevronRight className="h-4 w-4" />
      </div>
    </div>
  );

  const analyticsContent = (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-white/75">
            Analytics
          </span>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
            <BarChart3 className="h-4 w-4" />
          </div>
        </div>
        <p className="text-xl font-bold leading-tight text-white">See the pattern</p>
        <p className="mt-2 text-sm leading-snug text-white/62">
          Open insights, spending rhythm, and monthly performance.
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/75">
        Open analytics
        <ChevronRight className="h-4 w-4" />
      </div>
    </div>
  );

  const content = isMoneyMetric ? (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-70 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${themeGlow} 0%, transparent 58%)`,
          opacity: activeGlowStrength,
        }}
      />
      <div
        className="relative -mx-4 -my-4 flex h-[calc(100%+2rem)] touch-pan-y select-none will-change-transform"
        style={{
          transform: `translate3d(calc(${-activeSlide * 100}% + ${dragX}px), 0, 0)`,
          transition: isDragging ? "none" : "transform 560ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {[summaryContent, transactionContent, analyticsContent].map((slide, index) => {
          const distance = Math.abs(index - activeSlide);
          const scale = distance === 0 ? 1 : 0.94;
          const opacity = distance === 0 ? 1 : 0.72;

          return (
            <div
              key={slides[index].key}
              className="min-w-full px-4 py-4 will-change-transform"
              style={{
                transform: `scale(${scale})`,
                opacity,
                transition: isDragging
                  ? "none"
                  : "transform 420ms ease, opacity 420ms ease",
              }}
            >
              {slide}
            </div>
          );
        })}
      </div>

      <div className="pointer-events-none relative mt-auto flex items-center justify-center gap-1.5 pt-3">
        {slides.map((slide, index) => (
          <span
            key={slide.key}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === activeSlide ? "w-5 bg-white/80" : "w-1.5 bg-white/25"
            }`}
          />
        ))}
      </div>
    </>
  ) : (
    <>
      {summaryContent}
      <div className="mt-auto pt-4">
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/5">
          <div className="h-full w-[60%] rounded-full bg-white/20" />
        </div>
      </div>
    </>
  );

  const sharedProps = isMoneyMetric
    ? {
        onMouseDown: handlePointerStart,
        onMouseMove: handlePointerMove,
        onMouseUp: handlePointerEnd,
        onMouseLeave: handlePointerEnd,
        onTouchStart: handlePointerStart,
        onTouchMove: handlePointerMove,
        onTouchEnd: handlePointerEnd,
        onTouchCancel: handlePointerEnd,
      }
    : {};

  if (isClickable || isMoneyMetric) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cardClassName}
        aria-label={`Open ${activeSlide === 2 ? "analytics" : "transactions"} for ${label}`}
        {...sharedProps}
      >
        {content}
      </button>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}
