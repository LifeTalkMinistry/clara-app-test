import {
  Children,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  CircleDollarSign,
  ReceiptText,
  WalletCards,
  X,
} from "lucide-react";
import { useManualExpenseGuideSimulation } from "@/components/fresh/main-dashboard/manual-expense/ManualExpenseGuideSimulationContext";

const MANUAL_EXPENSE_STEPS = Object.freeze({
  AMOUNT: "amount",
  BUDGET: "budget",
  REASON: "reason",
  WALLET: "wallet",
  CONFIRM: "confirm",
});

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "[href]",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const moneyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatMoney(value) {
  const amount = Number(value);
  return moneyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

function readMoney(value) {
  const amount = Number(
    String(value ?? "")
      .replace(/php/gi, "")
      .replace(/[^0-9.-]/g, "")
  );
  return Number.isFinite(amount) ? amount : 0;
}

function findElement(node, predicate) {
  if (!isValidElement(node)) return null;
  if (predicate(node)) return node;

  const descendants = Children.toArray(node.props?.children);
  for (const descendant of descendants) {
    const found = findElement(descendant, predicate);
    if (found) return found;
  }

  return null;
}

function getToneClasses(tone = "neutral", selected = false) {
  const tones = {
    emerald:
      "border-emerald-300/18 bg-emerald-400/[0.075] shadow-[0_12px_28px_rgba(16,185,129,0.06)]",
    cyan:
      "border-cyan-300/18 bg-cyan-400/[0.075] shadow-[0_12px_28px_rgba(34,211,238,0.06)]",
    amber:
      "border-amber-300/18 bg-amber-400/[0.075] shadow-[0_12px_28px_rgba(245,158,11,0.06)]",
    violet:
      "border-violet-300/18 bg-violet-400/[0.075] shadow-[0_12px_28px_rgba(139,92,246,0.06)]",
    rose:
      "border-rose-300/18 bg-rose-400/[0.075] shadow-[0_12px_28px_rgba(244,63,94,0.06)]",
    neutral:
      "border-white/[0.09] bg-white/[0.045] shadow-[0_12px_28px_rgba(0,0,0,0.12)]",
  };

  return `${tones[tone] || tones.neutral} ${
    selected
      ? "ring-1 ring-cyan-200/40 shadow-[0_0_0_3px_rgba(34,211,238,0.08),0_16px_34px_rgba(0,0,0,0.18)]"
      : "hover:border-white/[0.16] hover:bg-white/[0.07]"
  }`;
}

function SummaryRow({ icon: Icon, label, value, onEdit }) {
  return (
    <div className="flex min-h-[54px] items-center gap-3 rounded-[18px] border border-white/[0.075] bg-black/[0.12] px-3.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-cyan-200/12 bg-cyan-300/[0.07] text-cyan-100/78">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/35">
          {label}
        </p>
        <p className="mt-0.5 truncate text-[13px] font-black text-white/88">
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="min-h-[36px] shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[10px] font-black uppercase tracking-[0.08em] text-cyan-100/72 transition hover:bg-white/[0.08] hover:text-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/50"
      >
        Edit
      </button>
    </div>
  );
}

function ProgressIndicator({ current, total }) {
  return (
    <div className="mt-2 flex items-center gap-1.5" aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, index) => {
        const step = index + 1;
        const active = step === current;
        const complete = step < current;
        return (
          <span
            key={step}
            aria-current={active ? "step" : undefined}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              active
                ? "w-8 bg-cyan-200"
                : complete
                  ? "w-4 bg-emerald-300/75"
                  : "w-4 bg-white/12"
            }`}
          />
        );
      })}
    </div>
  );
}

export default function ManualExpenseFullScreenSheet({
  open,
  children,
  onClose,
  onSubmit,
  submitDisabled = false,
  loading = false,
}) {
  const guideSimulation = useManualExpenseGuideSimulation();
  const isGuideSimulation = Boolean(guideSimulation?.active);
  const effectiveClose = isGuideSimulation ? guideSimulation.onClose : onClose;
  const dialogRef = useRef(null);
  const openedCycleRef = useRef(false);
  const previousFocusRef = useRef(null);
  const [step, setStep] = useState(MANUAL_EXPENSE_STEPS.AMOUNT);
  const [inlineError, setInlineError] = useState("");

  const childArray = useMemo(() => Children.toArray(children), [children]);
  const amountField = childArray[0] || null;
  const budgetField = childArray[1] || null;
  const walletField = childArray[2] || null;
  const conditionalContent = childArray.slice(3);

  const amountInput = findElement(
    amountField,
    (element) => element.type === "input" && element.props?.type === "number"
  );
  const budgetDropdown = findElement(
    budgetField,
    (element) => element.props?.ariaLabel === "Select budget list"
  );
  const walletDropdown = findElement(
    walletField,
    (element) => element.props?.ariaLabel === "Select wallet for expense"
  );
  const unplannedTextarea = findElement(
    conditionalContent,
    (element) => element.type === "textarea"
  );
  const undocumentedDropdown = findElement(
    conditionalContent,
    (element) =>
      element.props?.ariaLabel === "Select undocumented spending reason"
  );
  const undocumentedNoteInput = findElement(
    conditionalContent,
    (element) =>
      element.type === "input" &&
      String(element.props?.placeholder || "").toLowerCase().includes("short note")
  );

  const amountValue = amountInput?.props?.value ?? "";
  const amount = Number(amountValue);
  const validAmount = Number.isFinite(amount) && amount > 0;
  const budgetValue = String(budgetDropdown?.props?.value || "");
  const walletValue = String(walletDropdown?.props?.value || "");
  const budgetOptions = Array.isArray(budgetDropdown?.props?.options)
    ? budgetDropdown.props.options
    : [];
  const walletOptions = Array.isArray(walletDropdown?.props?.options)
    ? walletDropdown.props.options
    : [];
  const selectedBudget = budgetOptions.find(
    (option) => String(option.value) === budgetValue
  );
  const selectedWallet = walletOptions.find(
    (option) => String(option.value) === walletValue
  );
  const isUnplanned = budgetValue === "__unplanned__";
  const isUndocumented = budgetValue === "__undocumented__";
  const needsReason = isUnplanned || isUndocumented;
  const totalSteps = needsReason ? 4 : 3;
  const currentStepNumber =
    step === MANUAL_EXPENSE_STEPS.AMOUNT
      ? 1
      : step === MANUAL_EXPENSE_STEPS.BUDGET
        ? 2
        : step === MANUAL_EXPENSE_STEPS.REASON
          ? 3
          : needsReason
            ? 4
            : 3;
  const unplannedReason = String(unplannedTextarea?.props?.value || "").trim();
  const undocumentedReason = String(
    undocumentedDropdown?.props?.value || ""
  ).trim();
  const legacyShapeReady = Boolean(amountInput && budgetDropdown && walletDropdown);

  useEffect(() => {
    if (!open) {
      openedCycleRef.current = false;
      return;
    }

    if (openedCycleRef.current) return;
    openedCycleRef.current = true;
    setInlineError("");
    setStep(
      isGuideSimulation
        ? MANUAL_EXPENSE_STEPS.CONFIRM
        : MANUAL_EXPENSE_STEPS.AMOUNT
    );

    if (
      !isGuideSimulation &&
      walletOptions.length > 1 &&
      walletValue &&
      typeof walletDropdown?.props?.onChange === "function"
    ) {
      walletDropdown.props.onChange("");
    }
  }, [
    isGuideSimulation,
    open,
    walletDropdown,
    walletOptions.length,
    walletValue,
  ]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "contain";

    const focusFirstControl = () => {
      const preferred = dialogRef.current?.querySelector(
        '[data-manual-expense-initial-focus="true"]'
      );
      const firstFocusable = dialogRef.current?.querySelector(FOCUSABLE_SELECTOR);
      (preferred || firstFocusable)?.focus?.({ preventScroll: true });
    };

    const animationFrame = window.requestAnimationFrame(focusFirstControl);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        effectiveClose?.();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
      ).filter((element) => !element.hasAttribute("inert"));
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
      previousFocusRef.current?.focus?.({ preventScroll: true });
    };
  }, [effectiveClose, open]);

  useEffect(() => {
    if (!open || isGuideSimulation || typeof window === "undefined") return;
    const animationFrame = window.requestAnimationFrame(() => {
      dialogRef.current
        ?.querySelector(`[data-expense-step="${step}"] ${FOCUSABLE_SELECTOR}`)
        ?.focus?.({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [isGuideSimulation, open, step]);

  if (!open) return null;

  const emitInputChange = (element, nextValue) => {
    element?.props?.onChange?.({ target: { value: nextValue } });
  };

  const moveToAmount = () => {
    setInlineError("");
    setStep(MANUAL_EXPENSE_STEPS.AMOUNT);
  };

  const moveToBudget = () => {
    setInlineError("");
    setStep(MANUAL_EXPENSE_STEPS.BUDGET);
  };

  const moveToWallet = () => {
    setInlineError("");
    setStep(MANUAL_EXPENSE_STEPS.WALLET);
  };

  const handleBack = () => {
    setInlineError("");
    if (step === MANUAL_EXPENSE_STEPS.BUDGET) {
      setStep(MANUAL_EXPENSE_STEPS.AMOUNT);
    } else if (step === MANUAL_EXPENSE_STEPS.REASON) {
      setStep(MANUAL_EXPENSE_STEPS.BUDGET);
    } else if (step === MANUAL_EXPENSE_STEPS.WALLET) {
      setStep(
        needsReason
          ? MANUAL_EXPENSE_STEPS.REASON
          : MANUAL_EXPENSE_STEPS.BUDGET
      );
    } else if (step === MANUAL_EXPENSE_STEPS.CONFIRM) {
      setStep(MANUAL_EXPENSE_STEPS.WALLET);
    }
  };

  const handleAmountContinue = () => {
    if (!validAmount) {
      setInlineError("Enter an amount greater than zero.");
      return;
    }
    setInlineError("");
    setStep(MANUAL_EXPENSE_STEPS.BUDGET);
  };

  const handleBudgetSelection = (option) => {
    if (option.disabled) {
      option.onDisabledClick?.();
      return;
    }

    budgetDropdown?.props?.onChange?.(option.value, option);
    setInlineError("");
    setStep(
      option.value === "__unplanned__" || option.value === "__undocumented__"
        ? MANUAL_EXPENSE_STEPS.REASON
        : MANUAL_EXPENSE_STEPS.WALLET
    );
  };

  const handleReasonContinue = () => {
    if (isUnplanned && !unplannedReason) {
      setInlineError("Add a short reason before continuing.");
      return;
    }

    if (isUndocumented && !undocumentedReason) {
      setInlineError("Choose the closest undocumented reason.");
      return;
    }

    moveToWallet();
  };

  const handleWalletSelection = (option) => {
    walletDropdown?.props?.onChange?.(option.value, option);
    setInlineError("");
    setStep(MANUAL_EXPENSE_STEPS.CONFIRM);
  };

  const handleSubmit = (event) => {
    if (isGuideSimulation) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onSubmit?.(event);
  };

  const renderSummaries = () => (
    <div className="space-y-2">
      {step !== MANUAL_EXPENSE_STEPS.AMOUNT && validAmount ? (
        <SummaryRow
          icon={CircleDollarSign}
          label="Amount"
          value={formatMoney(amount)}
          onEdit={moveToAmount}
        />
      ) : null}

      {[
        MANUAL_EXPENSE_STEPS.REASON,
        MANUAL_EXPENSE_STEPS.WALLET,
        MANUAL_EXPENSE_STEPS.CONFIRM,
      ].includes(step) && selectedBudget ? (
        <SummaryRow
          icon={ReceiptText}
          label="Budget"
          value={selectedBudget.label}
          onEdit={moveToBudget}
        />
      ) : null}

      {step === MANUAL_EXPENSE_STEPS.CONFIRM && selectedWallet ? (
        <SummaryRow
          icon={WalletCards}
          label="Wallet"
          value={selectedWallet.label}
          onEdit={moveToWallet}
        />
      ) : null}
    </div>
  );

  const renderAmountStep = () => (
    <section data-expense-step={MANUAL_EXPENSE_STEPS.AMOUNT}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/50">
        First, the amount
      </p>
      <h3 className="mt-2 text-[23px] font-black leading-tight tracking-[-0.035em] text-white">
        How much did you spend?
      </h3>
      <p className="mt-2 text-[12px] font-semibold leading-5 text-white/48">
        Enter the exact amount before choosing where it belongs.
      </p>

      <div className="relative mt-5 overflow-hidden rounded-[24px] border border-cyan-200/16 bg-black/[0.16] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_34px_rgba(0,0,0,0.18)]">
        <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[28px] font-black text-cyan-100/66">
          ₱
        </span>
        <input
          data-manual-expense-initial-focus="true"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={amountValue}
          onChange={(event) => {
            const nextValue = event.target.value;
            if (nextValue === "" || Number(nextValue) >= 0) {
              emitInputChange(amountInput, nextValue);
              setInlineError("");
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleAmountContinue();
            }
          }}
          placeholder="0"
          aria-label="Expense amount"
          className="min-h-[82px] w-full bg-transparent py-4 pl-14 pr-5 text-[38px] font-black tracking-[-0.05em] text-white outline-none placeholder:text-white/18 focus:bg-white/[0.025]"
        />
      </div>

      <button
        type="button"
        onClick={handleAmountContinue}
        disabled={loading}
        className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[19px] bg-gradient-to-r from-emerald-400 via-emerald-500 to-cyan-500 px-4 text-sm font-black text-slate-950 shadow-[0_14px_34px_rgba(16,185,129,0.20)] transition hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/70 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
      >
        Continue
        <ChevronRight className="h-4 w-4" />
      </button>
    </section>
  );

  const renderBudgetStep = () => (
    <section data-expense-step={MANUAL_EXPENSE_STEPS.BUDGET}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/50">
        Next, place it correctly
      </p>
      <h3 className="mt-2 text-[23px] font-black leading-tight tracking-[-0.035em] text-white">
        Where should {formatMoney(amount)} go?
      </h3>
      <p className="mt-2 text-[12px] font-semibold leading-5 text-white/48">
        Choose the budget category that should absorb this expense.
      </p>

      <div
        role="listbox"
        aria-label="Budget categories"
        className="mt-5 max-h-[min(320px,42dvh)] space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {budgetOptions.length ? (
          budgetOptions.map((option) => {
            const selected = String(option.value) === budgetValue;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={option.disabled}
                onClick={() => handleBudgetSelection(option)}
                className={`flex min-h-[62px] w-full items-center gap-3 rounded-[19px] border px-3.5 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/50 disabled:cursor-not-allowed disabled:opacity-45 ${getToneClasses(
                  option.tone,
                  selected
                )}`}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[13px] border border-white/[0.08] bg-black/[0.12] text-cyan-100/72">
                  <ReceiptText className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-black text-white/92">
                    {option.label}
                  </span>
                  {option.subtitle ? (
                    <span className="mt-1 block truncate text-[10px] font-semibold text-white/45">
                      {option.subtitle}
                    </span>
                  ) : null}
                </span>
                {selected ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-200" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/24" />
                )}
              </button>
            );
          })
        ) : (
          <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.035] px-4 py-5 text-center text-[12px] font-semibold text-white/48">
            No budget categories are available yet.
          </div>
        )}
      </div>
    </section>
  );

  const renderReasonStep = () => (
    <section data-expense-step={MANUAL_EXPENSE_STEPS.REASON}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/55">
        One quick clarification
      </p>
      <h3 className="mt-2 text-[23px] font-black leading-tight tracking-[-0.035em] text-white">
        {isUnplanned
          ? "What is this expense for?"
          : "Why is this expense undocumented?"}
      </h3>
      <p className="mt-2 text-[12px] font-semibold leading-5 text-white/48">
        {isUnplanned
          ? "This sits outside your active plan, so give CLARA a clear reason."
          : "Choose the closest reason so your records remain understandable."}
      </p>

      {isUnplanned ? (
        <textarea
          data-manual-expense-initial-focus="true"
          rows={4}
          value={unplannedTextarea?.props?.value || ""}
          onChange={(event) => {
            emitInputChange(unplannedTextarea, event.target.value);
            setInlineError("");
          }}
          placeholder={unplannedTextarea?.props?.placeholder || "What is this for?"}
          className="mt-5 min-h-[118px] w-full resize-none rounded-[22px] border border-amber-200/14 bg-amber-300/[0.055] px-4 py-3.5 text-[14px] font-semibold leading-6 text-white outline-none placeholder:text-white/25 focus:border-amber-200/32 focus:ring-2 focus:ring-amber-200/10"
        />
      ) : (
        <div
          role="listbox"
          aria-label="Undocumented spending reasons"
          className="mt-5 max-h-[min(280px,38dvh)] space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {(undocumentedDropdown?.props?.options || []).map((option) => {
            const selected = String(option.value) === undocumentedReason;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  undocumentedDropdown?.props?.onChange?.(option.value, option);
                  setInlineError("");
                }}
                className={`flex min-h-[52px] w-full items-center justify-between gap-3 rounded-[18px] border px-3.5 py-3 text-left text-[12px] font-black text-white/82 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/50 ${getToneClasses(
                  option.tone,
                  selected
                )}`}
              >
                <span>{option.label}</span>
                {selected ? <Check className="h-4 w-4 text-cyan-200" /> : null}
              </button>
            );
          })}
        </div>
      )}

      {isUndocumented &&
      undocumentedReason === "Other undocumented reason" ? (
        <input
          type="text"
          value={undocumentedNoteInput?.props?.value || ""}
          onChange={(event) =>
            emitInputChange(undocumentedNoteInput, event.target.value)
          }
          placeholder="Optional short note"
          className="mt-3 min-h-[52px] w-full rounded-[18px] border border-white/[0.09] bg-white/[0.045] px-4 text-[13px] font-semibold text-white outline-none placeholder:text-white/25 focus:border-cyan-200/28 focus:ring-2 focus:ring-cyan-200/10"
        />
      ) : null}

      <button
        type="button"
        onClick={handleReasonContinue}
        disabled={loading}
        className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[19px] bg-gradient-to-r from-emerald-400 via-emerald-500 to-cyan-500 px-4 text-sm font-black text-slate-950 shadow-[0_14px_34px_rgba(16,185,129,0.20)] transition hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/70 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
      >
        Continue
        <ChevronRight className="h-4 w-4" />
      </button>
    </section>
  );

  const renderWalletStep = () => (
    <section data-expense-step={MANUAL_EXPENSE_STEPS.WALLET}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/50">
        Finally, choose the source
      </p>
      <h3 className="mt-2 text-[23px] font-black leading-tight tracking-[-0.035em] text-white">
        Which wallet did you use?
      </h3>
      <p className="mt-2 text-[12px] font-semibold leading-5 text-white/48">
        CLARA will show the expected balance after this expense.
      </p>

      <div
        role="listbox"
        aria-label="Expense wallets"
        className="mt-5 max-h-[min(300px,40dvh)] space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {walletOptions.map((option) => {
          const selected = String(option.value) === walletValue;
          const balance = readMoney(option.subtitle);
          const projected = balance - (validAmount ? amount : 0);
          const insufficient = projected < 0;

          return (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => handleWalletSelection(option)}
              className={`flex min-h-[72px] w-full items-center gap-3 rounded-[20px] border px-3.5 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/50 ${
                insufficient
                  ? "border-rose-300/18 bg-rose-400/[0.065]"
                  : getToneClasses(option.tone, selected)
              }`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-cyan-200/12 bg-cyan-300/[0.07] text-cyan-100/80">
                <WalletCards className="h-4.5 w-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-black text-white/92">
                  {option.label}
                </span>
                <span className="mt-1 block truncate text-[10px] font-semibold text-white/46">
                  {option.subtitle || `${formatMoney(balance)} available`}
                </span>
                <span
                  className={`mt-1 block truncate text-[10px] font-black ${
                    insufficient ? "text-rose-200" : "text-emerald-200/78"
                  }`}
                >
                  {insufficient
                    ? `${formatMoney(Math.abs(projected))} short`
                    : `${formatMoney(projected)} after expense`}
                </span>
              </span>
              {selected ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-200" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-white/24" />
              )}
            </button>
          );
        })}
      </div>

      {walletOptions.length === 1 && selectedWallet ? (
        <button
          type="button"
          onClick={() => setStep(MANUAL_EXPENSE_STEPS.CONFIRM)}
          className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[19px] bg-gradient-to-r from-emerald-400 via-emerald-500 to-cyan-500 px-4 text-sm font-black text-slate-950 shadow-[0_14px_34px_rgba(16,185,129,0.20)] transition hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/70 active:scale-[0.99]"
        >
          Continue
          <ChevronRight className="h-4 w-4" />
        </button>
      ) : null}
    </section>
  );

  const renderConfirmStep = () => {
    const walletBalance = readMoney(selectedWallet?.subtitle);
    const projectedBalance = walletBalance - (validAmount ? amount : 0);
    const insufficient = selectedWallet && projectedBalance < 0;

    return (
      <section data-expense-step={MANUAL_EXPENSE_STEPS.CONFIRM}>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/55">
          Ready to record
        </p>
        <h3 className="mt-2 text-[23px] font-black leading-tight tracking-[-0.035em] text-white">
          Confirm this expense
        </h3>

        <div className="relative mt-5 overflow-hidden rounded-[26px] border border-emerald-200/14 bg-[radial-gradient(circle_at_20%_0%,rgba(52,211,153,0.12),transparent_42%),rgba(255,255,255,0.035)] p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_42px_rgba(0,0,0,0.20)]">
          <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-cyan-300/[0.08] blur-3xl" />
          <p className="relative text-[38px] font-black leading-none tracking-[-0.055em] text-emerald-100">
            {formatMoney(amount)}
          </p>
          <p className="relative mt-3 text-[13px] font-black text-white/86">
            {selectedBudget?.label || "Budget category"}
          </p>
          <p className="relative mt-1 text-[11px] font-semibold text-white/46">
            Paid from {selectedWallet?.label || "selected wallet"}
          </p>
        </div>

        {selectedWallet ? (
          <div
            className={`mt-3 flex items-start gap-2.5 rounded-[18px] border px-3.5 py-3 ${
              insufficient
                ? "border-rose-300/18 bg-rose-400/[0.07] text-rose-100"
                : "border-emerald-300/14 bg-emerald-400/[0.055] text-emerald-100"
            }`}
          >
            {insufficient ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <Check className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p className="text-[11px] font-semibold leading-5">
              {insufficient
                ? `${selectedWallet.label} is ${formatMoney(
                    Math.abs(projectedBalance)
                  )} short for this expense.`
                : `${selectedWallet.label} will have ${formatMoney(
                    projectedBalance
                  )} remaining after this expense.`}
            </p>
          </div>
        ) : null}

        {!isGuideSimulation ? (
          <button
            type="submit"
            disabled={submitDisabled || loading}
            className="mt-5 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-[19px] bg-gradient-to-r from-emerald-400 via-emerald-500 to-cyan-500 px-4 text-sm font-black text-slate-950 shadow-[0_16px_38px_rgba(16,185,129,0.22)] transition hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/70 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Saving..." : `Log ${formatMoney(amount)} Expense`}
          </button>
        ) : (
          <div className="mt-5 rounded-[18px] border border-cyan-200/14 bg-cyan-300/[0.06] px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.12em] text-cyan-100/72">
            Preview only
          </div>
        )}
      </section>
    );
  };

  const renderActiveStep = () => {
    if (!legacyShapeReady) {
      return (
        <div className="space-y-4">
          {children}
          {!isGuideSimulation ? (
            <button
              type="submit"
              disabled={submitDisabled || loading}
              className="min-h-[52px] w-full rounded-[18px] bg-emerald-500 px-4 text-sm font-black text-white disabled:opacity-40"
            >
              {loading ? "Saving..." : "Add Expense"}
            </button>
          ) : null}
        </div>
      );
    }

    if (step === MANUAL_EXPENSE_STEPS.AMOUNT) return renderAmountStep();
    if (step === MANUAL_EXPENSE_STEPS.BUDGET) return renderBudgetStep();
    if (step === MANUAL_EXPENSE_STEPS.REASON) return renderReasonStep();
    if (step === MANUAL_EXPENSE_STEPS.WALLET) return renderWalletStep();
    return renderConfirmStep();
  };

  const sheet = (
    <div
      className={`clara-manual-expense-sheet fixed inset-0 ${
        isGuideSimulation ? "z-[260]" : "z-[160]"
      } flex items-end justify-center bg-[#010711]/78 text-white backdrop-blur-md sm:items-center sm:p-4`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) effectiveClose?.();
      }}
      data-clara-guide-orb-preview={isGuideSimulation ? "true" : undefined}
      data-clara-guide-manual-expense-preview={
        isGuideSimulation ? "true" : undefined
      }
    >
      <style>{`
        .clara-manual-expense-sheet input,
        .clara-manual-expense-sheet textarea,
        .clara-manual-expense-sheet select { font-size: 16px; }
        @keyframes claraManualExpenseStepIn {
          from { opacity: 0; transform: translate3d(0, 8px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .clara-manual-expense-sheet *,
          .clara-manual-expense-sheet *::before,
          .clara-manual-expense-sheet *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-expense-title"
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
        className="relative flex max-h-[85dvh] w-full max-w-[410px] flex-col overflow-hidden rounded-t-[32px] border border-cyan-100/[0.12] bg-[radial-gradient(circle_at_0%_0%,rgba(20,184,166,0.18),transparent_34%),radial-gradient(circle_at_100%_0%,rgba(124,58,237,0.18),transparent_38%),linear-gradient(180deg,rgba(7,20,35,0.985),rgba(3,10,22,0.995))] shadow-[0_-20px_80px_rgba(0,0,0,0.48),0_0_42px_rgba(34,211,238,0.07)] transition-[height,max-height] duration-300 sm:max-h-[82dvh] sm:rounded-[32px]"
      >
        <div className="pointer-events-none absolute -left-24 top-0 h-52 w-52 rounded-full bg-emerald-300/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-56 w-56 rounded-full bg-violet-400/[0.09] blur-3xl" />

        <header className="relative z-10 flex shrink-0 items-start gap-3 border-b border-white/[0.065] px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] sm:pt-4">
          {step !== MANUAL_EXPENSE_STEPS.AMOUNT && !isGuideSimulation ? (
            <button
              type="button"
              onClick={handleBack}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-white/[0.10] bg-white/[0.05] text-white/64 transition hover:bg-white/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/50"
              aria-label="Go to previous expense step"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center rounded-full border border-emerald-200/16 bg-emerald-300/[0.08] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-emerald-100/78">
              Manual Log
            </div>
            <h2
              id="manual-expense-title"
              className="mt-2 text-[19px] font-black tracking-[-0.025em] text-white"
            >
              Log expense
            </h2>
            <ProgressIndicator
              current={currentStepNumber}
              total={totalSteps}
            />
          </div>

          <button
            type="button"
            onClick={effectiveClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-white/[0.10] bg-white/[0.05] text-white/64 transition hover:bg-white/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/50"
            aria-label={
              isGuideSimulation
                ? "Close guide log expense preview"
                : "Close log expense"
            }
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </header>

        <div
          className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          inert={isGuideSimulation ? "" : undefined}
          aria-disabled={isGuideSimulation || undefined}
        >
          <div aria-live="polite" className="sr-only">
            Step {currentStepNumber} of {totalSteps}
          </div>

          {legacyShapeReady ? renderSummaries() : null}

          <div
            key={step}
            className={`${
              legacyShapeReady && step !== MANUAL_EXPENSE_STEPS.AMOUNT
                ? "mt-4"
                : ""
            } animate-[claraManualExpenseStepIn_180ms_ease-out]`}
          >
            {renderActiveStep()}
          </div>

          {inlineError ? (
            <p
              role="alert"
              className="mt-3 rounded-[16px] border border-rose-300/16 bg-rose-400/[0.07] px-3.5 py-2.5 text-[11px] font-bold leading-5 text-rose-100"
            >
              {inlineError}
            </p>
          ) : null}
        </div>

        {isGuideSimulation ? (
          <footer className="relative z-10 shrink-0 border-t border-white/[0.065] bg-black/[0.16] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
            <p className="rounded-[16px] border border-cyan-200/14 bg-cyan-200/[0.055] px-3 py-2.5 text-center text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100">
              {guideSimulation.safetyMessage}
            </p>
            <button
              type="button"
              data-clara-guide-orb-preview-next="true"
              onClick={guideSimulation.onNext}
              className="mt-2.5 min-h-[46px] w-full rounded-[17px] border border-cyan-100/24 bg-[linear-gradient(135deg,rgba(207,250,254,0.16),rgba(103,232,249,0.09)_48%,rgba(129,140,248,0.12))] px-4 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-50 shadow-[0_12px_30px_rgba(2,8,23,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/70"
            >
              {guideSimulation.nextLabel}
            </button>
          </footer>
        ) : (
          <div className="h-[max(10px,env(safe-area-inset-bottom))] shrink-0" />
        )}
      </form>
    </div>
  );

  if (typeof document === "undefined") return sheet;
  return createPortal(sheet, document.body);
}
