import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ChevronDown, ChevronUp, X } from "lucide-react";

const normalizeNumber = (value) => {
  const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const getSurvivalExpenseStorageKeys = (userId) => {
  const safeUserId = userId || "guest";
  return [
    `clara_survival_expense_${safeUserId}`,
    `clara_survival_number_${safeUserId}`,
    `survival_expense_${safeUserId}`,
    "clara_survival_expense",
    "clara_survival_number",
    "survival_expense",
  ];
};

const saveSurvivalExpenseLocally = (value, userId) => {
  if (typeof window === "undefined") return;

  const amount = normalizeNumber(value);
  if (amount <= 0) return;

  const payload = JSON.stringify({
    amount,
    monthlyEssentialExpenses: amount,
    survivalExpense: amount,
    savedAt: new Date().toISOString(),
  });

  getSurvivalExpenseStorageKeys(userId).forEach((key) => {
    try {
      window.localStorage.setItem(key, payload);
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
    }
  });

  window.dispatchEvent(
    new CustomEvent("clara:survival-expense-updated", {
      detail: {
        amount,
        monthlyEssentialExpenses: amount,
        survivalExpense: amount,
      },
    })
  );

  window.dispatchEvent(new Event("storage"));
};

export default function SurvivalExpenseModal({
  open,
  initialValue = 0,
  userId,
  onSaved,
  onSaveSurvivalExpense,
  onOpenChange,
}) {
  const [amount, setAmount] = useState("");
  const [showEstimator, setShowEstimator] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [est, setEst] = useState({
    rent: "",
    food: "",
    utilities: "",
    transport: "",
  });

  useEffect(() => {
    if (open) {
      setAmount(normalizeNumber(initialValue) > 0 ? String(initialValue) : "");
      setError("");
      setSaving(false);
      return;
    }

    setShowEstimator(false);
    setEst({
      rent: "",
      food: "",
      utilities: "",
      transport: "",
    });
    setSaving(false);
    setError("");
  }, [initialValue, open]);

  const estTotal = useMemo(
    () =>
      Object.values(est).reduce(
        (sum, value) => sum + normalizeNumber(value),
        0
      ),
    [est]
  );

  const handleSave = async () => {
    const val = normalizeNumber(amount);

    if (val <= 0) {
      setError("Please enter your monthly essential expenses first.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      saveSurvivalExpenseLocally(val, userId);

      if (onSaveSurvivalExpense) {
        await onSaveSurvivalExpense(val);
      }

      onSaved?.(val);
      onOpenChange?.(false);
    } catch (err) {
      console.error("Failed to save survival expense:", err);
      setError("Could not save yet. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999]">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={() => {
          if (!saving) onOpenChange?.(false);
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0b1220] p-5 text-white shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              if (!saving) onOpenChange?.(false);
            }}
            className="absolute right-4 top-4 rounded-full p-1 transition hover:bg-white/10"
            aria-label="Close survival expense modal"
          >
            <X className="h-4 w-4 text-white/60" />
          </button>

          <div className="mb-4 flex items-center gap-2 pr-6">
            <Shield className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold">Set Your Survival Number</h2>
          </div>

          <p className="mb-4 text-sm leading-6 text-white/70">
            Hindi income ang basehan ng financial security.
          </p>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="monthly-essential-expenses">
                Monthly Essential Expenses (₱)
              </Label>
              <Input
                id="monthly-essential-expenses"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSave();
                  }
                }}
                className="border-white/10 bg-blue-500/15 text-white placeholder:text-white/30"
                disabled={saving}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowEstimator((current) => !current)}
              className="flex items-center gap-1 text-xs font-medium text-emerald-400 transition hover:text-emerald-300"
              disabled={saving}
            >
              {showEstimator ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Help me estimate
            </button>

            {showEstimator && (
              <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
                {["rent", "food", "utilities", "transport"].map((key) => (
                  <Input
                    key={key}
                    placeholder={key}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={est[key]}
                    onChange={(event) =>
                      setEst((prev) => ({
                        ...prev,
                        [key]: event.target.value,
                      }))
                    }
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/35"
                    disabled={saving}
                  />
                ))}

                <Button
                  type="button"
                  onClick={() => {
                    if (estTotal > 0) setAmount(String(estTotal));
                    setError("");
                    setShowEstimator(false);
                  }}
                  disabled={estTotal <= 0 || saving}
                  className="w-full"
                >
                  Use ₱{estTotal.toLocaleString("en-PH")}
                </Button>
              </div>
            )}

            {error ? (
              <p className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                {error}
              </p>
            ) : null}
          </div>

          <Button
            type="button"
            className="mt-4 w-full bg-gradient-to-r from-rose-400 via-pink-400 to-sky-400 font-semibold text-white shadow-[0_12px_30px_rgba(56,189,248,0.18)] hover:opacity-95"
            onClick={handleSave}
            disabled={saving || normalizeNumber(amount) <= 0}
          >
            {saving ? "Saving..." : "Save & Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
