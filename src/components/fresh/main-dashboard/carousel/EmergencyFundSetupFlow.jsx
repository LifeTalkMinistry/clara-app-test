import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Shield, Wallet, X } from "lucide-react";

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

  if (!open) return null;

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

  return (
    <div className="fixed inset-0 z-[115] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close emergency fund setup"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={() => {
          if (!isBusy) onClose();
        }}
      />

      <div className="theme-modal-card relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.075] bg-[#061224]/95 text-white shadow-2xl backdrop-blur-2xl">
        <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-cyan-400/[0.09] blur-[72px]" />
        <div className="pointer-events-none absolute -bottom-28 -right-20 h-64 w-64 rounded-full bg-violet-500/[0.13] blur-[82px]" />

        <div className="relative flex items-center justify-between border-b border-white/[0.06] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-200/18 bg-cyan-300/[0.08] text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.10)]">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="text-base font-black tracking-tight">Emergency Fund</p>
              <p className="mt-0.5 text-xs font-semibold text-white/45">{stepTitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-black/[0.12] text-white/70 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative space-y-5 p-4">
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-1.5 flex-1 rounded-full transition ${step <= stepIndex ? "bg-cyan-200/70" : "bg-white/[0.08]"}`}
              />
            ))}
          </div>

          {stepIndex === 0 ? (
            <div className="space-y-4">
              <div>
                <p className="text-xl font-black leading-tight tracking-[-0.02em]">
                  How much do you need every month to survive?
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/58">
                  Include rent, food, bills, transport, debt minimums, and essentials only.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-white/38">
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
                  className="w-full rounded-2xl border border-white/[0.07] bg-black/[0.18] px-4 py-4 text-lg font-black text-white outline-none transition placeholder:text-white/28 focus:border-cyan-200/30"
                  disabled={isBusy}
                />
              </div>
            </div>
          ) : null}

          {stepIndex === 1 ? (
            <div className="space-y-4">
              <div>
                <p className="text-xl font-black leading-tight tracking-[-0.02em]">
                  Where should CLARA protect this emergency fund?
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/58">
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
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition disabled:opacity-60 ${
                          active
                            ? "border-cyan-200/28 bg-cyan-300/[0.10] shadow-[0_0_18px_rgba(34,211,238,0.08)]"
                            : "border-white/[0.06] bg-black/[0.14] hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.045] text-white/72">
                            <Wallet className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-white/90">{wallet.name}</p>
                            <p className="mt-0.5 text-xs font-semibold text-white/40">Available: {fmt(wallet.balance)}</p>
                          </div>
                        </div>
                        {active ? <Check className="h-4 w-4 shrink-0 text-cyan-100" /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-300/18 bg-amber-400/[0.08] px-4 py-4 text-sm font-semibold leading-6 text-amber-50/82">
                  <p>Create or link a wallet first before setting up your Emergency Fund.</p>

                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      handleCreateWallet?.();
                    }}
                    disabled={isBusy}
                    className="mt-3 flex w-full items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.12] px-4 py-3 text-sm font-black text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.08)] transition hover:bg-cyan-300/[0.16] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Create wallet now
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {stepIndex === 2 ? (
            <div className="space-y-4">
              <div>
                <p className="text-xl font-black leading-tight tracking-[-0.02em]">
                  How many months do you want to protect first?
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/58">
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
                      className={`rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
                        active
                          ? "border-emerald-300/26 bg-emerald-400/[0.10] text-emerald-100 shadow-[0_0_18px_rgba(52,211,153,0.08)]"
                          : "border-white/[0.06] bg-black/[0.14] text-white/78 hover:bg-white/[0.04]"
                      }`}
                    >
                      <p className="text-sm font-black">{option.months} Months</p>
                      <p className="mt-1 text-xs font-semibold text-white/42">{option.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {stepIndex === 3 ? (
            <div className="space-y-4">
              <div>
                <p className="text-xl font-black leading-tight tracking-[-0.02em]">
                  Review your protection setup
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/58">
                  Saving this only defines your Emergency Fund. Adding money stays separate.
                </p>
              </div>

              <div className="space-y-2.5 rounded-2xl border border-white/[0.06] bg-black/[0.12] p-3.5">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.035] px-3 py-2.5">
                  <span className="text-xs font-semibold text-white/42">Monthly survival cost</span>
                  <span className="text-sm font-black text-white/90">{fmt(numericMonthlyCost)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.035] px-3 py-2.5">
                  <span className="text-xs font-semibold text-white/42">Storage wallet</span>
                  <span className="max-w-[190px] truncate text-sm font-black text-white/90">{selectedWallet?.name || "Wallet"}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.035] px-3 py-2.5">
                  <span className="text-xs font-semibold text-white/42">Protection goal</span>
                  <span className="text-sm font-black text-white/90">{targetMonths} months</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-300/16 bg-emerald-400/[0.075] px-3 py-3">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100/48">Target amount</span>
                  <span className="text-base font-black text-emerald-100">{fmt(targetAmount)}</span>
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-300/16 bg-rose-400/[0.08] px-4 py-3 text-xs font-semibold text-rose-100">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={stepIndex === 0 ? onClose : goBack}
              disabled={isBusy}
              className="rounded-2xl border border-white/[0.06] bg-black/[0.12] px-4 py-3 text-sm font-semibold text-white/74 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-60"
            >
              {stepIndex === 0 ? "Cancel" : "Back"}
            </button>

            {stepIndex < 3 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={isBusy || (stepIndex === 1 && wallets.length === 0)}
                className="flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.10] px-4 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/[0.14] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={isBusy}
                className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/22 bg-emerald-400/[0.11] px-4 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-400/[0.16] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBusy ? "Saving..." : "Save setup"}
                <Check className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
