import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Receipt,
  TrendingUp,
  ArrowLeftRight,
  Calculator,
  Delete,
  X,
} from "lucide-react";
import useUserRole from "../hooks/useUserRole";
import useFinancialData from "@/hooks/useFinancialData";
import useDashboardManualExpenseBudgetOptions from "@/components/fresh/main-dashboard/budget/useDashboardManualExpenseBudgetOptions";
import { UNDOCUMENTED_SPENDING_REASONS } from "@/components/fresh/main-dashboard/finance-form/financeFormConstants";
import {
  getWalletDisplayBalance,
  getWalletDisplayName,
  getWalletSpendableBalance,
} from "@/utils/dashboard/dashboardHelpers";

const PH_TIME_ZONE = "Asia/Manila";
const UNPLANNED_KEY = "__unplanned__";
const UNDOCUMENTED_KEY = "__undocumented__";
const BUDGET_SECTION_KEY = "__budget_items_header__";
const NO_BUDGET_ITEMS_KEY = "__no_budget_items__";

const ACTION_TYPES = [
  { id: "expense", label: "Expense", icon: Receipt },
  { id: "income", label: "Add Funds", icon: TrendingUp },
  { id: "transfer", label: "Transfer", icon: ArrowLeftRight },
];

const normalizeNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const numeric = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeText = (value) => String(value ?? "").trim();
const normalizeLower = (value) => normalizeText(value).toLowerCase();

const formatPhp = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(normalizeNumber(value));

const getPHDateString = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const map = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  return `${map.year}-${map.month}-${map.day}`;
};

const getRecordDateString = (record) => {
  const raw =
    record?.date ||
    record?.transaction_date ||
    record?.expense_date ||
    record?.created_at ||
    record?.createdAt ||
    "";
  if (!raw) return "";
  const text = String(raw);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : getPHDateString(parsed);
};

const isBudgetHeader = (budget) =>
  Boolean(
    budget?.is_plan_header === true ||
      normalizeLower(budget?.plan_type) === "monthly_budget" ||
      normalizeLower(budget?.category) === "__monthly_budget__" ||
      normalizeLower(budget?.budget_category) === "__monthly_budget__" ||
      normalizeLower(budget?.type) === "monthly_budget",
  );

const isLiveBudgetRecord = (budget) => {
  const status = normalizeLower(budget?.status);
  return Boolean(
    budget &&
      !budget?.deletedAt &&
      !budget?.deleted_at &&
      budget?.is_active !== false &&
      budget?.active !== false &&
      !["inactive", "archived", "deleted", "closed"].includes(status),
  );
};

