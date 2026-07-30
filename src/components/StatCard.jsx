import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calculator, Delete, Eye, EyeOff, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTheme } from "@/theme/ThemeProvider";

const PRIVACY_KEY = "clara_money_summary_visible";
const PRIVACY_EVENT = "clara:money-summary-privacy-updated";

const CALCULATOR_KEYS = [
  ["7", "8", "9", "÷"],
  ["4", "5", "6", "×"],
  ["1", "2", "3", "-"],
  ["0", ".", "(", ")"],
  ["C", "⌫", "=", "+"],
];

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

const evaluateCalculatorExpression = (expression) => {
  const raw = String(expression ?? "").trim();
  if (!raw) return "";

  const sanitized = raw.replace(/×/g, "*").replace(/÷/g, "/");
  if (!/^[\d+\-*/().\s]+$/.test(sanitized)) throw new Error("Invalid expression");

  const result = Function(`"use strict"; return (${sanitized})`)();
  if (!Number.isFinite(result)) throw new Error("Invalid result");

  return String(Number(result.toFixed(8)));
};

function MoneyCalculatorDialog({ open, onOpenChange }) {
  const [expression, setExpression] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setExpression("");
      setError("");
    }
  }, [open]);

  const previewResult = useMemo(() => {
    if (!expression.trim()) return "";
    try {
      return evaluateCalculatorExpression(expression);
    } catch {
      return "";
    }
  }, [expression]);

  const handlePress = (key) => {
    setError("");

    if (key === "C") {
      setExpression("");
      return;
    }

    if (key === "⌫") {
      setExpression((current) => current.slice(0, -1));
      return;
    }

    if (key === "=") {
      try {
        setExpression(evaluateCalculatorExpression(expression));
      } catch {
        setError("Check the calculation and try again.");
      }
      return;
    }

    setExpression((current) => `${current}${key}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-32px)] max-w-[320px] gap-3 rounded-[24px] border border-cyan-400/25 bg-[#06142f] p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55),0_0_30px_rgba(34,211,238,0.12)]">
        <DialogHeader>
          <DialogTitle className="text-left text-base font-bold text-white">Calculator</DialogTitle>
        </DialogHeader>

        <div className="min-h-[72px] rounded-2xl border border-white/10 bg-[#031027] px-4 py-3 shadow-inner">
          <div className="min-h-5 truncate text-right text-sm text-white/55">{expression || "0"}</div>
          <div className="mt-1 min-h-7 truncate text-right text-2xl font-black text-cyan-300">
            {previewResult || " "}
          </div>
        </div>

        {error ? <p className="text-xs text-rose-300">{error}</p> : null}

        <div className="grid gap-2">
          {CALCULATOR_KEYS.map((row, rowIndex) => (
            <div key={`calculator-row-${rowIndex}`} className="grid grid-cols-4 gap-2">
              {row.map((key) => {
                const isEquals = key === "=";
                const isClear = key === "C";
                const isDelete = key === "⌫";
                const isOperator = ["÷", "×", "-", "+"].includes(key);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handlePress(key)}
                    className={[
                      "flex h-11 items-center justify-center rounded-xl border text-sm font-bold transition active:scale-95",
                      isEquals
                        ? "border-cyan-300/40 bg-cyan-400 text-[#031027] shadow-[0_0_18px_rgba(34,211,238,0.24)]"
                        : isClear
                          ? "border-rose-400/20 bg-rose-500/10 text-rose-300"
                          : isOperator
                            ? "border-violet-400/20 bg-violet-500/10 text-violet-200"
                            : "border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.10]",
                    ].join(" ")}
                    aria-label={isDelete ? "Delete last character" : key}
                  >
                    {isDelete ? <Delete className="h-4 w-4" /> : key}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
  const isMoneyLeft = isMoneyLeftLabel(label);
  const isExpense = isExpenseLabel(label);
  const isMoneySummary = isMoneySummaryLabel(label);
  const showPrivacyToggle = isMoneyLeft;
  const [moneyVisible, setMoneyVisible] = useState(() => readPrivacy());
  const [calculatorOpen, setCalculatorOpen] = useState(false);
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
    if (event.target?.closest?.("[data-money-calculator-toggle='true']")) return;
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

  const openCalculator = useCallback((event) => {
    event.preventDefault?.();
    event.stopPropagation?.();
    event.nativeEvent?.stopImmediatePropagation?.();
    setCalculatorOpen(true);
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
  const DisplayIcon = moneyVisible ? Eye : EyeOff;
  const displayValue = isMoneySummary && !moneyVisible ? hiddenValueFor(label) : value;

  if (isExpense) return null;

  if (isMoneyLeft) {
    const moneyCardClassName = `relative col-span-2 flex min-h-[104px] w-full flex-col justify-center overflow-hidden rounded-[28px] p-4 pr-[92px] text-left transition-all duration-300 ${interaction} ${highlight ? "ring-1 ring-emerald-400/30 shadow-[0_0_25px_rgba(16,185,129,0.15)]" : ""} ${v.wrapper} ${className}`;

    const moneyContent = (
      <>
        <div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: `radial-gradient(circle at 50% 0%, ${themeGlow} 0%, transparent 58%)` }} />
        <div className="relative flex items-center gap-2">
          <span className={`text-[11px] font-bold uppercase tracking-[0.22em] ${v.label}`}>Money Left</span>
          {showPrivacyToggle ? (
            <button
              type="button"
              data-money-privacy-toggle="true"
              onClick={togglePrivacy}
              onMouseDown={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              onTouchStart={(event) => event.stopPropagation()}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.07] text-white/55 shadow-[0_0_14px_rgba(255,255,255,0.08)] backdrop-blur-xl transition hover:bg-white/[0.12] hover:text-white/80 active:scale-95"
              aria-label={moneyVisible ? "Hide money summary" : "Show money summary"}
              title={moneyVisible ? "Hide amounts" : "Show amounts"}
            >
              <DisplayIcon className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            data-money-calculator-toggle="true"
            onClick={openCalculator}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.07] text-white/55 shadow-[0_0_14px_rgba(255,255,255,0.08)] backdrop-blur-xl transition hover:bg-white/[0.12] hover:text-white/80 active:scale-95"
            aria-label="Open calculator"
            title="Calculator"
          >
            <Calculator className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className={`relative mt-3 truncate text-[30px] font-black leading-none tracking-[-0.05em] ${v.value}`}>{displayValue}</p>
        <button
          type="button"
          aria-label="Add money"
          onClick={(event) => {
            event.preventDefault?.();
            event.stopPropagation?.();
            navigate("/add-funds");
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          className="absolute right-4 top-1/2 z-20 flex h-[58px] w-[58px] -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-slate-950/45 text-white shadow-[0_0_0_6px_rgba(255,255,255,0.08),0_18px_36px_rgba(0,0,0,0.35),inset_0_0_18px_rgba(255,255,255,0.10)] backdrop-blur-xl transition active:scale-95"
        >
          <span className="pointer-events-none absolute inset-0 rounded-full border border-white/10 bg-white/[0.03]" aria-hidden="true" />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <Plus className="h-[27px] w-[27px]" strokeWidth={2.5} />
          </span>
        </button>
      </>
    );

    const displayOnlyProps = {
      role: "presentation",
      onClick: stopMoneySummaryEvent,
      onClickCapture: stopMoneySummaryEvent,
      onMouseDown: stopMoneySummaryEvent,
      onMouseDownCapture: stopMoneySummaryEvent,
      onPointerDown: stopMoneySummaryEvent,
      onPointerDownCapture: stopMoneySummaryEvent,
      onTouchStart: stopMoneySummaryEvent,
      onTouchStartCapture: stopMoneySummaryEvent,
    };

    return (
      <>
        <div className={moneyCardClassName} {...displayOnlyProps}>{moneyContent}</div>
        <MoneyCalculatorDialog open={calculatorOpen} onOpenChange={setCalculatorOpen} />
      </>
    );
  }

  const cardClassName = `relative flex h-full flex-col overflow-hidden rounded-2xl p-4 text-left transition-all duration-300 ${interaction} ${highlight ? "ring-1 ring-emerald-400/30 shadow-[0_0_25px_rgba(16,185,129,0.15)]" : ""} ${v.wrapper} ${className}`;

  const content = (
    <>
      <div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: `radial-gradient(circle at 50% 0%, ${themeGlow} 0%, transparent 58%)` }} />
      <div className="relative mb-3 flex items-center justify-between gap-3">
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${v.label}`}>{label}</span>
        {Icon ? <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${v.icon}`}><Icon className="h-4 w-4" /></div> : null}
      </div>
      <p className={`relative break-words text-2xl font-bold leading-tight ${v.value}`}>{displayValue}</p>
      {sub ? <p className={`relative mt-2 text-sm leading-snug ${v.sub}`}>{sub}</p> : null}
    </>
  );

  if (isClickable) {
    return <button type="button" onClick={handleClick} className={cardClassName} aria-label={`Open ${label}`}>{content}</button>;
  }

  return <div className={cardClassName}>{content}</div>;
}
