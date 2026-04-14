import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ChevronDown, ChevronUp, X } from "lucide-react";

function saveSurvivalExpenseLocally(value) {
  try {
    const currentUser =
      JSON.parse(localStorage.getItem("clara_user") || "null") || {};

    const updatedUser = {
      ...currentUser,
      monthly_survival_expense: Number(value),
      survival_setup_done: true,
    };

    localStorage.setItem("clara_user", JSON.stringify(updatedUser));
    localStorage.setItem("monthly_survival_expense", String(value));
    localStorage.setItem("clara_survival_expense", String(value));
    localStorage.setItem("survival_setup_done", "true");

    return updatedUser;
  } catch {
    localStorage.setItem("monthly_survival_expense", String(value));
    localStorage.setItem("clara_survival_expense", String(value));
    localStorage.setItem("survival_setup_done", "true");
    return { monthly_survival_expense: Number(value) };
  }
}

function getSavedSurvivalExpense() {
  try {
    const direct = localStorage.getItem("monthly_survival_expense");
    if (direct && Number(direct) > 0) return String(direct);

    const clara = localStorage.getItem("clara_survival_expense");
    if (clara && Number(clara) > 0) return String(clara);

    const user = JSON.parse(localStorage.getItem("clara_user") || "null");
    if (user?.monthly_survival_expense > 0)
      return String(user.monthly_survival_expense);

    return "";
  } catch {
    return "";
  }
}

export default function SurvivalExpenseModal({
  open,
  onSaved,
  onSaveSurvivalExpense,
  onOpenChange,
}) {
  const [amount, setAmount] = useState("");
  const [showEstimator, setShowEstimator] = useState(false);
  const [saving, setSaving] = useState(false);
  const [est, setEst] = useState({
    rent: "",
    food: "",
    utilities: "",
    transport: "",
  });

  useEffect(() => {
    if (open) {
      setAmount(getSavedSurvivalExpense());
    } else {
      setShowEstimator(false);
      setEst({
        rent: "",
        food: "",
        utilities: "",
        transport: "",
      });
      setSaving(false);
    }
  }, [open]);

  const estTotal = Object.values(est).reduce(
    (sum, v) => sum + (parseFloat(v) || 0),
    0
  );

  const handleSave = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;

    try {
      setSaving(true);

      if (onSaveSurvivalExpense) {
        await onSaveSurvivalExpense(val);
      }

      saveSurvivalExpenseLocally(val);
      onSaved?.(val);
      onOpenChange?.(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999]">
      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={() => onOpenChange?.(false)}
      />

      {/* MODAL */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="w-full max-w-sm bg-[#0b1220] text-white rounded-2xl p-5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* CLOSE */}
          <button
            onClick={() => onOpenChange?.(false)}
            className="absolute right-4 top-4"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>

          {/* HEADER */}
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold">
              Set Your Survival Number
            </h2>
          </div>

          {/* TEXT */}
          <p className="text-sm text-white/70 mb-4">
            Hindi income ang basehan ng financial security.
          </p>

          {/* INPUT */}
          <div className="space-y-3">
            <div>
              <Label>Monthly Essential Expenses (₱)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* ESTIMATOR */}
            <button
              type="button"
              onClick={() => setShowEstimator(!showEstimator)}
              className="text-xs text-emerald-400 flex items-center gap-1"
            >
              {showEstimator ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Help me estimate
            </button>

            {showEstimator && (
              <div className="space-y-2 bg-white/5 p-3 rounded-xl">
                {["rent", "food", "utilities", "transport"].map((key) => (
                  <Input
                    key={key}
                    placeholder={key}
                    type="number"
                    value={est[key]}
                    onChange={(e) =>
                      setEst((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                  />
                ))}

                <Button
                  type="button"
                  onClick={() => {
                    if (estTotal > 0) setAmount(String(estTotal));
                    setShowEstimator(false);
                  }}
                >
                  Use ₱{estTotal}
                </Button>
              </div>
            )}
          </div>

          {/* BUTTON */}
          <Button
            className="w-full mt-4"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save & Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
