import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

const CALCULATOR_KEYS = [
  ["7", "8", "9", "÷"],
  ["4", "5", "6", "×"],
  ["1", "2", "3", "-"],
  ["0", ".", "(", ")"],
  ["C", "⌫", "=", "+"],
];

function evaluateExpression(expression) {
  const source = String(expression || "")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/\s+/g, "");

  if (!source) return null;

  let index = 0;
  const peek = () => source[index] || "";
  const consume = () => source[index++] || "";

  const parseNumber = () => {
    const start = index;
    let decimalSeen = false;

    while (index < source.length) {
      const character = peek();
      if (/\d/.test(character)) {
        index += 1;
        continue;
      }
      if (character === "." && !decimalSeen) {
        decimalSeen = true;
        index += 1;
        continue;
      }
      break;
    }

    if (start === index) throw new Error("Expected number");
    const value = Number(source.slice(start, index));
    if (!Number.isFinite(value)) throw new Error("Invalid number");
    return value;
  };

  const parseFactor = () => {
    const character = peek();
    if (character === "+") {
      consume();
      return parseFactor();
    }
    if (character === "-") {
      consume();
      return -parseFactor();
    }
    if (character === "(") {
      consume();
      const value = parseExpressionNode();
      if (consume() !== ")") throw new Error("Missing closing parenthesis");
      return value;
    }
    return parseNumber();
  };

  const parseTerm = () => {
    let value = parseFactor();
    while (peek() === "*" || peek() === "/") {
      const operator = consume();
      const right = parseFactor();
      value = operator === "*" ? value * right : value / right;
      if (!Number.isFinite(value)) throw new Error("Invalid result");
    }
    return value;
  };

  function parseExpressionNode() {
    let value = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const operator = consume();
      const right = parseTerm();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  }

  const result = parseExpressionNode();
  if (index !== source.length || !Number.isFinite(result)) {
    throw new Error("Invalid expression");
  }
  return Number(result.toFixed(8));
}

function formatPeso(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "₱0";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function MoneyLeftCalculator({ isOpen, onClose, onUseExpense }) {
  const [expression, setExpression] = useState("");
  const closeButtonRef = useRef(null);
  const onCloseRef = useRef(onClose);

  const result = useMemo(() => {
    try {
      return evaluateExpression(expression);
    } catch {
      return null;
    }
  }, [expression]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return undefined;

    setExpression("");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleEscape = (event) => {
      if (event.key === "Escape") onCloseRef.current?.();
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleKey = (key) => {
    if (key === "C") return setExpression("");
    if (key === "⌫") return setExpression((current) => current.slice(0, -1));
    if (key === "=") {
      if (result !== null) setExpression(String(result));
      return;
    }
    setExpression((current) => `${current}${key}`.slice(0, 48));
  };

  const canUseExpense = Number.isFinite(result) && result > 0;
  const expenseActionLabel = canUseExpense
    ? `Use ${formatPeso(result)} As Expense`
    : "Use As Expense";

  return createPortal(
    <div
      data-clara-money-calculator-modal="true"
      className="fixed inset-0 z-[9999] flex min-h-[100dvh] items-center justify-center bg-slate-950/80 px-4 py-6 text-white backdrop-blur-lg"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCloseRef.current?.();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Calculator"
        className="w-full max-w-[320px] rounded-[24px] border border-cyan-300/25 bg-[linear-gradient(145deg,rgba(4,23,51,0.99),rgba(20,13,66,0.99))] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.62),0_0_34px_rgba(34,211,238,0.14)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <strong className="text-base tracking-[-0.01em]">Calculator</strong>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => onCloseRef.current?.()}
            aria-label="Close calculator"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/75 transition hover:bg-white/10 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 min-h-[76px] rounded-2xl border border-white/10 bg-slate-950/75 px-3.5 py-3 shadow-[inset_0_1px_14px_rgba(0,0,0,0.32)]">
          <div className="min-h-5 overflow-hidden text-ellipsis whitespace-nowrap text-right text-sm text-white/55">
            {expression || "0"}
          </div>
          <div className="mt-1 min-h-[30px] overflow-hidden text-ellipsis whitespace-nowrap text-right text-[25px] font-extrabold text-cyan-300">
            {result === null ? "" : result}
          </div>
        </div>

        <div className="grid gap-2">
          {CALCULATOR_KEYS.map((row, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-4 gap-2">
              {row.map((key) => {
                const isEquals = key === "=";
                const isClear = key === "C";
                const isOperator = ["÷", "×", "-", "+"].includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKey(key)}
                    aria-label={key === "⌫" ? "Delete last character" : key}
                    className={`h-11 rounded-xl border text-[15px] font-bold transition active:scale-[0.97] ${
                      isEquals
                        ? "border-cyan-200/55 bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.22)]"
                        : isClear
                          ? "border-white/10 bg-rose-500/15 text-rose-200"
                          : isOperator
                            ? "border-white/10 bg-violet-500/15 text-violet-100"
                            : "border-white/10 bg-white/[0.06] text-white"
                    }`}
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <button
          type="button"
          data-clara-calculator-manual-log-action="true"
          disabled={!canUseExpense}
          onClick={() => canUseExpense && onUseExpense?.(result)}
          aria-label={expenseActionLabel}
          title={expenseActionLabel}
          className="mt-3 flex h-[52px] w-full items-center justify-center whitespace-nowrap rounded-[15px] border border-cyan-200/55 bg-[linear-gradient(135deg,rgba(103,232,249,0.96),rgba(129,140,248,0.96))] px-5 text-center text-[14px] font-extrabold tracking-[-0.01em] text-slate-950 shadow-[0_12px_30px_rgba(34,211,238,0.20),inset_0_1px_0_rgba(255,255,255,0.55)] transition enabled:hover:brightness-105 enabled:active:scale-[0.985] disabled:cursor-default disabled:border-white/10 disabled:bg-[linear-gradient(135deg,rgba(30,41,59,0.82),rgba(49,46,129,0.55))] disabled:text-white/55 disabled:shadow-none"
        >
          {expenseActionLabel}
        </button>
      </section>
    </div>,
    document.body,
  );
}
