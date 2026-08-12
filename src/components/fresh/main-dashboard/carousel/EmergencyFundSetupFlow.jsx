import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronRight, Shield, Wallet, X } from "lucide-react";

const noop = () => {};
export const EmergencyFundCreateWalletContext = createContext(noop);
const DEFAULT_TARGET_MONTHS = [3, 6, 12];

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[₱,\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getWalletId(wallet = {}) {
  return String(wallet?.id || wallet?.wallet_id || wallet?.walletId || wallet?.uuid || "").trim();
}

function getWalletName(wallet = {}) {
  return String(wallet?.name || wallet?.title || wallet?.wallet_name || wallet?.label || "Wallet").trim() || "Wallet";
}

function getWalletBalance(wallet = {}) {
  return toNumber(
    wallet?.spendableBalance ??
      wallet?.spendable_balance ??
      wallet?.available_balance ??
      wallet?.derived_balance ??
      wallet?.balance ??
      wallet?.current_balance ??
      wallet?.wallet_balance ??
      wallet?.amount ??
      0
  );
}

const targetOptions = [
  { months: 3, label: "Basic Safety" },
  { months: 6, label: "Strong Stability" },
  { months: 12, label: "Full Protection" },
];

export default function EmergencyFundSetupFlow({
  open = false,
  onClose = noop,
  safeWallets = [],
  validTargetMonths = DEFAULT_TARGET_MONTHS,
  onComplete = noop,
  onCreateWallet = noop,
  fmt = (value) => `₱${Number(value || 0).toLocaleString("en-PH")}`,
  saving = false,
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [monthlySurvivalCost, setMonthlySurvivalCost] = useState("");
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [targetMonths, setTargetMonths] = useState(3);
  const [error, setError] = useState("");
  const [localSaving, setLocalSaving] = useState(false);

  const allowedTargetMonths = useMemo(
    () => (Array.isArray(validTargetMonths) && validTargetMonths.length ? validTargetMonths : DEFAULT_TARGET_MONTHS),
    [validTargetMonths]
  );

  const wallets = useMemo(
    () =>
      (Array.isArray(safeWallets) ? safeWallets : [])
        .map((wallet) => ({
          ...wallet,
          id: getWalletId(wallet),
          name: getWalletName(wallet),
          balance: getWalletBalance(wallet),
        }))
        .filter((wallet) => wallet.id),
    [safeWallets]
  );

  const selectedWallet = useMemo(
    () => wallets.find((wallet) => wallet.id === selectedWalletId) || null,
    [selectedWalletId, wallets]
  );

  const numericMonthlyCost = toNumber(monthlySurvivalCost);
  const targetAmount = numericMonthlyCost * targetMonths;
  const isBusy = saving || localSaving;
  const contextCreateWallet = useContext(EmergencyFundCreateWalletContext);
  const handleCreateWallet = onCreateWallet !== noop ? onCreateWallet : contextCreateWallet;

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setMonthlySurvivalCost("");
    setSelectedWalletId("");
    setTargetMonths(3);
    setError("");
    setLocalSaving(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (selectedWalletId) return;
    if (wallets.length === 1) {
      setSelectedWalletId(wallets[0].id);
      setError("");
    }
  }, [open, wallets, selectedWalletId]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;

    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.dataset.claraEmergencyFundFlowOpen = "true";
    body.style.overflow = "hidden";

    return () => {
      delete body.dataset.claraEmergencyFundFlowOpen;
      body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const validateCurrentStep = () => {
    if (stepIndex === 0 && numericMonthlyCost <= 0) {
      setError("Enter a monthly survival cost greater than ₱0.");
      return false;
    }

    if (stepIndex === 1) {
      if (!wallets.length) {
        setError("Create or link a wallet first before setting up your Emergency Fund.");
        return false;
      }

      if (!selectedWalletId || !selectedWallet) {
        setError("Choose the wallet where CLARA should protect this fund.");
        return false;
      }
    }

    if (stepIndex === 2 && !allowedTargetMonths.includes(targetMonths)) {
      setError("Choose a valid protection goal.");
      return false;
    }

    setError("");
    return true;
  };

  const goNext = () => {
    if (!validateCurrentStep()) return;
    setStepIndex((current) => Math.min(current + 1, 3));
  };

  const goBack = () => {
    setError("");
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const handleSave = async () => {
    if (numericMonthlyCost <= 0) {
      setStepIndex(0);
      setError("Enter a monthly survival cost greater than ₱0.");
      return;
    }

    if (!selectedWalletId || !selectedWallet) {
      setStepIndex(1);
      setError("Choose the wallet where CLARA should protect this fund.");
      return;
    }

    if (!allowedTargetMonths.includes(targetMonths)) {
      setStepIndex(2);
      setError("Choose a valid protection goal.");
      return;
    }

    setLocalSaving(true);
    setError("");

    try {
      await onComplete({
        monthlySurvivalCost: numericMonthlyCost,
        walletId: selectedWalletId,
        walletName: selectedWallet.name,
        targetMonths,
      });
      onClose();
    } catch (err) {
      console.error("Unable to save emergency fund setup:", err);
      setError("CLARA could not save this setup yet. Try again.");
    } finally {
      setLocalSaving(false);
    }
  };

  const stepTitle = [
    "Monthly survival cost",
    "Storage wallet",
    "Protection months",
    "Setup summary",
  ][stepIndex];

  const modal = (
    <div
      data-clara-emergency-fund-flow="true"
      className="fixed inset-0 flex items-center justify-center px-3 py-[max(12px,env(safe-area-inset-top))]"
      style={{ zIndex: 2147483500 }}
    >
      <button
        type="button"
        aria-label="Close emergency fund setup"
        className="absolute inset-0 bg-[#020817]/90 backdrop-blur-[10px]"
        onClick={() => {
          if (!isBusy) onClose();
        }}
      />

      <section className="relative z-10 flex max-h-[calc(100dvh-24px)] w-full max-w-[390px] flex-col overflow-hidden rounded-[28px] border border-blue-300/25 bg-[linear-gradient(145deg,#0A3572_0%,#08275A_36%,#061B40_68%,#071126_100%)] text-white shadow-[0_28px_90px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.09)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-5 top-0 z-20 h-[2px] rounded-full"
          style={{
            background:
              "linear-gradient(90deg,#0867ff 0%,#0867ff 58%,#ffd84a 58%,#ffd84a 78%,#f32645 78%,#f32645 100%)",
          }}
        />
        <div className="pointer-events-none absolute -left-20 -top-20 h-52 w-52 rounded-full bg-[#0867ff]/20 blur-[72px]" />
        <div className="pointer-events-none absolute -right-20 -top-14 h-44 w-44 rounded-full bg-[#FCD116]/[0.06] blur-[70px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-20 h-60 w-60 rounded-full bg-[#CE1126]/[0.10] blur-[82px]" />

        <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-blue-200/[0.10] px-4 pb-3.5 pt-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-blue-300/25 bg-[linear-gradient(145deg,rgba(14,79,169,0.90),rgba(5,28,69,0.96))] text-[#FFD84A] shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_10px_24px_rgba(0,0,0,0.18)]">
              <Shield className="h-[18px] w-[18px]" />
            </div>
            <div>
              <p className="text-[16px] font-black tracking-[-0.025em] text-white">Emergency Fund</p>
              <p className="mt-0.5 text-[11px] font-semibold text-blue-100/48">{stepTitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-200/[0.14] bg-[#03142F]/80 text-blue-100/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-[#FFD84A]/35 hover:text-white disabled:opacity-50"
            aria-label="Close Emergency Fund setup"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
          <div className="mb-5 flex gap-1.5" aria-label={`Step ${stepIndex + 1} of 4`}>
            {[0, 1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-1.5 flex-1 rounded-full transition-all duration-200 ${
                  step < stepIndex
                    ? "bg-[#0867FF] shadow-[0_0_9px_rgba(8,103,255,0.20)]"
                    : step === stepIndex
                      ? "bg-[#FFD84A] shadow-[0_0_10px_rgba(255,216,74,0.24)]"
                      : "bg-[#020C20]/80 ring-1 ring-inset ring-blue-300/[0.08]"
                }`}
              />
            ))}
          </div>

          {stepIndex === 0 ? (
            <div className="space-y-5">
              <div>
                <p className="text-[20px] font-black leading-[1.15] tracking-[-0.03em] text-white">
                  How much do you need every month to survive?
                </p>
                <p className="mt-2.5 text-[13px] font-semibold leading-5 text-blue-50/68">
                  Include rent, food, bills, transport, debt minimums, and essentials only.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-[9px] font-black uppercase tracking-[0.18em] text-[#FFD84A]/80">
                  ₱ monthly essentials
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={monthlySurvivalCost}
                  onChange={(event) => {
                    setMonthlySurvivalCost(event.target.value);
                    setError("");
                  }}
                  placeholder="0"
                  className="w-full rounded-[17px] border border-blue-300/[0.18] bg-[#03132F]/92 px-4 py-4 text-lg font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-blue-100/30 focus:border-[#FFD84A]/45 focus:bg-[#051A3D] focus:shadow-[0_0_0_3px_rgba(8,103,255,0.08),inset_0_1px_0_rgba(255,255,255,0.05)]"
                  disabled={isBusy}
                />
              </div>
            </div>
          ) : null}

          {stepIndex === 1 ? (
            <div className="space-y-5">
              <div>
                <p className="text-[20px] font-black leading-[1.15] tracking-[-0.03em] text-white">
                  Where should CLARA protect this emergency fund?
                </p>
                <p className="mt-2.5 text-[13px] font-semibold leading-5 text-blue-50/68">
                  Choose the wallet where your emergency money will be tracked and protected.
                </p>
              </div>

              {wallets.length ? (
                <div className="space-y-2.5">
                  {wallets.map((wallet) => {
                    const active = selectedWalletId === wallet.id;
                    return (
                      <button
                        key={wallet.id}
                        type="button"
                        onClick={() => {
                          setSelectedWalletId(wallet.id);
                          setError("");
                        }}
                        disabled={isBusy}
                        className={`flex w-full items-center justify-between gap-3 rounded-[18px] border px-4 py-3.5 text-left transition disabled:opacity-55 ${
                          active
                            ? "border-[#FFD84A]/38 bg-[linear-gradient(145deg,rgba(12,74,160,0.86),rgba(7,37,84,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_10px_24px_rgba(0,0,0,0.12)]"
                            : "border-blue-300/[0.12] bg-[#03142F]/72 hover:border-blue-300/25 hover:bg-[#071F47]/82"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border ${active ? "border-blue-200/25 bg-[#0B4B9C]/70 text-[#FFD84A]" : "border-blue-300/[0.12] bg-[#061C40]/80 text-blue-100/62"}`}>
                            <Wallet className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-white/95">{wallet.name}</p>
                            <p className="mt-0.5 text-[11px] font-semibold text-blue-100/48">Available: {fmt(wallet.balance)}</p>
                          </div>
                        </div>
                        {active ? <Check className="h-4 w-4 shrink-0 text-[#FFD84A]" /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[18px] border border-[#FFD84A]/22 bg-[linear-gradient(145deg,rgba(255,216,74,0.07),rgba(5,24,57,0.84))] px-4 py-4 text-[12px] font-semibold leading-5 text-[#FFE98E]">
                  <p>Create or link a wallet first before setting up your Emergency Fund.</p>

                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      handleCreateWallet?.();
                    }}
                    disabled={isBusy}
                    className="mt-3 flex w-full items-center justify-center rounded-[16px] border border-blue-300/28 bg-[linear-gradient(100deg,#0C4EAE,#0867FF_58%,#126EDB)] px-4 py-3 text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_24px_rgba(8,103,255,0.14)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Create wallet now
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {stepIndex === 2 ? (
            <div className="space-y-5">
              <div>
                <p className="text-[20px] font-black leading-[1.15] tracking-[-0.03em] text-white">
                  How many months do you want to protect first?
                </p>
                <p className="mt-2.5 text-[13px] font-semibold leading-5 text-blue-50/68">
                  Start with a realistic safety goal. You can grow it later.
                </p>
              </div>

              <div className="grid gap-2.5">
                {targetOptions.map((option) => {
                  const active = targetMonths === option.months;
                  const disabled = !allowedTargetMonths.includes(option.months) || isBusy;
                  return (
                    <button
                      key={option.months}
                      type="button"
                      onClick={() => {
                        setTargetMonths(option.months);
                        setError("");
                      }}
                      disabled={disabled}
                      className={`flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        active
                          ? "border-[#FFD84A]/38 bg-[linear-gradient(145deg,rgba(12,74,160,0.88),rgba(7,37,84,0.96))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_10px_24px_rgba(0,0,0,0.12)]"
                          : "border-blue-300/[0.12] bg-[#03142F]/72 text-white/86 hover:border-blue-300/25 hover:bg-[#071F47]/82"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-black">{option.months} Months</p>
                        <p className="mt-1 text-[11px] font-semibold text-blue-100/48">{option.label}</p>
                      </div>
                      {active ? (
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#FFD84A]/32 bg-[#FFD84A]/10 text-[#FFD84A]">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {stepIndex === 3 ? (
            <div className="space-y-5">
              <div>
                <p className="text-[20px] font-black leading-[1.15] tracking-[-0.03em] text-white">
                  Review your protection setup
                </p>
                <p className="mt-2.5 text-[13px] font-semibold leading-5 text-blue-50/68">
                  Saving this only defines your Emergency Fund. Adding money stays separate.
                </p>
              </div>

              <div className="space-y-2.5 rounded-[20px] border border-blue-300/[0.13] bg-[#03142F]/72 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
                <div className="flex items-center justify-between gap-3 rounded-[14px] border border-blue-300/[0.08] bg-[#08285A]/45 px-3 py-2.5">
                  <span className="text-xs font-semibold text-blue-100/48">Monthly survival cost</span>
                  <span className="text-sm font-black text-white/95">{fmt(numericMonthlyCost)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-[14px] border border-blue-300/[0.08] bg-[#08285A]/45 px-3 py-2.5">
                  <span className="text-xs font-semibold text-blue-100/48">Storage wallet</span>
                  <span className="max-w-[190px] truncate text-sm font-black text-white/95">{selectedWallet?.name || "Wallet"}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-[14px] border border-blue-300/[0.08] bg-[#08285A]/45 px-3 py-2.5">
                  <span className="text-xs font-semibold text-blue-100/48">Protection goal</span>
                  <span className="text-sm font-black text-white/95">{targetMonths} months</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-[14px] border border-[#FFD84A]/24 bg-[linear-gradient(135deg,rgba(255,216,74,0.08),rgba(8,40,90,0.62))] px-3 py-3">
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#FFD84A]/72">Target amount</span>
                  <span className="text-base font-black text-[#FFE36E]">{fmt(targetAmount)}</span>
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-[16px] border border-[#F32645]/30 bg-[#F32645]/10 px-4 py-3 text-xs font-semibold text-rose-100">
              {error}
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-blue-200/[0.08] pt-4">
            <button
              type="button"
              onClick={stepIndex === 0 ? onClose : goBack}
              disabled={isBusy}
              className="min-h-12 rounded-[16px] border border-blue-300/[0.14] bg-[#03142F]/82 px-4 py-3 text-sm font-bold text-blue-50/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-blue-300/28 hover:bg-[#061C40] hover:text-white disabled:opacity-50"
            >
              {stepIndex === 0 ? "Cancel" : "Back"}
            </button>

            {stepIndex < 3 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={isBusy || (stepIndex === 1 && wallets.length === 0)}
                className="flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-blue-200/28 bg-[linear-gradient(100deg,#0C4EAE,#0867FF_58%,#126EDB)] px-4 py-3 text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_12px_26px_rgba(8,103,255,0.18)] transition hover:border-[#FFD84A]/32 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={isBusy}
                className="flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-blue-200/28 bg-[linear-gradient(100deg,#0C4EAE,#0867FF_58%,#126EDB)] px-4 py-3 text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_12px_26px_rgba(8,103,255,0.18)] transition hover:border-[#FFD84A]/32 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {isBusy ? "Saving..." : "Save setup"}
                <Check className="h-4 w-4 text-[#FFD84A]" />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );

  return createPortal(modal, document.body);
}
