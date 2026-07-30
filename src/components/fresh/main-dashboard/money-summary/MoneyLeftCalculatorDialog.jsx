import { useEffect, useMemo, useState } from "react";
import { Delete } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CALCULATOR_KEYS = [
  ["7", "8", "9", "÷"],
  ["4", "5", "6", "×"],
  ["1", "2", "3", "-"],
  ["0", ".", "(", ")"],
  ["C", "⌫", "=", "+"],
];

const evaluateExpression = (expression) => {
  const raw = String(expression ?? "").trim();
  if (!raw) return "";

  const sanitized = raw.replace(/×/g, "*").replace(/÷/g, "/");
  if (!/^[\d+\-*/().\s]+$/.test(sanitized)) {
    throw new Error("Invalid expression");
  }

  const result = Function(`"use strict"; return (${sanitized})`)();
  if (!Number.isFinite(result)) throw new Error("Invalid result");

  return String(Number(result.toFixed(8)));
};

export default function MoneyLeftCalculatorDialog({ open, onOpenChange }) {
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
      return evaluateExpression(expression);
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
        setExpression(evaluateExpression(expression));
      } catch {
        setError("Check the calculation and try again.");
      }
      return;
    }

    setExpression((current) => `${current}${key}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-clara-money-calculator-dialog="true"
        className="w-[calc(100%-32px)] max-w-[320px] gap-3 rounded-[24px] border border-cyan-400/25 bg-[#06142f] p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55),0_0_30px_rgba(34,211,238,0.12)]"
      >
        <DialogHeader>
          <DialogTitle className="text-left text-base font-bold text-white">
            Calculator
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-[72px] rounded-2xl border border-white/10 bg-[#031027] px-4 py-3 shadow-inner">
          <div className="min-h-5 truncate text-right text-sm text-white/55">
            {expression || "0"}
          </div>
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