const getBudgetRange = (budget, today) => {
  const start = normalizeText(
    budget?.cycle_start ||
      budget?.budget_cycle_start ||
      budget?.period_start ||
      budget?.range_start ||
      budget?.tracking_start_date ||
      budget?.tracking_started_at ||
      budget?.start_date,
  ).slice(0, 10);
  const end = normalizeText(
    budget?.cycle_end ||
      budget?.budget_cycle_end ||
      budget?.period_end ||
      budget?.range_end ||
      budget?.end_date,
  ).slice(0, 10);

  if (start && end) return { start, end };

  const monthKey = normalizeText(
    budget?.month || budget?.budget_month || budget?.month_key || today.slice(0, 7),
  ).slice(0, 7);
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return { start: `${today.slice(0, 7)}-01`, end: today };
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${monthKey}-01`,
    end: `${monthKey}-${String(lastDay).padStart(2, "0")}`,
  };
};

const getDefaultExpenseForm = (walletId = "") => ({
  amount: "",
  budget_list_key: "",
  unplanned_reason: "",
  undocumented_reason: "",
  undocumented_note: "",
  wallet_id: walletId,
  notes: "",
  need_type: "need",
});

const getDefaultIncomeForm = (walletId = "") => ({
  amount: "",
  source: "",
  wallet_id: walletId,
  notes: "",
});

const getDefaultTransferForm = (fromWalletId = "", toWalletId = "") => ({
  amount: "",
  from_wallet_id: fromWalletId,
  to_wallet_id: toWalletId,
  notes: "",
});

const CALCULATOR_KEYS = [
  ["7", "8", "9", "/"],
  ["4", "5", "6", "*"],
  ["1", "2", "3", "-"],
  ["0", ".", "(", ")"],
  ["C", "⌫", "=", "+"],
];

function safeEvaluateExpression(expression) {
  const raw = String(expression ?? "").trim();
  if (!raw) return "";
  const sanitized = raw.replace(/×/g, "*").replace(/÷/g, "/");
  if (!/^[\d+\-*/().\s]+$/.test(sanitized)) throw new Error("Invalid expression");
  // eslint-disable-next-line no-new-func
  const result = Function(`"use strict"; return (${sanitized})`)();
  if (!Number.isFinite(result)) throw new Error("Invalid result");
  return String(result);
}

function CalculatorPopover({ open, value, onValueChange, onApply, onClose }) {
  if (!open) return null;

  const handlePress = (key) => {
    if (key === "C") return onValueChange("");
    if (key === "⌫") return onValueChange(String(value || "").slice(0, -1));
    if (key === "=") {
      try {
        onValueChange(safeEvaluateExpression(value));
      } catch {
        onValueChange("");
      }
      return;
    }
    onValueChange(`${value || ""}${key}`);
  };

  let previewResult = "";
  try {
    previewResult = value?.trim() ? safeEvaluateExpression(value) : "";
  } catch {
    previewResult = "";
  }

  return (
    <div className="absolute right-0 top-[calc(100%+8px)] z-[120] w-[280px] rounded-2xl border border-emerald-500/20 bg-[#06162d] p-3 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-white">Calculator</div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-white"
          aria-label="Close calculator"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mb-2 min-h-[52px] rounded-xl border border-white/10 bg-[#071a34] px-3 py-2">
        <div className="truncate text-right text-sm text-slate-400">{value || "0"}</div>
        <div className="truncate text-right text-lg font-bold text-white">{previewResult || " "}</div>
      </div>
      <div className="grid gap-2">
        {CALCULATOR_KEYS.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="grid grid-cols-4 gap-2">
            {row.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handlePress(key)}
                className={`flex h-10 items-center justify-center rounded-xl text-sm font-semibold ${
                  key === "="
                    ? "bg-emerald-600 text-white"
                    : key === "C"
                      ? "bg-red-500/15 text-red-300"
                      : "bg-white/5 text-white"
                }`}
              >
                {key === "⌫" ? <Delete className="h-4 w-4" /> : key}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="border-slate-700 bg-transparent text-slate-200"
        >
          Close
        </Button>
        <Button
          type="button"
          onClick={() => onApply(previewResult || value)}
          className="bg-emerald-600 text-white"
        >
          Apply
        </Button>
      </div>
    </div>
  );
}

export default function QuickAddModal({
  open,
  onClose,
  onSuccess,
  initialAction = "expense",
  initialExpenseData = null,
}) {
  const navigate = useNavigate();
  const { user } = useUserRole();
  const finance = useFinancialData(user);
  const {
    wallets = [],
    expenses = [],
    budgets = [],
    loading: loadingWallets = false,
    refreshing = false,
    addExpense,
    addIncome,
    transferBetweenWallets,
    refreshData,
  } = finance;

  const rawBudgetOptions = useDashboardManualExpenseBudgetOptions({ budgets });
  const today = getPHDateString();

  const activeBudgetHeader = useMemo(() => {
    const candidates = (Array.isArray(budgets) ? budgets : [])
      .filter((budget) => isBudgetHeader(budget) && isLiveBudgetRecord(budget))
      .filter((budget) => {
        const range = getBudgetRange(budget, today);
        return today >= range.start && today <= range.end;
      });
    return candidates[0] || null;
  }, [budgets, today]);

  const budgetPeriod = useMemo(
    () => getBudgetRange(activeBudgetHeader || {}, today),
    [activeBudgetHeader, today],
  );

  const budgetSetupExists = useMemo(() => {
    if (activeBudgetHeader || rawBudgetOptions.length) return true;
    return (Array.isArray(budgets) ? budgets : []).some((budget) => {
      if (!isLiveBudgetRecord(budget)) return false;
      const range = getBudgetRange(budget, today);
      return today >= range.start && today <= range.end;
    });
  }, [activeBudgetHeader, budgets, rawBudgetOptions.length, today]);

  const budgetItems = useMemo(() => {
    const safeExpenses = (Array.isArray(expenses) ? expenses : []).filter(
      (expense) => !expense?.deletedAt && !expense?.deleted_at,
    );

    return rawBudgetOptions
      .filter((item) => {
        const record = item?.budget || item || {};
        const protectionType = normalizeLower(
          record?.protection_type || record?.linked_target_type || record?.protected_type,
        );
        return (
          !record?.is_protected_commitment &&
          !["emergency_fund", "savings_goal"].includes(protectionType)
        );
      })
      .map((item) => {
        const itemId = normalizeText(item?.id || item?.budget?.id);
        const itemKey = normalizeText(item?.key);
        const itemTitle = normalizeText(item?.title);
        const titleLower = normalizeLower(itemTitle);

        const spent = safeExpenses.reduce((sum, expense) => {
          const date = getRecordDateString(expense);
          if (!date || date < budgetPeriod.start || date > budgetPeriod.end) return sum;
          if (["unplanned", "undocumented"].includes(normalizeLower(expense?.planning_status))) {
            return sum;
          }

          const expenseId = normalizeText(
            expense?.budget_item_id || expense?.budget_category_id || expense?.budgetCategoryId,
          );
          const expenseKey = normalizeText(expense?.budget_list_key || expense?.budgetListKey);
          const expenseTitle = normalizeLower(
            expense?.budget_item_name || expense?.budget_category || expense?.category,
          );
          const matches =
            (itemId && expenseId && itemId === expenseId) ||
            (itemKey && expenseKey && itemKey === expenseKey) ||
            (titleLower && expenseTitle && titleLower === expenseTitle);

          return matches ? sum + Math.abs(normalizeNumber(expense?.amount)) : sum;
        }, 0);

        const allocated = Math.max(normalizeNumber(item?.allocated), 0);
        return {
          ...item,
          allocated,
          spent,
          remaining: allocated - spent,
        };
      });
  }, [budgetPeriod.end, budgetPeriod.start, expenses, rawBudgetOptions]);

  const activeWallets = useMemo(
    () =>
      (Array.isArray(wallets) ? wallets : []).filter(
        (wallet) =>
          !wallet?.deletedAt &&
          !wallet?.deleted_at &&
          !wallet?.is_archived &&
          !wallet?.isArchived,
      ),
    [wallets],
  );

  const walletMap = useMemo(
    () => new Map(activeWallets.map((wallet) => [String(wallet.id), wallet])),
    [activeWallets],
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [actionType, setActionType] = useState("expense");
  const [expenseForm, setExpenseForm] = useState(getDefaultExpenseForm());
  const [incomeForm, setIncomeForm] = useState(getDefaultIncomeForm());
  const [transferForm, setTransferForm] = useState(getDefaultTransferForm());
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorValue, setCalculatorValue] = useState("");

  const selectedBudgetItem = useMemo(
    () =>
      budgetItems.find((item) => String(item.key) === String(expenseForm.budget_list_key)) ||
      null,
    [budgetItems, expenseForm.budget_list_key],
  );

  const isUnplanned = expenseForm.budget_list_key === UNPLANNED_KEY;
  const isUndocumented = expenseForm.budget_list_key === UNDOCUMENTED_KEY;

  useEffect(() => {
    if (!open) return;
    const nextAction = ["expense", "income", "transfer"].includes(initialAction)
      ? initialAction
      : "expense";
    setActionType(nextAction);
    setError("");
    setCalculatorOpen(false);
  }, [open, initialAction]);

  useEffect(() => {
    if (!open || !activeWallets.length) return;
    const firstWalletId = String(activeWallets[0]?.id || "");
    const secondWalletId = String(
      activeWallets.find((wallet) => String(wallet.id) !== firstWalletId)?.id || "",
    );

    setExpenseForm((prev) => ({
      ...prev,
      wallet_id:
        prev.wallet_id && walletMap.has(String(prev.wallet_id)) ? prev.wallet_id : firstWalletId,
    }));
    setIncomeForm((prev) => ({
      ...prev,
      wallet_id:
        prev.wallet_id && walletMap.has(String(prev.wallet_id)) ? prev.wallet_id : firstWalletId,
    }));
    setTransferForm((prev) => ({
      ...prev,
      from_wallet_id:
        prev.from_wallet_id && walletMap.has(String(prev.from_wallet_id))
          ? prev.from_wallet_id
          : firstWalletId,
      to_wallet_id:
        prev.to_wallet_id &&
        walletMap.has(String(prev.to_wallet_id)) &&
        String(prev.to_wallet_id) !== firstWalletId
          ? prev.to_wallet_id
          : secondWalletId,
    }));
  }, [activeWallets, open, walletMap]);

  useEffect(() => {
    if (!open || !initialExpenseData) return;

    const amount = normalizeNumber(initialExpenseData?.amount);
    const planningStatus = normalizeLower(
      initialExpenseData?.planning_status || initialExpenseData?.planningStatus,
    );
    const requestedKey = normalizeText(
      initialExpenseData?.budget_list_key || initialExpenseData?.budgetListKey,
    );
    const requestedId = normalizeText(
      initialExpenseData?.budget_item_id || initialExpenseData?.budget_category_id,
    );
    const requestedTitle = normalizeLower(
      initialExpenseData?.budget_item_name ||
        initialExpenseData?.budget_category ||
        initialExpenseData?.category,
    );
    const matchedBudget = budgetItems.find((item) => {
      const id = normalizeText(item?.id || item?.budget?.id);
      return Boolean(
        (requestedKey && String(item.key) === requestedKey) ||
          (requestedId && id === requestedId) ||
          (requestedTitle && normalizeLower(item.title) === requestedTitle),
      );
    });

    const savedUndocumentedReason = normalizeText(
      initialExpenseData?.undocumented_reason || initialExpenseData?.undocumentedReason,
    );
    const savedFallbackReason = normalizeText(initialExpenseData?.unplanned_reason);
    const matchedUndocumentedReason = UNDOCUMENTED_SPENDING_REASONS.includes(
      savedUndocumentedReason,
    )
      ? savedUndocumentedReason
      : UNDOCUMENTED_SPENDING_REASONS.includes(savedFallbackReason)
        ? savedFallbackReason
        : "";

    setExpenseForm((prev) => ({
      ...prev,
      amount: amount > 0 ? String(amount) : prev.amount,
      budget_list_key:
        planningStatus === "unplanned"
          ? UNPLANNED_KEY
          : planningStatus === "undocumented"
            ? UNDOCUMENTED_KEY
            : matchedBudget
              ? String(matchedBudget.key)
              : prev.budget_list_key,
      unplanned_reason:
        planningStatus === "unplanned"
          ? normalizeText(initialExpenseData?.unplanned_reason || initialExpenseData?.notes)
          : "",
      undocumented_reason:
        planningStatus === "undocumented"
          ? matchedUndocumentedReason || "Other undocumented reason"
          : "",
      undocumented_note:
        planningStatus === "undocumented" && !matchedUndocumentedReason
          ? normalizeText(initialExpenseData?.notes || savedFallbackReason)
          : "",
      notes: initialExpenseData?.notes || initialExpenseData?.note || prev.notes || "",
      need_type:
        matchedBudget?.needType && ["need", "want", "savings"].includes(normalizeLower(matchedBudget.needType))
          ? normalizeLower(matchedBudget.needType)
          : prev.need_type,
    }));
  }, [budgetItems, initialExpenseData, open]);

  const resetForms = () => {
    const firstWalletId = String(activeWallets[0]?.id || "");
    const secondWalletId = String(
      activeWallets.find((wallet) => String(wallet.id) !== firstWalletId)?.id || "",
    );
    setExpenseForm(getDefaultExpenseForm(firstWalletId));
    setIncomeForm(getDefaultIncomeForm(firstWalletId));
    setTransferForm(getDefaultTransferForm(firstWalletId, secondWalletId));
    setError("");
    setCalculatorOpen(false);
    setCalculatorValue("");
  };

  const handleClose = () => {
    if (saving) return;
    onClose?.();
    window.setTimeout(resetForms, 120);
  };

  const goSetUpBudget = () => {
    if (saving) return;
    onClose?.();
    navigate("/budget-plan");
    window.setTimeout(resetForms, 120);
  };

  const nowPayload = () => {
    const now = new Date();
    const iso = now.toISOString();
    return { iso, phDate: getPHDateString(now) };
  };

  const handleBudgetSelection = (value) => {
    const item = budgetItems.find((candidate) => String(candidate.key) === String(value));
    setExpenseForm((prev) => ({
      ...prev,
      budget_list_key: value,
      unplanned_reason: value === UNPLANNED_KEY ? prev.unplanned_reason : "",
      undocumented_reason: value === UNDOCUMENTED_KEY ? prev.undocumented_reason : "",
      undocumented_note: value === UNDOCUMENTED_KEY ? prev.undocumented_note : "",
      need_type:
        item?.needType && ["need", "want", "savings"].includes(normalizeLower(item.needType))
          ? normalizeLower(item.needType)
          : prev.need_type,
    }));
  };

  const handleCreateExpense = async () => {
    const amount = normalizeNumber(expenseForm.amount);
    if (amount <= 0) throw new Error("Enter a valid expense amount.");
    if (!expenseForm.wallet_id) throw new Error("Please select a wallet.");

    const wallet = walletMap.get(String(expenseForm.wallet_id));
    if (!wallet) throw new Error("Selected wallet not found.");
    if (amount > getWalletSpendableBalance(wallet)) {
      throw new Error("Not enough spendable balance in this wallet.");
    }

    if (!selectedBudgetItem && !isUnplanned && !isUndocumented) {
      throw new Error("Choose Unplanned, Undocumented, or one of your budget items.");
    }

    const unplannedReason = normalizeText(expenseForm.unplanned_reason);
    const undocumentedReason = normalizeText(expenseForm.undocumented_reason);
    const undocumentedNote = normalizeText(expenseForm.undocumented_note);

    if (isUnplanned && !unplannedReason) {
      throw new Error("Tell CLARA what this unplanned expense was for.");
    }
    if (isUndocumented && !undocumentedReason) {
      throw new Error("Choose why this spending is undocumented.");
    }

    const selectedRecord = selectedBudgetItem?.budget || selectedBudgetItem || null;
    const selectedBudgetKey = selectedBudgetItem ? normalizeText(selectedBudgetItem.key) : "";
    const selectedBudgetId = selectedBudgetItem
      ? normalizeText(selectedBudgetItem.id || selectedRecord?.id || selectedBudgetKey)
      : "";
    const selectedPlanId = selectedBudgetItem
      ? normalizeText(
          selectedRecord?.budget_id ||
            selectedRecord?.plan_id ||
            selectedRecord?.monthly_budget_id ||
            activeBudgetHeader?.id,
        )
      : "";

    const undocumentedFallbackNote = normalizeText(
      [undocumentedReason, undocumentedNote].filter(Boolean).join(" — "),
    );
    const budgetCategory = selectedBudgetItem
      ? normalizeText(selectedBudgetItem.title)
      : isUnplanned
        ? "Unplanned Spending"
        : "Undocumented Spending";
    const planningStatus = selectedBudgetItem
      ? "planned"
      : isUnplanned
        ? "unplanned"
        : "undocumented";
    const needType = selectedBudgetItem ? expenseForm.need_type : "other";
    const statusReason = isUnplanned
      ? unplannedReason
      : isUndocumented
        ? undocumentedFallbackNote || "Undocumented Spending"
        : null;
    const notesValue = normalizeText(expenseForm.notes) || statusReason || "";

    const { iso, phDate } = nowPayload();
    await addExpense?.({
      amount,
      wallet_id: String(expenseForm.wallet_id),
      walletId: String(expenseForm.wallet_id),
      category: budgetCategory,
      budget_category: budgetCategory,
      budget_item_name: selectedBudgetItem ? budgetCategory : null,
      budget_category_id: selectedBudgetId || null,
      budget_item_id: selectedBudgetId || null,
      budget_list_key: selectedBudgetKey || (isUnplanned ? UNPLANNED_KEY : UNDOCUMENTED_KEY),
      budgetListKey: selectedBudgetKey || (isUnplanned ? UNPLANNED_KEY : UNDOCUMENTED_KEY),
      budget_id: selectedBudgetItem ? selectedPlanId || activeBudgetHeader?.id || null : null,
      need_type: needType,
      planning_status: planningStatus,
      unplanned_reason: statusReason,
      undocumented_reason: isUndocumented ? undocumentedReason : null,
      undocumented_note: isUndocumented ? undocumentedNote || null : null,
      notes: notesValue,
      source_type: "Manual Log Expense",
      date: phDate,
      created_at: iso,
      updated_at: iso,
      user_id: user?.id || null,
      user_email: user?.email || null,
      created_by: user?.email || null,
    });
  };

  const handleCreateIncome = async () => {
    const amount = normalizeNumber(incomeForm.amount);
    if (amount <= 0) throw new Error("Enter a valid amount.");
    if (!incomeForm.wallet_id) throw new Error("Please select a wallet.");
    if (!walletMap.has(String(incomeForm.wallet_id))) throw new Error("Selected wallet not found.");

    const { iso, phDate } = nowPayload();
    await addIncome?.({
      wallet_id: String(incomeForm.wallet_id),
      walletId: String(incomeForm.wallet_id),
      type: "income",
      amount,
      source: incomeForm.source || "Quick Actions",
      notes: incomeForm.notes || incomeForm.source || "",
      date: phDate,
      created_at: iso,
      updated_at: iso,
      user_id: user?.id || null,
      user_email: user?.email || null,
      created_by: user?.email || null,
    });
  };

  const handleCreateTransfer = async () => {
    const amount = normalizeNumber(transferForm.amount);
    if (amount <= 0) throw new Error("Enter a valid transfer amount.");
    if (!transferForm.from_wallet_id || !transferForm.to_wallet_id) {
      throw new Error("Please select both wallets.");
    }
    if (String(transferForm.from_wallet_id) === String(transferForm.to_wallet_id)) {
      throw new Error("Source and destination wallets must be different.");
    }

    const fromWallet = walletMap.get(String(transferForm.from_wallet_id));
    const toWallet = walletMap.get(String(transferForm.to_wallet_id));
    if (!fromWallet || !toWallet) throw new Error("Selected wallet not found.");
    if (amount > getWalletSpendableBalance(fromWallet)) {
      throw new Error("Not enough spendable balance for this transfer.");
    }

    const { iso } = nowPayload();
    await transferBetweenWallets?.({
      from_wallet_id: String(transferForm.from_wallet_id),
      to_wallet_id: String(transferForm.to_wallet_id),
      amount,
      notes: transferForm.notes || "",
      created_at: iso,
      user_id: user?.id || null,
      user_email: user?.email || null,
      created_by: user?.email || null,
    });
  };

  const handleSubmit = async () => {
    setError("");
    setSaving(true);
    try {
      if (actionType === "expense") await handleCreateExpense();
      else if (actionType === "income") await handleCreateIncome();
      else await handleCreateTransfer();

      await refreshData?.();
      [
        "clara-expenses-updated",
        "clara-finance-updated",
        "clara-wallets-updated",
        "clara-wallet-transactions-updated",
      ].forEach((eventName) => window.dispatchEvent(new Event(eventName)));
      await onSuccess?.();
      handleClose();
    } catch (err) {
      console.error("Quick Actions save failed:", err);
      setError(err?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const selectedExpenseWallet = walletMap.get(String(expenseForm.wallet_id));
  const selectedIncomeWallet = walletMap.get(String(incomeForm.wallet_id));
  const selectedTransferFromWallet = walletMap.get(String(transferForm.from_wallet_id));
  const selectedTransferToWallet = walletMap.get(String(transferForm.to_wallet_id));

  const expenseAmount = normalizeNumber(expenseForm.amount);
  const projectedBudgetRemaining = selectedBudgetItem
    ? selectedBudgetItem.remaining - expenseAmount
    : null;
  const wouldExceedBudget =
    selectedBudgetItem && expenseAmount > 0 && projectedBudgetRemaining < 0;

  const openCalculatorForCurrentAction = () => {
    setCalculatorValue(
      actionType === "expense"
        ? expenseForm.amount || ""
        : actionType === "income"
          ? incomeForm.amount || ""
          : transferForm.amount || "",
    );
    setCalculatorOpen(true);
  };

  const applyCalculatorValue = (value) => {
    const computedValue = String(value ?? "").trim();
    if (!computedValue) return setCalculatorOpen(false);
    if (actionType === "expense") {
      setExpenseForm((prev) => ({ ...prev, amount: computedValue }));
    } else if (actionType === "income") {
      setIncomeForm((prev) => ({ ...prev, amount: computedValue }));
    } else {
      setTransferForm((prev) => ({ ...prev, amount: computedValue }));
    }
    setCalculatorOpen(false);
  };

  const expenseReady = Boolean(
    expenseForm.amount &&
      expenseForm.wallet_id &&
      (selectedBudgetItem || isUnplanned || isUndocumented) &&
      (!isUnplanned || normalizeText(expenseForm.unplanned_reason)) &&
      (!isUndocumented || normalizeText(expenseForm.undocumented_reason)),
  );

  const isDisabled =
    saving ||
    loadingWallets ||
    refreshing ||
    activeWallets.length === 0 ||
    (actionType === "expense"
      ? !expenseReady
      : actionType === "income"
        ? !incomeForm.amount || !incomeForm.wallet_id
        : !transferForm.amount || !transferForm.from_wallet_id || !transferForm.to_wallet_id);

  const AmountField = ({ value, onChange }) => (
    <div className="relative">
      <Label className="mb-1 block text-xs text-slate-200">Amount (₱)</Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={onChange}
          className="border-emerald-500/40 bg-[#071a34] pr-12 text-lg font-bold text-white"
        />
        <button
          type="button"
          onClick={openCalculatorForCurrentAction}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-emerald-400 hover:bg-emerald-500/10"
          aria-label="Open calculator"
        >
          <Calculator className="h-4 w-4" />
        </button>
      </div>
      <CalculatorPopover
        open={calculatorOpen}
        value={calculatorValue}
        onValueChange={setCalculatorValue}
        onApply={applyCalculatorValue}
        onClose={() => setCalculatorOpen(false)}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent className="mx-auto max-w-sm border border-emerald-500/20 bg-[#031126] text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold text-white">Quick Actions</DialogTitle>
        </DialogHeader>

        <div className="mb-2 grid grid-cols-3 gap-2">
          {ACTION_TYPES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setError("");
                setActionType(item.id);
                setCalculatorOpen(false);
              }}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-center text-xs font-semibold transition-all ${
                actionType === item.id
                  ? "border-emerald-400 bg-emerald-500/5 text-emerald-400 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {actionType === "expense" ? (
          <div className="space-y-3">
            <AmountField
              value={expenseForm.amount}
              onChange={(event) =>
                setExpenseForm((prev) => ({ ...prev, amount: event.target.value }))
              }
            />

            <div className={selectedBudgetItem ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-2"}>
              <div>
                <Label className="mb-1 block text-xs text-slate-200">Budget Item</Label>
                <Select value={expenseForm.budget_list_key} onValueChange={handleBudgetSelection}>
                  <SelectTrigger className="border-slate-700 bg-[#071a34] text-white">
                    <SelectValue placeholder="Select budget item" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-white/15 bg-[#07162f] shadow-[0_28px_80px_rgba(0,0,0,0.62)]">
                    <SelectItem
                      value={UNPLANNED_KEY}
                      textValue="Unplanned"
                      className="my-1 rounded-xl border border-amber-300/20 bg-amber-400/[0.07] py-3.5 pl-4 text-[15px] font-black text-amber-100 focus:bg-amber-300 focus:text-[#07162f] data-[highlighted]:bg-amber-300 data-[highlighted]:text-[#07162f] data-[state=checked]:bg-amber-300 data-[state=checked]:text-[#07162f]"
                    >
                      <span className="text-base font-black tracking-tight">Unplanned</span>
                    </SelectItem>
                    <SelectItem
                      value={UNDOCUMENTED_KEY}
                      textValue="Undocumented"
                      className="my-1 rounded-xl border border-cyan-300/20 bg-cyan-400/[0.07] py-3.5 pl-4 text-[15px] font-black text-cyan-100 focus:bg-cyan-300 focus:text-[#07162f] data-[highlighted]:bg-cyan-300 data-[highlighted]:text-[#07162f] data-[state=checked]:bg-cyan-300 data-[state=checked]:text-[#07162f]"
                    >
                      <span className="text-base font-black tracking-tight">Undocumented</span>
                    </SelectItem>

                    <SelectItem
                      value={BUDGET_SECTION_KEY}
                      disabled
                      className="mt-2 rounded-none border-t border-white/10 bg-transparent pb-2 pt-3 pl-3 pr-3 data-[disabled]:opacity-100"
                    >
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                        Your budget items
                      </span>
                    </SelectItem>

                    {budgetItems.length ? (
                      budgetItems.map((item) => {
                        const remainingLabel =
                          item.remaining >= 0
                            ? `${formatPhp(item.remaining)} left`
                            : `${formatPhp(Math.abs(item.remaining))} over`;
                        return (
                          <SelectItem
                            key={item.key}
                            value={String(item.key)}
                            textValue={item.title}
                            className="my-1 rounded-xl border border-white/[0.08] bg-white/[0.035] py-3 pl-4 pr-10 text-white focus:border-cyan-300/30 focus:bg-cyan-300/10 focus:text-white data-[highlighted]:border-cyan-300/30 data-[highlighted]:bg-cyan-300/10 data-[highlighted]:text-white data-[state=checked]:border-cyan-300/35 data-[state=checked]:bg-cyan-300/12 data-[state=checked]:text-white"
                          >
                            <div className="flex min-w-[220px] items-center justify-between gap-4">
                              <span className="text-[14px] font-black tracking-tight text-white">
                                {item.title}
                              </span>
                              <span
                                className={`rounded-lg border px-2 py-1 text-[11px] font-black tabular-nums ${
                                  item.remaining < 0
                                    ? "border-rose-300/20 bg-rose-400/10 text-rose-200"
                                    : "border-cyan-300/15 bg-cyan-300/[0.07] text-cyan-100/80"
                                }`}
                              >
                                {remainingLabel}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })
                    ) : (
                      <SelectItem
                        value={NO_BUDGET_ITEMS_KEY}
                        disabled
                        className="my-1 rounded-xl border border-white/[0.06] bg-white/[0.025] py-3 pl-4 data-[disabled]:opacity-100"
                      >
                        <span className="text-sm font-bold text-white/35">No active budget items yet</span>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>

                {selectedBudgetItem ? (
                  <p className="mt-1 text-[11px] leading-4 text-slate-400">
                    {selectedBudgetItem.remaining >= 0
                      ? `${formatPhp(selectedBudgetItem.remaining)} left · ${formatPhp(selectedBudgetItem.allocated)} budget`
                      : `${formatPhp(Math.abs(selectedBudgetItem.remaining))} over · ${formatPhp(selectedBudgetItem.allocated)} budget`}
                  </p>
                ) : null}
              </div>

              {selectedBudgetItem ? (
                <div>
                  <Label className="mb-1 block text-xs text-slate-200">Need Type</Label>
                  <Select
                    value={expenseForm.need_type}
                    onValueChange={(value) =>
                      setExpenseForm((prev) => ({ ...prev, need_type: value }))
                    }
                  >
                    <SelectTrigger className="border-slate-700 bg-[#071a34] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="need">Need</SelectItem>
                      <SelectItem value="want">Want</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

            {!budgetSetupExists ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-3 py-2.5">
                <p className="text-[11px] font-medium leading-4 text-amber-100/80">
                  Unplanned and Undocumented are always available. Set up a budget to add planned choices here too.
                </p>
                <button
                  type="button"
                  onClick={goSetUpBudget}
                  className="shrink-0 rounded-lg border border-amber-300/20 bg-amber-300/10 px-2.5 py-1.5 text-[10px] font-bold text-amber-100"
                >
                  Set up budget
                </button>
              </div>
            ) : null}

            {isUnplanned ? (
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.07] p-3">
                <Label className="mb-1 block text-xs text-amber-100">What was this for?</Label>
                <Input
                  value={expenseForm.unplanned_reason}
                  onChange={(event) =>
                    setExpenseForm((prev) => ({ ...prev, unplanned_reason: event.target.value }))
                  }
                  placeholder="e.g., Medicine, unexpected fare"
                  className="border-amber-300/20 bg-[#071a34] text-white"
                />
                <p className="mt-1 text-[11px] leading-4 text-amber-100/60">
                  This will be logged automatically as unplanned spending.
                </p>
              </div>
            ) : null}

            {isUndocumented ? (
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07] p-3">
                <Label className="mb-1 block text-xs text-cyan-100">Why is this undocumented?</Label>
                <Select
                  value={expenseForm.undocumented_reason}
                  onValueChange={(value) =>
                    setExpenseForm((prev) => ({
                      ...prev,
                      undocumented_reason: value,
                      undocumented_note:
                        value === "Other undocumented reason" ? prev.undocumented_note : "",
                    }))
                  }
                >
                  <SelectTrigger className="border-cyan-300/20 bg-[#071a34] text-white">
                    <SelectValue placeholder="Choose the closest reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNDOCUMENTED_SPENDING_REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {expenseForm.undocumented_reason === "Other undocumented reason" ? (
                  <div className="mt-2">
                    <Input
                      value={expenseForm.undocumented_note}
                      onChange={(event) =>
                        setExpenseForm((prev) => ({ ...prev, undocumented_note: event.target.value }))
                      }
                      placeholder="Add a short note, if needed"
                      className="border-cyan-300/20 bg-[#071a34] text-white"
                    />
                  </div>
                ) : null}

                <p className="mt-1 text-[11px] leading-4 text-cyan-100/60">
                  This will be logged automatically as undocumented spending.
                </p>
              </div>
            ) : null}

            {wouldExceedBudget ? (
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.07] px-3 py-2 text-[11px] font-semibold leading-4 text-amber-100/90">
                This would put {selectedBudgetItem.title} {formatPhp(Math.abs(projectedBudgetRemaining))} over budget. You can still record it.
              </div>
            ) : null}

            <div>
              <Label className="mb-1 block text-xs text-slate-200">Wallet</Label>
              <Select
                value={expenseForm.wallet_id}
                onValueChange={(value) =>
                  setExpenseForm((prev) => ({ ...prev, wallet_id: value }))
                }
              >
                <SelectTrigger className="border-slate-700 bg-[#071a34] text-white">
                  <SelectValue placeholder={loadingWallets ? "Loading wallets..." : "Select wallet"} />
                </SelectTrigger>
                <SelectContent>
                  {activeWallets.map((wallet) => (
                    <SelectItem key={wallet.id} value={String(wallet.id)}>
                      {getWalletDisplayName(wallet)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedExpenseWallet ? (
                <p className="mt-1 text-xs text-slate-400">
                  Spendable: {formatPhp(getWalletSpendableBalance(selectedExpenseWallet))}
                </p>
              ) : null}
            </div>

            <div>
              <Label className="mb-1 block text-xs text-slate-200">Note (optional)</Label>
              <Input
                placeholder="Additional details"
                value={expenseForm.notes}
                onChange={(event) =>
                  setExpenseForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                className="border-slate-700 bg-[#071a34] text-white"
              />
            </div>

            <p className="text-[11px] leading-4 text-slate-500">
              Date, time, and planning status are handled automatically when you save.
            </p>
          </div>
        ) : null}

        {actionType === "income" ? (
          <div className="space-y-3">
            <AmountField
              value={incomeForm.amount}
              onChange={(event) =>
                setIncomeForm((prev) => ({ ...prev, amount: event.target.value }))
              }
            />
            <div>
              <Label className="mb-1 block text-xs text-slate-200">Source / Description</Label>
              <Input
                placeholder="e.g., Salary, Freelance"
                value={incomeForm.source}
                onChange={(event) =>
                  setIncomeForm((prev) => ({ ...prev, source: event.target.value }))
                }
                className="border-slate-700 bg-[#071a34] text-white"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-slate-200">Wallet</Label>
              <Select
                value={incomeForm.wallet_id}
                onValueChange={(value) =>
                  setIncomeForm((prev) => ({ ...prev, wallet_id: value }))
                }
              >
                <SelectTrigger className="border-slate-700 bg-[#071a34] text-white">
                  <SelectValue placeholder={loadingWallets ? "Loading wallets..." : "Select wallet"} />
                </SelectTrigger>
                <SelectContent>
                  {activeWallets.map((wallet) => (
                    <SelectItem key={wallet.id} value={String(wallet.id)}>
                      {getWalletDisplayName(wallet)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedIncomeWallet ? (
                <p className="mt-1 text-xs text-slate-400">
                  Current balance: {formatPhp(getWalletDisplayBalance(selectedIncomeWallet))}
                </p>
              ) : null}
            </div>
            <div>
              <Label className="mb-1 block text-xs text-slate-200">Note (optional)</Label>
              <Input
                placeholder="Additional details"
                value={incomeForm.notes}
                onChange={(event) =>
                  setIncomeForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                className="border-slate-700 bg-[#071a34] text-white"
              />
            </div>
            <p className="text-[11px] leading-4 text-slate-500">
              Date and time are recorded automatically when you save.
            </p>
          </div>
        ) : null}

        {actionType === "transfer" ? (
          <div className="space-y-3">
            <AmountField
              value={transferForm.amount}
              onChange={(event) =>
                setTransferForm((prev) => ({ ...prev, amount: event.target.value }))
              }
            />
            <div>
              <Label className="mb-1 block text-xs text-slate-200">From Wallet</Label>
              <Select
                value={transferForm.from_wallet_id}
                onValueChange={(value) =>
                  setTransferForm((prev) => ({
                    ...prev,
                    from_wallet_id: value,
                    to_wallet_id:
                      String(prev.to_wallet_id) === String(value) ? "" : prev.to_wallet_id,
                  }))
                }
              >
                <SelectTrigger className="border-slate-700 bg-[#071a34] text-white">
                  <SelectValue placeholder="Select wallet" />
                </SelectTrigger>
                <SelectContent>
                  {activeWallets.map((wallet) => (
                    <SelectItem key={wallet.id} value={String(wallet.id)}>
                      {getWalletDisplayName(wallet)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTransferFromWallet ? (
                <p className="mt-1 text-xs text-slate-400">
                  Spendable: {formatPhp(getWalletSpendableBalance(selectedTransferFromWallet))}
                </p>
              ) : null}
            </div>
            <div>
              <Label className="mb-1 block text-xs text-slate-200">To Wallet</Label>
              <Select
                value={transferForm.to_wallet_id}
                onValueChange={(value) =>
                  setTransferForm((prev) => ({ ...prev, to_wallet_id: value }))
                }
              >
                <SelectTrigger className="border-slate-700 bg-[#071a34] text-white">
                  <SelectValue placeholder="Select wallet" />
                </SelectTrigger>
                <SelectContent>
                  {activeWallets
                    .filter(
                      (wallet) => String(wallet.id) !== String(transferForm.from_wallet_id),
                    )
                    .map((wallet) => (
                      <SelectItem key={wallet.id} value={String(wallet.id)}>
                        {getWalletDisplayName(wallet)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {selectedTransferToWallet ? (
                <p className="mt-1 text-xs text-slate-400">
                  Destination balance: {formatPhp(getWalletDisplayBalance(selectedTransferToWallet))}
                </p>
              ) : null}
            </div>
            <div>
              <Label className="mb-1 block text-xs text-slate-200">Note (optional)</Label>
              <Input
                placeholder="Transfer details"
                value={transferForm.notes}
                onChange={(event) =>
                  setTransferForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                className="border-slate-700 bg-[#071a34] text-white"
              />
            </div>
            <p className="text-[11px] leading-4 text-slate-500">
              Date and time are recorded automatically when you save.
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {!activeWallets.length && !loadingWallets ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            No active wallet is available yet.
          </div>
        ) : null}

        <Button
          onClick={handleSubmit}
          disabled={isDisabled}
          className="mt-3 w-full bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {saving
            ? "Saving..."
            : actionType === "expense"
              ? "Add Expense"
              : actionType === "income"
                ? "Add Funds"
                : "Transfer Money"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
