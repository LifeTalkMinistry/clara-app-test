import { useEffect, useState } from "react";
import { Shield, ChevronDown, ChevronUp, X } from "lucide-react";

export default function SurvivalExpenseModal({ open, onSaved }) {
  const [amount, setAmount] = useState("");
  const [showEstimator, setShowEstimator] = useState(false);
  const [est, setEst] = useState({
    rent: "",
    food: "",
    utilities: "",
    transport: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setAmount("");
      setShowEstimator(false);
      setEst({
        rent: "",
        food: "",
        utilities: "",
        transport: "",
      });
    }
  }, [open]);

  const estTotal = Object.values(est).reduce((sum, value) => {
    return sum + (parseFloat(value) || 0);
  }, 0);

  const useEstimate = () => {
    if (estTotal > 0) setAmount(String(estTotal));
    setShowEstimator(false);
  };

  const handleSave = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;

    try {
      setSaving(true);
      localStorage.setItem("monthly_survival_expense", String(val));
      onSaved?.(val);
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#071018] p-5 text-white shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10">
              <Shield className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Set Survival Number</h2>
              <p className="text-xs text-white/55">Emergency fund base</p>
            </div>
          </div>

          <button
            onClick={() => onSaved?.(null)}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/60 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-sm leading-6 text-white/72">
          Hindi income ang basehan. Kundi kung magkano kailangan mo para mabuhay buwan-buwan.
        </p>

        <div className="mb-4">
          <p className="mb-1.5 text-sm font-semibold text-white">Monthly Expenses (₱)</p>
          <input
            type="number"
            placeholder="e.g. 8000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#020617] px-4 py-3 text-white outline-none placeholder:text-white/35"
          />
        </div>

        <button
          onClick={() => setShowEstimator((v) => !v)}
          className="mb-3 flex items-center gap-1 text-xs text-emerald-300"
        >
          {showEstimator ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Help me estimate
        </button>

        {showEstimator && (
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            {[
              { key: "rent", label: "Rent" },
              { key: "food", label: "Food" },
              { key: "utilities", label: "Bills" },
              { key: "transport", label: "Transport" },
            ].map(({ key, label }) => (
              <div key={key} className="mb-2 flex items-center gap-2 last:mb-0">
                <span className="w-24 text-xs text-white/65">{label}</span>
                <input
                  type="number"
                  placeholder="0"
                  value={est[key]}
                  onChange={(e) =>
                    setEst((prev) => ({
                      ...prev,
                      [key]: e.target.value,
                    }))
                  }
                  className="flex-1 rounded-xl border border-white/10 bg-[#020617] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30"
                />
              </div>
            ))}

            <div className="mt-3 flex items-center justify-between text-xs text-white/70">
              <span>Total: ₱{estTotal.toLocaleString()}</span>
              <button
                onClick={useEstimate}
                disabled={estTotal <= 0}
                className="rounded-lg bg-emerald-500 px-3 py-1 font-medium text-white disabled:opacity-40"
              >
                Use
              </button>
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !amount}
          className="w-full rounded-2xl bg-[linear-gradient(135deg,#22c55e,#0ea5a0)] px-4 py-3 font-semibold text-white shadow-[0_14px_30px_rgba(34,197,94,0.22)] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save & Continue"}
        </button>

        <button
          onClick={() => onSaved?.(null)}
          className="mt-3 w-full text-sm text-white/50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}