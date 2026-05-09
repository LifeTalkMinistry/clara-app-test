import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const MONEY_ACTION_TITLES = new Set(["Add money", "Transfer money"]);

function normalizeMoneyInput(currentValue, nextKey) {
  const current = String(currentValue || "");

  if (nextKey === "clear") return "";
  if (nextKey === "backspace") return current.slice(0, -1);

  if (nextKey === ".") {
    if (current.includes(".")) return current;
    return current ? `${current}.` : "0.";
  }

  const proposed = current === "0" ? nextKey : `${current}${nextKey}`;

  if (!/^\d{0,9}(\.\d{0,2})?$/.test(proposed)) {
    return current;
  }

  return proposed;
}

function getDisplayDescription(title, description) {
  const text = String(description || "").trim();

  if (!text) return "";

  if (title === "Add money") {
    const destination = text.match(/^Add funds to\s+(.+?)\.?$/i)?.[1];
    return destination ? `Destination: ${destination}` : text;
  }

  return text;
}

function ClaraMoneyKeypad({ value, onChange }) {
  const keys = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    ".",
    "0",
    "backspace",
  ];

  return (
    <div className="mt-3 rounded-[26px] border border-cyan-100/15 bg-white/[0.05] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_20px_48px_rgba(0,0,0,0.20)] backdrop-blur-xl">
      <div className="mb-2.5 flex items-center justify-between gap-3 rounded-[20px] border border-white/12 bg-black/18 px-3.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/48">
          CLARA Amount
        </span>

        <strong className="max-w-[12rem] truncate text-lg font-black tracking-[-0.045em] text-emerald-100 drop-shadow-[0_0_10px_rgba(110,231,183,0.22)]">
          ₱{value || "0"}
        </strong>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(normalizeMoneyInput(value, key))}
            className="flex h-[35px] items-center justify-center rounded-[18px] border border-white/14 bg-white/[0.08] text-[15px] font-black text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)] transition hover:bg-white/[0.11] active:scale-[0.97] active:bg-emerald-400/18"
          >
            {key === "backspace" ? "⌫" : key}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChange("")}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-1.5 text-[11px] font-semibold text-white/58 transition hover:bg-white/[0.07] active:scale-[0.99] active:bg-white/[0.075]"
      >
        Clear amount
      </button>
    </div>
  );
}

export default function FinanceActionModal({
  open,
  title,
  description,
  children,
  onClose,
  onSubmit,
  submitLabel = "Save",
  submitDisabled = false,
  loading = false,
  danger = false,
}) {
  const formRef = useRef(null);
  const [moneyAmount, setMoneyAmount] = useState("");
  const usesClaraMoneyKeypad = MONEY_ACTION_TITLES.has(title);
  const displayDescription = getDisplayDescription(title, description);

  const updateAmountInput = (nextValue) => {
    const input = formRef.current?.querySelector('input[type="number"]');

    setMoneyAmount(nextValue);

    if (!input) return;

    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )?.set;

    if (nativeSetter) {
      nativeSetter.call(input, nextValue);
    } else {
      input.value = nextValue;
    }

    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };

  useEffect(() => {
    if (!open || !usesClaraMoneyKeypad) return undefined;

    const frame = window.requestAnimationFrame(() => {
      const input = formRef.current?.querySelector('input[type="number"]');

      if (!input) return;

      input.readOnly = true;
      input.inputMode = "none";
      input.autocomplete = "off";
      input.blur();

      setMoneyAmount(input.value || "");
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, usesClaraMoneyKeypad]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex min-h-[100svh] items-start justify-center overflow-hidden bg-slate-950/60 px-1.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-0 backdrop-blur-[14px]">
      <div className="flex h-[clamp(480px,65svh,548px)] max-h-[calc(100svh-8.25rem)] w-full max-w-[402px] overflow-hidden rounded-[34px] border border-cyan-100/[0.18] bg-[linear-gradient(135deg,rgba(5,44,62,0.98),rgba(7,20,48,0.99)_48%,rgba(38,16,77,0.99))] shadow-[0_24px_80px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.08),0_0_44px_rgba(34,211,238,0.10)]">
        <form
          ref={formRef}
          onSubmit={onSubmit}
          className="flex min-h-0 w-full flex-col"
        >
          <div className="shrink-0 border-b border-white/10 bg-white/[0.035] px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-[30px] font-black tracking-[-0.04em] text-white">
                  {title}
                </h3>

                {displayDescription ? (
                  <p className="mt-1 text-[14px] font-medium leading-6 text-white/66">
                    {displayDescription}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="mt-1 shrink-0 rounded-full border border-white/15 bg-white/[0.075] p-3 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {children}

            {usesClaraMoneyKeypad ? (
              <ClaraMoneyKeypad
                value={moneyAmount}
                onChange={updateAmountInput}
              />
            ) : null}
          </div>

          <div className="shrink-0 border-t border-white/10 bg-[#071120]/92 px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
            <button
              type="submit"
              disabled={submitDisabled || loading}
              className={`w-full rounded-2xl px-4 py-3 text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-55 ${
                danger
                  ? "bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_10px_30px_rgba(244,63,94,0.24)]"
                  : submitDisabled
                    ? "border border-white/15 bg-white/[0.09] text-white/55 shadow-none"
                    : "bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 shadow-[0_10px_30px_rgba(16,185,129,0.24)]"
              }`}
            >
              {loading
                ? "Saving..."
                : submitDisabled
                  ? "Insufficient Funds"
                  : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
