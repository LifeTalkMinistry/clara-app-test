import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import useFinancialData from "@/hooks/useFinancialData";
import FinanceField from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceField";
import { financeInputClassName } from "@/components/fresh/main-dashboard/finance-form/financeFormConstants";
import {
  INCOME_SOURCE_CATEGORIES,
  INCOME_SOURCE_STABILITY,
  getIncomeHubLocalUserId,
  upsertIncomeSource,
} from "@/lib/incomeHubRepository";

const DEFAULT_CATEGORY = INCOME_SOURCE_CATEGORIES.includes("Salary")
  ? "Salary"
  : INCOME_SOURCE_CATEGORIES[0] || "Other Income";

const DEFAULT_STABILITY = INCOME_SOURCE_STABILITY.includes("Stable")
  ? "Stable"
  : INCOME_SOURCE_STABILITY[0] || "Irregular";

const createEmptyForm = () => ({
  name: "",
  category: DEFAULT_CATEGORY,
  stability: DEFAULT_STABILITY,
});

export default function IncomeSourceCreateModal({ open = false, onClose }) {
  const { user } = useAuth();
  const financial = useFinancialData(user);
  const localUserId = useMemo(() => getIncomeHubLocalUserId(user), [user]);
  const [form, setForm] = useState(createEmptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setForm(createEmptyForm());
    setError("");
  }, [open]);

  const closeModal = () => {
    if (saving) return;

    setForm(createEmptyForm());
    setError("");
    onClose?.();
  };

  const refreshFinanceEvents = async () => {
    if (typeof financial.refreshData === "function") {
      await financial.refreshData();
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("clara-income-hub-updated"));
      window.dispatchEvent(new Event("clara-finance-updated"));
    }
  };

  const createSource = async () => {
    const sourceName = form.name.trim();

    if (!sourceName) {
      setError("Source name is required.");
      return;
    }

    const timestamp = new Date().toISOString();

    try {
      setSaving(true);
      setError("");

      await upsertIncomeSource(localUserId, {
        name: sourceName,
        category: form.category || DEFAULT_CATEGORY,
        stability: form.stability || DEFAULT_STABILITY,
        totalMoneyIn: 0,
        total_money_in: 0,
        totalMoneyOut: 0,
        total_money_out: 0,
        currentBalance: 0,
        current_balance: 0,
        lastActivityAt: timestamp,
        last_activity_at: timestamp,
      });

      await refreshFinanceEvents();
      setForm(createEmptyForm());
      onClose?.();
    } catch (createError) {
      console.error("CLARA income source create error:", createError);
      setError("Unable to create source. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const modal = (
    <div className="fixed inset-0 z-[120] flex min-h-[100svh] items-start justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_20%,rgba(15,23,42,0.42),rgba(2,6,23,0.72)_54%,rgba(2,6,23,0.86))] px-1.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-0 backdrop-blur-[16px]">
      <div className="relative z-[200] flex max-h-[calc(100svh-1.25rem)] w-full max-w-[402px] overflow-visible rounded-[34px] border border-cyan-100/[0.18] bg-[radial-gradient(circle_at_50%_0%,rgba(20,184,166,0.14),transparent_42%),linear-gradient(135deg,rgba(5,44,62,0.99),rgba(7,20,48,0.995)_48%,rgba(38,16,77,0.995))] shadow-[0_28px_90px_rgba(0,0,0,0.62),0_0_0_1px_rgba(255,255,255,0.08),0_0_54px_rgba(34,211,238,0.12)]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            createSource();
          }}
          className="flex max-h-[calc(100svh-1.25rem)] min-h-0 w-full flex-col overflow-visible"
        >
          <div className="shrink-0 border-b border-white/10 bg-white/[0.035] px-5 py-3.5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-[28px] font-black tracking-[-0.04em] text-white">Create income source</h3>
                <p className="mt-1 max-w-[270px] text-[13px] font-semibold leading-5 text-white/64">
                  Add a new place where money comes from.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="mt-1 shrink-0 rounded-full border border-white/15 bg-white/[0.075] p-3 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="relative z-[220] min-h-0 max-h-[calc(100svh-10rem)] space-y-3 overflow-y-auto overflow-x-visible overscroll-contain px-5 py-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FinanceField label="Source name" helper={error}>
              <input
                type="text"
                value={form.name}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, name: event.target.value }));
                  if (error) setError("");
                }}
                placeholder="Salary, Online Selling, Freelance, Allowance"
                className={financeInputClassName}
                autoFocus
              />
            </FinanceField>

            <FinanceField label="Category">
              <select
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                className={financeInputClassName}
              >
                {INCOME_SOURCE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </FinanceField>

            <FinanceField label="Stability">
              <select
                value={form.stability}
                onChange={(event) => setForm((prev) => ({ ...prev, stability: event.target.value }))}
                className={financeInputClassName}
              >
                {INCOME_SOURCE_STABILITY.map((stability) => (
                  <option key={stability} value={stability}>
                    {stability}
                  </option>
                ))}
              </select>
            </FinanceField>
          </div>

          <div className="shrink-0 border-t border-white/10 bg-[#071120]/92 px-5 pb-[calc(0.65rem+env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-xl">
            <div className="grid grid-cols-[0.82fr_1.18fr] gap-2.5">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-2xl border border-white/15 bg-white/[0.075] px-4 py-3 text-sm font-semibold text-white/76 transition hover:bg-white/[0.10] hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(16,185,129,0.24)] transition disabled:cursor-not-allowed disabled:opacity-55"
              >
                {saving ? "Creating..." : "Create Source"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === "undefined") return modal;

  return createPortal(modal, document.body);
}
