import { useEffect, useState } from "react";
import { Shield, ChevronDown, ChevronUp } from "lucide-react";

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

  // 🔥 replaced base44 → localStorage (temporary)
  const handleSave = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;

    try {
      setSaving(true);

      localStorage.setItem("monthly_survival_expense", val);

      onSaved?.(val);
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white text-black p-4 rounded-lg w-[320px]">
        {/* HEADER */}
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-green-600" />
          <h2 className="font-bold text-lg">Set Survival Number</h2>
        </div>

        <p className="text-sm mb-3">
          Hindi income ang basehan.
          <br />
          Kundi kung magkano kailangan mo para mabuhay buwan-buwan.
        </p>

        {/* INPUT */}
        <div className="mb-3">
          <p className="text-sm font-semibold">Monthly Expenses (₱)</p>
          <input
            type="number"
            placeholder="e.g. 8000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border p-2 mt-1"
          />
        </div>

        {/* ESTIMATOR TOGGLE */}
        <button
          onClick={() => setShowEstimator((v) => !v)}
          className="text-xs flex items-center gap-1 mb-2"
        >
          {showEstimator ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Help me estimate
        </button>

        {/* ESTIMATOR */}
        {showEstimator && (
          <div className="bg-gray-100 p-2 rounded mb-2">
            {[
              { key: "rent", label: "Rent" },
              { key: "food", label: "Food" },
              { key: "utilities", label: "Bills" },
              { key: "transport", label: "Transport" },
            ].map(({ key, label }) => (
              <div key={key} className="flex gap-2 mb-1">
                <span className="text-xs w-24">{label}</span>
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
                  className="flex-1 border p-1 text-sm"
                />
              </div>
            ))}

            <div className="flex justify-between mt-2 text-xs">
              <span>Total: ₱{estTotal.toLocaleString()}</span>
              <button onClick={useEstimate} disabled={estTotal <= 0}>
                Use
              </button>
            </div>
          </div>
        )}

        {/* ACTION */}
        <button
          onClick={handleSave}
          disabled={saving || !amount}
          className="w-full bg-green-600 text-white p-2 rounded"
        >
          {saving ? "Saving..." : "Save & Continue"}
        </button>

        <button
          onClick={() => onSaved?.(null)}
          className="w-full mt-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}