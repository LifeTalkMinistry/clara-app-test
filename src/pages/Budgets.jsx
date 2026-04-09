import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Target, Lock, RotateCcw, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import useUserRole from "../hooks/useUserRole";
import { supabase } from "../lib/supabaseClient";

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const isOwnedByUser = (item, user) => {
  if (!item || !user) return false;

  const userEmail = normalizeText(user.email);
  const userId = normalizeText(user.id);

  const values = [
    item?.created_by,
    item?.email,
    item?.user_email,
    item?.userEmail,
    item?.owner_email,
    item?.user_id,
    item?.userId,
    item?.created_by_id,
    item?.owner_id,
  ]
    .filter(Boolean)
    .map(normalizeText);

  return values.includes(userEmail) || values.includes(userId);
};

const getItemDate = (item) => {
  const raw =
    item?.date ||
    item?.expense_date ||
    item?.created_at ||
    item?.timestamp ||
    item?.transaction_date ||
    item?.datetime;

  const d = raw ? new Date(raw) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

const getExpenseAmount = (item) => {
  return Math.abs(
    toNumber(
      item?.amount ??
        item?.value ??
        item?.spent ??
        item?.expense_amount ??
        item?.transaction_amount ??
        item?.total ??
        0
    )
  );
};

const getExpenseType = (item) => {
  return normalizeText(
    item?.type ||
      item?.category ||
      item?.category_type ||
      item?.classification ||
      item?.expense_type ||
      item?.bucket ||
      item?.budget_type ||
      item?.label
  );
};

const getMonthKey = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const pad = (n) => String(n).padStart(2, "0");

const toDateTimeLocalValue = (value) => {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const startOfMonthLocal = (date) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfMonthLocal = (date) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
};

const monthKeyToRange = (monthKey) => {
  if (!monthKey || !monthKey.includes("-")) {
    const now = new Date();
    return {
      start: startOfMonthLocal(now).toISOString(),
      end: endOfMonthLocal(now).toISOString(),
    };
  }

  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
};

const formatRangeText = (start, end) => {
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;

  if (
    !startDate ||
    !endDate ||
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    return "No range selected";
  }

  return `${startDate.toLocaleString("en-PH")} → ${endDate.toLocaleString("en-PH")}`;
};

const getBudgetStart = (budget, fallback) =>
  budget?.tracking_start_date ||
  budget?.range_start_datetime ||
  budget?.range_start ||
  fallback;

const getBudgetEnd = (budget, fallback) =>
  budget?.tracking_end_date ||
  budget?.range_end_datetime ||
  budget?.range_end ||
  fallback;

const isMissingBudgetsTableError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  const details = String(error?.details || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();

  return (
    code === "pgrst205" ||
    message.includes("could not find the table") ||
    message.includes("schema cache") ||
    message.includes("public.budgets") ||
    details.includes("public.budgets")
  );
};

const showBudgetsTableMissingAlert = () => {
  alert(
    "Supabase table 'budgets' does not exist yet. Please create the public.budgets table first in your Supabase SQL Editor."
  );
};

export default function Budgets() {
  const { user, isFree } = useUserRole();

  const [open, setOpen] = useState(false);
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [resetting, setResetting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const currentMonth = getMonthKey(now);
  const defaultRange = monthKeyToRange(currentMonth);

  const [form, setForm] = useState({
    month: currentMonth,
    total_budget: "",
    needs_pct: "50",
    wants_pct: "30",
    savings_pct: "20",
    range_start: toDateTimeLocalValue(defaultRange.start),
    range_end: toDateTimeLocalValue(defaultRange.end),
  });

  const refreshPageData = useCallback(async () => {
    if (!user) {
      setBudgets([]);
      setExpenses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [budgetRes, expenseRes] = await Promise.all([
        supabase.from("budgets").select("*").order("created_at", { ascending: false }),
        supabase.from("expenses").select("*").order("created_at", { ascending: false }),
      ]);

      if (budgetRes.error) {
        if (isMissingBudgetsTableError(budgetRes.error)) {
          console.error("Missing budgets table:", budgetRes.error);
          setBudgets([]);
        } else {
          throw budgetRes.error;
        }
      } else {
        const safeBudgets = (budgetRes.data || []).filter((item) => isOwnedByUser(item, user));
        setBudgets(safeBudgets);
      }

      if (expenseRes.error) {
        console.error("Failed to load expenses:", expenseRes.error);
        setExpenses([]);
      } else {
        const safeExpenses = (expenseRes.data || []).filter((item) => isOwnedByUser(item, user));
        setExpenses(safeExpenses);
      }
    } catch (error) {
      console.error("Failed to load budgets page data:", error);
      setBudgets([]);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshPageData();
  }, [refreshPageData]);

  useEffect(() => {
    if (!user) return;

    const budgetsChannel = supabase
      .channel(`budgets-page-budgets-${user.id || user.email}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "budgets" }, () => {
        refreshPageData();
      })
      .subscribe();

    const expensesChannel = supabase
      .channel(`budgets-page-expenses-${user.id || user.email}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => {
        refreshPageData();
      })
      .subscribe();

    const onRefresh = () => refreshPageData();
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshPageData();
      }
    };

    window.addEventListener("focus", onRefresh);
    window.addEventListener("clara-expenses-updated", onRefresh);
    window.addEventListener("clara-budgets-updated", onRefresh);
    window.addEventListener("clara-finance-updated", onRefresh);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("clara-expenses-updated", onRefresh);
      window.removeEventListener("clara-budgets-updated", onRefresh);
      window.removeEventListener("clara-finance-updated", onRefresh);
      document.removeEventListener("visibilitychange", onVisibility);
      supabase.removeChannel(budgetsChannel);
      supabase.removeChannel(expensesChannel);
    };
  }, [refreshPageData, user]);

  const currentBudget = useMemo(() => {
    const exactMonth = budgets.find((b) => b.month === currentMonth);
    if (exactMonth) return exactMonth;

    return (
      budgets
        .slice()
        .sort((a, b) => {
          const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
          const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
          return bTime - aTime;
        })[0] || null
    );
  }, [budgets, currentMonth]);

  useEffect(() => {
    if (currentBudget) {
      const fallbackRange = monthKeyToRange(currentBudget.month || currentMonth);

      setForm({
        month: currentBudget.month || currentMonth,
        total_budget: String(currentBudget.total_budget ?? ""),
        needs_pct: String(currentBudget.needs_pct ?? currentBudget.needs_percent ?? 50),
        wants_pct: String(currentBudget.wants_pct ?? currentBudget.wants_percent ?? 30),
        savings_pct: String(currentBudget.savings_pct ?? currentBudget.savings_percent ?? 20),
        range_start: toDateTimeLocalValue(
          getBudgetStart(currentBudget, fallbackRange.start)
        ),
        range_end: toDateTimeLocalValue(
          getBudgetEnd(currentBudget, fallbackRange.end)
        ),
      });
    } else {
      const freshRange = monthKeyToRange(currentMonth);

      setForm({
        month: currentMonth,
        total_budget: "",
        needs_pct: "50",
        wants_pct: "30",
        savings_pct: "20",
        range_start: toDateTimeLocalValue(freshRange.start),
        range_end: toDateTimeLocalValue(freshRange.end),
      });
    }
  }, [currentBudget, currentMonth]);

  const activeRangeStart = useMemo(() => {
    const fallback = monthKeyToRange(currentBudget?.month || currentMonth).start;
    const raw = getBudgetStart(currentBudget, fallback);
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [currentBudget, currentMonth]);

  const activeRangeEnd = useMemo(() => {
    const fallback = monthKeyToRange(currentBudget?.month || currentMonth).end;
    const raw = getBudgetEnd(currentBudget, fallback);
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [currentBudget, currentMonth]);

  const financials = useMemo(() => {
    const result = {
      totalSpent: 0,
      needsSpent: 0,
      wantsSpent: 0,
      savingsSpent: 0,
    };

    if (!activeRangeStart || !activeRangeEnd) return result;

    expenses.forEach((item) => {
      const d = getItemDate(item);
      if (!d) return;
      if (d < activeRangeStart || d > activeRangeEnd) return;

      const amount = getExpenseAmount(item);
      const type = getExpenseType(item);

      result.totalSpent += amount;

      if (type === "needs" || type === "need") {
        result.needsSpent += amount;
      } else if (type === "wants" || type === "want") {
        result.wantsSpent += amount;
      } else if (type === "savings" || type === "saving") {
        result.savingsSpent += amount;
      }
    });

    return result;
  }, [expenses, activeRangeStart, activeRangeEnd]);

  const handleMonthChange = (monthValue) => {
    const nextRange = monthKeyToRange(monthValue);

    setForm((prev) => ({
      ...prev,
      month: monthValue,
      range_start: toDateTimeLocalValue(nextRange.start),
      range_end: toDateTimeLocalValue(nextRange.end),
    }));
  };

  const handleSubmit = async () => {
    if (!form.total_budget || isFree || !user?.email) return;

    const totalBudget = toNumber(form.total_budget);
    const needsPct = toNumber(form.needs_pct);
    const wantsPct = toNumber(form.wants_pct);
    const savingsPct = toNumber(form.savings_pct);

    const rangeStart = form.range_start ? new Date(form.range_start) : null;
    const rangeEnd = form.range_end ? new Date(form.range_end) : null;

    if (totalBudget <= 0) {
      alert("Please enter a valid total budget.");
      return;
    }

    if (needsPct + wantsPct + savingsPct !== 100) {
      alert("Needs, Wants, and Savings must total exactly 100%.");
      return;
    }

    if (!rangeStart || Number.isNaN(rangeStart.getTime())) {
      alert("Please select a valid start date and time.");
      return;
    }

    if (!rangeEnd || Number.isNaN(rangeEnd.getTime())) {
      alert("Please select a valid end date and time.");
      return;
    }

    if (rangeEnd <= rangeStart) {
      alert("End date/time must be later than start date/time.");
      return;
    }

    try {
      setSaving(true);

      const existing = budgets.find((b) => b.month === form.month);

      const payload = {
        month: form.month,
        total_budget: totalBudget,

        needs_pct: needsPct,
        wants_pct: wantsPct,
        savings_pct: savingsPct,

        needs_percent: needsPct,
        wants_percent: wantsPct,
        savings_percent: savingsPct,

        tracking_start_date: rangeStart.toISOString(),
        tracking_end_date: rangeEnd.toISOString(),

        range_start: rangeStart.toISOString(),
        range_end: rangeEnd.toISOString(),

        is_manual_range: true,
        updated_at: new Date().toISOString(),
      };

      let result;

      if (existing?.id) {
        result = await supabase.from("budgets").update(payload).eq("id", existing.id);
      } else {
        result = await supabase.from("budgets").insert([
          {
            ...payload,
            created_at: new Date().toISOString(),
            created_by: user.email,
            email: user.email,
            user_id: user.id || null,
          },
        ]);
      }

      if (result.error) {
        console.error("Budget save error:", result.error);

        if (isMissingBudgetsTableError(result.error)) {
          showBudgetsTableMissingAlert();
        } else {
          alert(result.error.message || "Failed to save budget to Supabase.");
        }
        return;
      }

      await refreshPageData();
      window.dispatchEvent(new Event("clara-budgets-updated"));
      window.dispatchEvent(new Event("clara-finance-updated"));
      setOpen(false);
    } catch (error) {
      console.error("Failed to save budget:", error);

      if (isMissingBudgetsTableError(error)) {
        showBudgetsTableMissingAlert();
      } else {
        alert("Failed to save budget to Supabase.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!currentBudget || !user?.email || resetting) return;

    const confirmReset = window.confirm(
      "Reset tracking start to right now? Expenses before this exact date and time will no longer count."
    );
    if (!confirmReset) return;

    try {
      setResetting(true);

      const nowIso = new Date().toISOString();
      const fallbackEnd = monthKeyToRange(currentBudget.month || currentMonth).end;
      const currentEnd = getBudgetEnd(currentBudget, fallbackEnd);
      const endDate = new Date(currentEnd);

      const safeEnd =
        !Number.isNaN(endDate.getTime()) && endDate > new Date(nowIso)
          ? endDate.toISOString()
          : new Date(new Date(nowIso).getTime() + 60 * 60 * 1000).toISOString();

      const result = await supabase
        .from("budgets")
        .update({
          tracking_start_date: nowIso,
          tracking_end_date: safeEnd,
          range_start: nowIso,
          range_end: safeEnd,
          is_manual_range: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentBudget.id);

      if (result.error) {
        console.error("Budget reset error:", result.error);

        if (isMissingBudgetsTableError(result.error)) {
          showBudgetsTableMissingAlert();
        } else {
          alert(result.error.message || "Failed to reset budget tracking.");
        }
        return;
      }

      await refreshPageData();
      window.dispatchEvent(new Event("clara-budgets-updated"));
      window.dispatchEvent(new Event("clara-expenses-updated"));
      window.dispatchEvent(new Event("clara-finance-updated"));
    } catch (error) {
      console.error("Failed to reset budget tracking:", error);

      if (isMissingBudgetsTableError(error)) {
        showBudgetsTableMissingAlert();
      } else {
        alert("Failed to reset budget tracking.");
      }
    } finally {
      setTimeout(() => setResetting(false), 150);
    }
  };

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(toNumber(n));

  const totalBudget = toNumber(currentBudget?.total_budget);
  const needsBudget = currentBudget
    ? (totalBudget *
        toNumber(
          currentBudget.needs_pct ?? currentBudget.needs_percent ?? 50
        )) /
      100
    : 0;
  const wantsBudget = currentBudget
    ? (totalBudget *
        toNumber(
          currentBudget.wants_pct ?? currentBudget.wants_percent ?? 30
        )) /
      100
    : 0;
  const savingsBudget = currentBudget
    ? (totalBudget *
        toNumber(
          currentBudget.savings_pct ?? currentBudget.savings_percent ?? 20
        )) /
      100
    : 0;

  const totalSpent = toNumber(financials.totalSpent);
  const needsSpent = toNumber(financials.needsSpent);
  const wantsSpent = toNumber(financials.wantsSpent);
  const savingsSpent = toNumber(financials.savingsSpent);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Budgets"
        subtitle="Set your spending limits with a manual date and time range"
        action={
          isFree ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted text-muted-foreground text-xs font-medium">
              <Lock className="w-3.5 h-3.5" /> Upgrade to use budgets
            </div>
          ) : (
            <div className="flex gap-2">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    {currentBudget ? "Edit" : "Set"} Budget
                  </Button>
                </DialogTrigger>

                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {currentBudget ? "Edit" : "Set"} Budget
                    </DialogTitle>
                    <DialogDescription>
                      Set your total budget, category split, and exact clickable date/time range.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <Label>Month</Label>
                      <Input
                        type="month"
                        value={form.month}
                        onChange={(e) => handleMonthChange(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Total Budget (₱)</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={form.total_budget}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            total_budget: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>From</Label>
                        <Input
                          type="datetime-local"
                          value={form.range_start}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              range_start: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div>
                        <Label>To</Label>
                        <Input
                          type="datetime-local"
                          value={form.range_end}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              range_end: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs font-medium mb-3">50/30/20 SPLIT</p>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Needs %</Label>
                          <Input
                            type="number"
                            value={form.needs_pct}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                needs_pct: e.target.value,
                              }))
                            }
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Wants %</Label>
                          <Input
                            type="number"
                            value={form.wants_pct}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                wants_pct: e.target.value,
                              }))
                            }
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Savings %</Label>
                          <Input
                            type="number"
                            value={form.savings_pct}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                savings_pct: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <p className="text-[11px] text-muted-foreground mt-3">
                        Total must equal 100%
                      </p>
                    </div>

                    <Button
                      onClick={handleSubmit}
                      className="w-full"
                      disabled={!form.total_budget || saving}
                    >
                      {saving ? "Saving..." : "Save Budget"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {currentBudget && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReset}
                  disabled={resetting}
                >
                  <RotateCcw
                    className={`w-4 h-4 mr-1 ${resetting ? "animate-spin" : ""}`}
                  />
                  {resetting ? "Resetting..." : "Reset"}
                </Button>
              )}
            </div>
          )
        }
      />

      {!isFree && !loading && !currentBudget && (
        <EmptyState
          icon={Target}
          title="No budget set"
          description="Set your budget and exact calculation range to start tracking."
        />
      )}

      {!isFree && currentBudget && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">BUDGET</p>
                <p className="font-heading text-2xl font-bold">
                  {fmt(totalBudget)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-muted-foreground">SPENT</p>
                <p className="font-heading text-2xl font-bold text-destructive">
                  {fmt(totalSpent)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 mb-4">
              <CalendarRange className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Active Calculation Range
                </p>
                <p className="text-sm font-medium">
                  {formatRangeText(
                    activeRangeStart?.toISOString(),
                    activeRangeEnd?.toISOString()
                  )}
                </p>
              </div>
            </div>

            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  totalSpent > totalBudget ? "bg-destructive" : "bg-primary"
                }`}
                style={{
                  width: `${Math.min(
                    totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
                    100
                  )}%`,
                }}
              />
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              {fmt(Math.max(0, totalBudget - totalSpent))} remaining
            </p>
          </div>

          {[
            {
              label: "Needs",
              budget: needsBudget,
              spent: needsSpent,
              color: "bg-primary",
            },
            {
              label: "Wants",
              budget: wantsBudget,
              spent: wantsSpent,
              color: "bg-secondary",
            },
            {
              label: "Savings",
              budget: savingsBudget,
              spent: savingsSpent,
              color: "bg-accent",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-card rounded-xl border border-border p-4"
            >
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-sm text-muted-foreground">
                  {fmt(item.spent)} / {fmt(item.budget)}
                </span>
              </div>

              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    item.spent > item.budget ? "bg-destructive" : item.color
                  }`}
                  style={{
                    width: `${
                      item.budget > 0
                        ? Math.min((item.spent / item.budget) * 100, 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}