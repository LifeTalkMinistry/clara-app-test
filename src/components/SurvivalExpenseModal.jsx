import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

function saveSurvivalExpenseLocally(value) {
  try {
    const currentUser =
      JSON.parse(localStorage.getItem("clara_user") || "null") || {};

    const updatedUser = {
      ...currentUser,
      monthly_survival_expense: value,
    };

    localStorage.setItem("clara_user", JSON.stringify(updatedUser));
    localStorage.setItem("monthly_survival_expense", String(value));

    return updatedUser;
  } catch (error) {
    console.error("Failed to save monthly_survival_expense locally:", error);
    localStorage.setItem("monthly_survival_expense", String(value));
    return { monthly_survival_expense: value };
  }
}

function getSavedSurvivalExpense() {
  try {
    const fromDirectKey = localStorage.getItem("monthly_survival_expense");
    if (fromDirectKey && Number(fromDirectKey) > 0) {
      return String(fromDirectKey);
    }

    const user = JSON.parse(localStorage.getItem("clara_user") || "null");
    if (
      user?.monthly_survival_expense &&
      Number(user.monthly_survival_expense) > 0
    ) {
      return String(user.monthly_survival_expense);
    }

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
  const [est, setEst] = useState({
    rent: "",
    food: "",
    utilities: "",
    transport: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    const savedValue = getSavedSurvivalExpense();
    setAmount(savedValue);
  }, [open]);

  useEffect(() => {
    if (open) return;

    setShowEstimator(false);
    setEst({
      rent: "",
      food: "",
      utilities: "",
      transport: "",
    });
  }, [open]);

  const estTotal = Object.values(est).reduce((sum, value) => {
    return sum + (parseFloat(value) || 0);
  }, 0);

  const useEstimate = () => {
    if (estTotal > 0) {
      setAmount(String(estTotal));
    }
    setShowEstimator(false);
  };

  const saveToSupabase = async (value) => {
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!authUser) throw new Error("No authenticated user found.");

    const { error } = await supabase
      .from("profiles")
      .update({ monthly_survival_expense: value })
      .eq("id", authUser.id);

    if (error) throw error;

    saveSurvivalExpenseLocally(value);
  };

  const handleSave = async () => {
    const val = parseFloat(amount);

    if (!val || val <= 0) return;

    try {
      setSaving(true);

      if (typeof onSaveSurvivalExpense === "function") {
        await onSaveSurvivalExpense(val);
      } else {
        await saveToSupabase(val);
      }

      onSaved?.(val);
      onOpenChange?.(false);
    } catch (error) {
      console.error("Failed to save monthly_survival_expense:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <DialogTitle className="font-heading text-lg">
              Set Your Survival Number
            </DialogTitle>
          </div>
        </DialogHeader>

        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          Hindi income ang basehan ng financial security.
          <br />
          Kundi kung <strong>magkano kailangan mo para mabuhay</strong> bawat
          buwan.
        </p>

        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold">
              Monthly Essential Expenses (₱)
            </Label>
            <Input
              type="number"
              placeholder="e.g. 8000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1.5 text-base"
              min={1}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Include: Rent, Food, Bills, Transportation
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowEstimator((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-primary font-semibold"
          >
            {showEstimator ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            Help me estimate
          </button>

          {showEstimator && (
            <div className="bg-muted/50 rounded-xl p-3 space-y-2">
              {[
                { key: "rent", label: "Rent / Housing" },
                { key: "food", label: "Food" },
                { key: "utilities", label: "Utilities / Bills" },
                { key: "transport", label: "Transportation" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Label className="text-xs w-28 flex-shrink-0">{label}</Label>
                  <Input
                    type="number"
                    placeholder="₱0"
                    value={est[key]}
                    onChange={(e) =>
                      setEst((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    className="h-8 text-sm"
                  />
                </div>
              ))}

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-foreground">
                  Total: ₱{estTotal.toLocaleString()}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={useEstimate}
                  disabled={estTotal <= 0}
                >
                  Use This
                </Button>
              </div>
            </div>
          )}
        </div>

        <Button
          className="w-full mt-2"
          onClick={handleSave}
          disabled={saving || !amount || parseFloat(amount) <= 0}
        >
          {saving ? "Saving..." : "Save & Continue"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}