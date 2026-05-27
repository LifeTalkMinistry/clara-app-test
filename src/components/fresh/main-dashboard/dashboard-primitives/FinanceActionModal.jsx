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
import WalletProviderPicker from "@/components/financial-carousel/cards/wallet/ui/WalletProviderPicker";
import { getWalletProvider } from "@/components/financial-carousel/cards/wallet/logic/walletProviderRegistry";

const MONEY_ACTION_TITLES = new Set(["Add money", "Transfer money"]);
const BUDGET_SETUP_TITLES = new Set([
  "Declare monthly budget",
  "Edit budget category",
  "Budget discipline mode",
]);
const CREATE_WALLET_TITLE = "Where will your money live?";

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

function getDisplayTitle(title) {
  if (title === "Budget discipline mode") return "Monthly Budget Plan";
  if (title === "Declare monthly budget") return "Monthly Budget";
  if (title === "Edit budget category") return "Edit Category";
  return title;
}

function getDisplayDescription(title, description) {
  const text = String(description || "").trim();

  if (BUDGET_SETUP_TITLES.has(title)) {
    if (title === "Budget discipline mode") return "Assign your budget into categories.";
    if (title === "Declare monthly budget") return "Set the money you plan to spend.";
    if (title === "Edit budget category") return "Update this category allocation.";
  }

  if (title === CREATE_WALLET_TITLE) {
    return "Choose a bank, e-wallet, or custom money container.";
  }

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

function findFirstElement(node, predicate) {
  if (!isValidElement(node)) return null;
  if (predicate(node)) return node;

  const nested = Children.toArray(node.props?.children);

  for (const child of nested) {
    const result = findFirstElement(child, predicate);
    if (result) return result;
  }

  return null;
}

function walletNeedsCustomName(provider) {
  return provider?.key === "custom";
}

function makeFieldHidden(element, hidden, helper) {
  if (!isValidElement(element)) return element;

  return cloneElement(element, {
    hidden,
    helper,
  });
}

function makeCreateWalletStartingBalanceField(element) {
  if (!isValidElement(element)) return element;

  const inputElement = findFirstElement(
    element,
    (node) => node.type === "input" && node.props?.type === "number"
  );

  if (!inputElement) return element;

  const styledInput = cloneElement(inputElement, {
    placeholder: "0",
    className:
      "min-h-[62px] w-full rounded-[24px] border border-white/[0.12] bg-white/[0.045] py-4 pl-11 pr-5 text-[18px] font-semibold text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_34px_rgba(0,0,0,0.12)] transition placeholder:text-white/32 focus:border-emerald-300/35 focus:bg-white/[0.06] focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_0_0_3px_rgba(16,185,129,0.10),0_18px_34px_rgba(0,0,0,0.14)]",
  });

  return cloneElement(
    element,
    {
      label: "Starting balance",
      helper: "",
    },
    <div className="relative">
      <span className="pointer-events-none absolute left-5 top-1/2 z-10 -translate-y-1/2 text-sm font-black text-emerald-100/72">
        ₱
      </span>

      {styledInput}
    </div>
  );
}

function setWalletNameInput(formElement, value) {
  const input = formElement?.querySelector?.('input[type="text"]');
  if (!input) return;

  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set;

  if (nativeSetter) {
    nativeSetter.call(input, value);
  } else {
    input.value = value;
  }

  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function ClaraMoneyAmountHero({ label, helper, value, hiddenInput }) {
  return (
    <div className="relative rounded-[26px] border border-white/14 bg-[linear-gradient(135deg,rgba(10,48,68,0.96),rgba(19,18,78,0.98))] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_32px_rgba(0,0,0,0.16)]">
      <div className="relative flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/62">
          {label || "Amount"}
        </span>

        <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-white/48">
          CLARA input
        </span>
      </div>

      <div className="relative mt-2 flex min-h-[70px] items-center justify-center rounded-[22px] border border-white/8 bg-black/10 px-5 py-1.5">
        {hiddenInput}

        <div className="max-w-full whitespace-nowrap text-center text-[36px] font-black leading-[1.12] tracking-[-0.035em] text-white antialiased">
          ₱{value || "0"}
        </div>
      </div>

      {helper ? (
        <p className="relative mt-2 text-[11px] font-semibold leading-4 text-white/62">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function ClaraMoneyKeypad({ value, onChange }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "backspace"];

  return (
    <div className="mt-2 rounded-[22px] border border-cyan-100/12 bg-white/[0.04] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_30px_rgba(0,0,0,0.15)] backdrop-blur-xl">
      <div className="mb-1.5 flex items-center justify-between gap-3 px-1">
        <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/42">
          Numeric pad
        </span>

        <button
          type="button"
          onClick={() => onChange("")}
          className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-0.5 text-[9px] font-semibold text-white/55 transition hover:bg-white/[0.07] active:scale-[0.97]"
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
            className="flex h-[28px] items-center justify-center rounded-[16px] border border-white/12 bg-white/[0.07] text-[14px] font-black text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-white/[0.105] active:scale-[0.97] active:bg-emerald-400/18"
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
  const isBudgetSetupModal = BUDGET_SETUP_TITLES.has(title);
  const isCreateWalletModal = title === CREATE_WALLET_TITLE;
  const displayTitle = getDisplayTitle(title);
  const displayDescription = getDisplayDescription(title, description);

  const {
    modalChildren,
    moneyFieldLabel,
    moneyFieldHelper,
    hiddenMoneyInput,
  } = useMemo(() => {
    const childItems = Children.toArray(children);

    if (isCreateWalletModal) {
      const walletTypeField = childItems.find(
        (child) => isValidElement(child) && child.props?.label === "Wallet type"
      );
      const selectElement = findFirstElement(walletTypeField, (node) => node.type === "select");
      const selectedValue = selectElement?.props?.value || "cash";
      const selectedProvider = getWalletProvider(selectedValue, selectedValue);
      const showWalletName = walletNeedsCustomName(selectedProvider);

      return {
        modalChildren: childItems.map((child) => {
          if (!isValidElement(child)) return child;

          if (child.props?.label === "Wallet name") {
            return makeFieldHidden(
              child,
              !showWalletName,
              showWalletName ? "Name this custom wallet." : ""
            );
          }

          if (child.props?.label === "Starting balance") {
            return makeCreateWalletStartingBalanceField(child);
          }

          if (child.props?.label !== "Wallet type") return child;

          return cloneElement(
            child,
            {
              label: "Choose wallet identity",
              helper: showWalletName ? "Custom wallets need a name before creating." : "",
            },
            <WalletProviderPicker
              selectedProviderKey={selectedValue}
              disabled={loading}
              compact
              onSelect={(provider) => {
                selectElement?.props?.onChange?.({
                  target: { value: provider.key },
                  currentTarget: { value: provider.key },
                });

                const nextName = walletNeedsCustomName(provider)
                  ? ""
                  : provider.defaultWalletName || provider.label || "Wallet";

                window.requestAnimationFrame(() => {
                  setWalletNameInput(formRef.current, nextName);
                });
              }}
            />
          );
        }),
        moneyFieldLabel: "Amount",
        moneyFieldHelper: "",
        hiddenMoneyInput: null,
      };
    }

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
  }, [children, isCreateWalletModal, loading, usesClaraMoneyKeypad]);

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
    if (!open || !isCreateWalletModal) return undefined;

    const frame = window.requestAnimationFrame(() => {
      const select = formRef.current?.querySelector("select");
      const selectedProvider = getWalletProvider(select?.value || "cash", select?.value || "cash");

      if (!walletNeedsCustomName(selectedProvider)) {
        setWalletNameInput(
          formRef.current,
          selectedProvider.defaultWalletName || selectedProvider.label || "Wallet"
        );
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, isCreateWalletModal]);

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

  const modalShellClassName = isCreateWalletModal
    ? "relative z-[200] flex max-h-[calc(100svh-1rem)] w-full max-w-[430px] overflow-visible rounded-[38px] border border-cyan-100/[0.16] bg-[radial-gradient(circle_at_12%_0%,rgba(45,212,191,0.18),transparent_42%),radial-gradient(circle_at_100%_3%,rgba(129,140,248,0.16),transparent_38%),linear-gradient(140deg,rgba(5,28,48,0.99),rgba(7,16,44,0.995)_48%,rgba(34,15,73,0.995))] shadow-[0_32px_100px_rgba(0,0,0,0.68),0_0_0_1px_rgba(255,255,255,0.07),0_0_70px_rgba(34,211,238,0.12)]"
    : "relative z-[200] flex max-h-[calc(100svh-1.25rem)] w-full max-w-[402px] overflow-visible rounded-[34px] border border-cyan-100/[0.18] bg-[radial-gradient(circle_at_50%_0%,rgba(20,184,166,0.14),transparent_42%),linear-gradient(135deg,rgba(5,44,62,0.99),rgba(7,20,48,0.995)_48%,rgba(38,16,77,0.995))] shadow-[0_28px_90px_rgba(0,0,0,0.62),0_0_0_1px_rgba(255,255,255,0.08),0_0_54px_rgba(34,211,238,0.12)]";

  const formClassName = isCreateWalletModal
    ? "flex max-h-[calc(100svh-1rem)] min-h-0 w-full flex-col overflow-visible"
    : "flex max-h-[calc(100svh-1.25rem)] min-h-0 w-full flex-col overflow-visible";

  const headerClassName = isBudgetSetupModal
    ? "shrink-0 border-b border-white/10 bg-white/[0.03] px-5 py-3"
    : isCreateWalletModal
      ? "shrink-0 border-b border-white/[0.07] bg-[linear-gradient(135deg,rgba(20,184,166,0.10),rgba(99,102,241,0.10))] px-5 pb-5 pt-6"
      : "shrink-0 border-b border-white/10 bg-white/[0.035] px-5 py-3.5";

  const titleClassName = isBudgetSetupModal
    ? "text-[22px] font-black leading-[1.05] tracking-[-0.035em] text-white"
    : isCreateWalletModal
      ? "max-w-[310px] text-[34px] font-black leading-[0.98] tracking-[-0.055em] text-white drop-shadow-[0_2px_18px_rgba(255,255,255,0.08)]"
      : "text-[28px] font-black tracking-[-0.04em] text-white";

  const descriptionClassName = isCreateWalletModal
    ? "mt-3 max-w-[295px] text-[14px] font-semibold leading-6 text-cyan-50/64"
    : "mt-1 max-w-[270px] text-[13px] font-semibold leading-5 text-white/64";

  const closeButtonClassName = isBudgetSetupModal
    ? "mt-0.5 shrink-0 rounded-full border border-white/15 bg-white/[0.075] p-2.5 text-white/70 transition hover:bg-white/10 hover:text-white"
    : isCreateWalletModal
      ? "mt-0.5 shrink-0 rounded-full border border-white/15 bg-white/[0.07] p-3 text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_12px_30px_rgba(0,0,0,0.20)] transition hover:bg-white/10 hover:text-white active:scale-95"
      : "mt-1 shrink-0 rounded-full border border-white/15 bg-white/[0.075] p-3 text-white/70 transition hover:bg-white/10 hover:text-white";

  const scrollBodyClassName = isBudgetSetupModal
    ? "relative z-[220] min-h-0 max-h-[calc(100svh-8rem)] space-y-2.5 overflow-y-auto overflow-x-visible overscroll-contain px-5 py-2.5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    : isCreateWalletModal
      ? "relative z-[220] min-h-0 max-h-[calc(100svh-14rem)] space-y-4 overflow-y-auto overflow-x-visible overscroll-contain px-5 py-4 pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_label>span]:text-[11px] [&_label>span]:font-black [&_label>span]:uppercase [&_label>span]:tracking-[0.18em] [&_label>span]:text-white/58 [&_label>p]:text-[11px] [&_label>p]:font-semibold [&_label>p]:text-white/50"
      : "relative z-[220] min-h-0 max-h-[calc(100svh-10rem)] space-y-3 overflow-y-auto overflow-x-visible overscroll-contain px-5 py-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

  const footerClassName = isCreateWalletModal
    ? "shrink-0 border-t border-white/[0.06] bg-[#050c1c]/80 px-5 pb-[calc(0.85rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur-2xl"
    : "shrink-0 border-t border-white/10 bg-[#071120]/92 px-5 pb-[calc(0.65rem+env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-xl";

  const submitButtonClassName = `w-full transition disabled:cursor-not-allowed disabled:opacity-55 ${
    isCreateWalletModal
      ? `rounded-[24px] px-5 py-4 text-[16px] font-black text-white shadow-[0_18px_48px_rgba(16,185,129,0.26),0_0_32px_rgba(45,212,191,0.18)] ${
          danger
            ? "bg-gradient-to-r from-rose-500 to-red-600"
            : submitDisabled
              ? "border border-white/15 bg-white/[0.09] text-white/55 shadow-none"
              : "bg-gradient-to-r from-emerald-300 via-emerald-400 to-green-600 hover:shadow-[0_20px_54px_rgba(16,185,129,0.34),0_0_36px_rgba(45,212,191,0.22)] active:scale-[0.985]"
        }`
      : `rounded-2xl px-4 py-3 text-base font-semibold text-white ${
          danger
            ? "bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_10px_30px_rgba(244,63,94,0.24)]"
            : submitDisabled
              ? "border border-white/15 bg-white/[0.09] text-white/55 shadow-none"
              : "bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 shadow-[0_10px_30px_rgba(16,185,129,0.24)]"
        }`
  }`;

  return (
    <div className="fixed inset-0 z-[120] flex min-h-[100svh] items-start justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_20%,rgba(15,23,42,0.42),rgba(2,6,23,0.72)_54%,rgba(2,6,23,0.86))] px-1.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-0 backdrop-blur-[16px]">
      <div className={modalShellClassName}>
        <form
          ref={formRef}
          onSubmit={onSubmit}
          className={formClassName}
        >
          <div className={headerClassName}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {isBudgetSetupModal ? (
                  <p className="mb-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/55">
                    Budget setup
                  </p>
                ) : null}

                <h3 className={titleClassName}>{displayTitle}</h3>

                {displayDescription ? (
                  <p className={descriptionClassName}>
                    {displayDescription}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={onClose}
                className={closeButtonClassName}
                aria-label="Close modal"
              >
                <X className={isBudgetSetupModal ? "h-4 w-4" : "h-5 w-5"} />
              </button>
            </div>
          </div>

          <div className={scrollBodyClassName}>
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

          <div className={footerClassName}>
            <button
              type="submit"
              disabled={submitDisabled || loading}
              className={submitButtonClassName}
            >
              {loading ? "Saving..." : submitDisabled ? "Insufficient Funds" : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
