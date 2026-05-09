import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

function normalizeHelperText(value) {
  return String(value || "")
    .replace(/^Current balance/i, "Available balance")
    .trim();
}

function getDisplayDescription(title, description) {
  const text = String(description || "").trim();

  if (!text) return "";

  if (title === "Add money") {
    const destination = text.match(/^Add funds to\s+(.+?)\.?$/i)?.[1];
    return destination ? `Destination: ${destination}` : text;
  }

  if (title === "Transfer money") {
    const source = text.match(/^Move funds from\s+(.+?)\s+to another wallet\.?$/i)?.[1];
    return source ? `From: ${source}` : text;
  }

  return text;
}

function containsNumberInput(node) {
  if (!isValidElement(node)) return false;

  if (node.type === "input" && node.props?.type === "number") {
    return true;
  }

  return Children.toArray(node.props?.children).some(containsNumberInput);
}

function cloneHiddenNumberInput(node) {
  if (!isValidElement(node)) return null;

  if (node.type === "input" && node.props?.type === "number") {
    return cloneElement(node, {
      className: `${node.props.className || ""} sr-only`.trim(),
      tabIndex: -1,
      "aria-hidden": "true",
    });
  }

  const nested = Children.toArray(node.props?.children);

  for (const child of nested) {
    const result = cloneHiddenNumberInput(child);
    if (result) return result;
  }

  return null;
}

function ClaraMoneyAmountHero({ label, helper, value, hiddenInput }) {
  const hasValue = Boolean(String(value || "").trim());

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-cyan-100/14 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.16),transparent_46%),rgba(255,255,255,0.045)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_20px_48px_rgba(0,0,0,0.20)]">
      <div
        className={`pointer-events-none absolute inset-x-8 top-0 h-16 rounded-full blur-2xl transition-opacity duration-200 ${
          hasValue ? "bg-emerald-300/18 opacity-100" : "bg-cyan-300/10 opacity-60"
        }`}
      />

      <div className="relative flex items-center justify-between gap-3">
        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-white/58">
          {label || "Amount"}
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.055] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-100/70">
          CLARA input
        </span>
      </div>

      <div className="relative mt-2 flex min-h-[70px] items-center justify-center rounded-[24px] border border-white/10 bg-black/16 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
        {hiddenInput}
        <div
          className={`max-w-full truncate text-center text-[46px] font-black leading-none tracking-[-0.075em] transition duration-200 ${
            hasValue
              ? "scale-[1.015] text-emerald-50 drop-shadow-[0_0_18px_rgba(110,231,183,0.24)]"
              : "text-white/80"
          }`}
        >
          ₱{value || "0"}
        </div>
      </div>

      {helper ? (
        <p className="relative mt-2 text-xs font-semibold leading-5 text-white/64">
          {helper}
        </p>
      ) : null}
    </div>
  );
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
    <div className="mt-2.5 rounded-[24px] border border-cyan-100/12 bg-white/[0.04] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_38px_rgba(0,0,0,0.16)] backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/42">
          Numeric pad
        </span>
        <button
          type="button"
          onClick={() => onChange("")}
          className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[10px] font-semibold text-white/55 transition hover:bg-white/[0.07] active:scale-[0.97]"
        >
          Clear
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(normalizeMoneyInput(value, key))}
            className="flex h-[32px] items-center justify-center rounded-[17px] border border-white/12 bg-white/[0.07] text-[15px] font-black text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-white/[0.105] active:scale-[0.97] active:bg-emerald-400/18"
          >
            {key === "backspace" ? "⌫" : key}
          </button>
        ))}
      </div>
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

  const {
    modalChildren,
    moneyFieldLabel,
    moneyFieldHelper,
    hiddenMoneyInput,
  } = useMemo(() => {
    const childItems = Children.toArray(children);

    if (!usesClaraMoneyKeypad) {
      return {
        modalChildren: childItems,
        moneyFieldLabel: "Amount",
        moneyFieldHelper: "",
        hiddenMoneyInput: null,
      };
    }

    const moneyFieldIndex = childItems.findIndex(containsNumberInput);
    const moneyField = moneyFieldIndex >= 0 ? childItems[moneyFieldIndex] : null;

    return {
      modalChildren: childItems.filter((_, index) => index !== moneyFieldIndex),
      moneyFieldLabel: moneyField?.props?.label || "Amount",
      moneyFieldHelper: normalizeHelperText(moneyField?.props?.helper),
      hiddenMoneyInput: moneyField ? cloneHiddenNumberInput(moneyField) : null,
    };
  }, [children, usesClaraMoneyKeypad]);

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
    <div className="fixed inset-0 z-[120] flex min-h-[100svh] items-start justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_20%,rgba(15,23,42,0.42),rgba(2,6,23,0.72)_54%,rgba(2,6,23,0.86))] px-1.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-0 backdrop-blur-[16px]">
      <div className="flex h-[clamp(468px,63svh,536px)] max-h-[calc(100svh-8.25rem)] w-full max-w-[402px] overflow-hidden rounded-[34px] border border-cyan-100/[0.18] bg-[radial-gradient(circle_at_50%_0%,rgba(20,184,166,0.14),transparent_42%),linear-gradient(135deg,rgba(5,44,62,0.99),rgba(7,20,48,0.995)_48%,rgba(38,16,77,0.995))] shadow-[0_28px_90px_rgba(0,0,0,0.62),0_0_0_1px_rgba(255,255,255,0.08),0_0_54px_rgba(34,211,238,0.12)]">
        <form
          ref={formRef}
          onSubmit={onSubmit}
          className="flex min-h-0 w-full flex-col"
        >
          <div className="shrink-0 border-b border-white/10 bg-white/[0.035] px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-[29px] font-black tracking-[-0.04em] text-white">
                  {title}
                </h3>

                {displayDescription ? (
                  <p className="mt-1 max-w-[250px] text-[14px] font-semibold leading-6 text-white/68">
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

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {modalChildren}

            {usesClaraMoneyKeypad ? (
              <>
                <ClaraMoneyAmountHero
                  label={moneyFieldLabel}
                  helper={moneyFieldHelper}
                  value={moneyAmount}
                  hiddenInput={hiddenMoneyInput}
                />

                <ClaraMoneyKeypad
                  value={moneyAmount}
                  onChange={updateAmountInput}
                />
              </>
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
