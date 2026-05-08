import { Edit, Trash2, Wallet } from "lucide-react";
import ClaraAssistantPanel from "@/components/ai/ClaraAssistantPanel";
import FinanceActionModal from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceActionModal";
import ManualExpenseFullScreenSheet from "@/components/fresh/main-dashboard/dashboard-primitives/ManualExpenseFullScreenSheet";
import QuickActionDropdown from "@/components/fresh/main-dashboard/dashboard-primitives/QuickActionDropdown";
import FinanceField from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceField";
import {
  financeInputClassName,
  UNDOCUMENTED_SPENDING_REASONS,
} from "@/components/fresh/main-dashboard/finance-form/financeFormConstants";
import {
  getWalletDisplayName,
  getBudgetListTitle,
  getBudgetCategoryKey,
  getWalletDisplayBalance,
  getSavingsGoalTitle,
  getSavingsTarget,
  getSavingsSaved,
} from "@/utils/dashboard/dashboardHelpers";

export default function DashboardFinanceModalRenderer({
  financeModal,
  closeFinanceModal,
  saveManualExpenseInline,
  financeActionLoading,
  financeForm,
  setFinanceForm,
  wallets,
  monthlyBudgetPlan,
  addMoneyInline,
  fmt,
  transferMoneyInline,
  saveWalletInline,
  budgetFormDeclaredAmount,
  budgetCanFinish,
  setBudgetExitConfirm,
  budgetExitConfirm,
  saveBudgetInline,
  budgetProjectedAllocated,
  budgetProjectedUnallocated,
  budgetFinishHelper,
  openBudgetModal,
  openDeleteBudgetCategoryModal,
  deleteBudgetCategoryInline,
  resetBudgetInline,
  saveSavingsGoalInline,
  deleteSavingsGoalInline,
  addSavingsInline,
  dashboardShellReady,
  showAiAssistant,
  setShowAiAssistant,
  claraAssistantContext,
}) {
  return (
    <>
      <ManualExpenseFullScreenSheet
        open={financeModal.type === "manual_expense"}
        onClose={closeFinanceModal}
        onSubmit={(event) => {
          event.preventDefault();
          saveManualExpenseInline();
        }}
        submitDisabled={!manualExpenseCanSubmit}
        loading={financeActionLoading}
      >
        <FinanceField label="Amount">
          <input
            type="number"
            min="0"
            step="0.01"
            value={financeForm.amount}
            onChange={(event) =>
              setFinanceForm((prev) => ({ ...prev, amount: event.target.value }))
            }
            placeholder="0"
            className={`${financeInputClassName} min-h-[68px] rounded-[24px] px-5 text-3xl font-bold tracking-tight placeholder:text-white/25 focus:border-emerald-300/40 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.10)]`}
          />
        </FinanceField>

        <FinanceField
          label="Budget List"
          helper="Choose where this expense belongs in your active monthly budget."
        >
          <QuickActionDropdown
            value={financeForm.budgetListKey}
            placeholder="Select budget list"
            ariaLabel="Select budget list"
            options={manualExpenseBudgetListItems.map((item) => ({
              value: item.key,
              label: item.title,
              subtitle: item.subtitle,
              tone: item.tone,
              disabled: item.disabled,
              onDisabledClick: () =>
                showFinanceNotice("You haven’t completed your monthly budgeting plan yet. Finish assigning your budget before logging planned expenses."),
            }))}
            onChange={(nextValue) => setManualExpenseBudgetListKey(nextValue)}
          />
        </FinanceField>

        <FinanceField label="Wallet">
          <QuickActionDropdown
            value={financeForm.expenseWalletId}
            placeholder="Select wallet"
            ariaLabel="Select wallet for expense"
            options={wallets.map((wallet) => ({
              value: String(wallet.id),
              label: getWalletDisplayName(wallet),
              subtitle: `Available • ${fmt(getWalletDisplayBalance(wallet))}`,
              tone: "neutral",
            }))}
            onChange={(nextValue) =>
              setFinanceForm((prev) => ({
                ...prev,
                expenseWalletId: nextValue,
              }))
            }
          />
        </FinanceField>

        {manualExpenseIsUnplanned ? (
          <div className="rounded-[24px] border border-amber-300/18 bg-amber-500/10 p-4 shadow-[0_14px_34px_rgba(245,158,11,0.08)]">
            <p className="mb-3 text-xs leading-5 text-amber-50/80">
              This is outside your monthly budget. Please explain the purpose before logging.
            </p>
            <FinanceField label="Purpose / Reason">
              <textarea
                rows={3}
                value={financeForm.unplannedReason || ""}
                onChange={(event) =>
                  setFinanceForm((prev) => ({
                    ...prev,
                    unplannedReason: event.target.value,
                    notes: event.target.value,
                  }))
                }
                placeholder="What is this for?"
                className={`${financeInputClassName} min-h-[96px] resize-none`}
              />
            </FinanceField>
          </div>
        ) : manualExpenseIsUndocumented ? (
          <div className="rounded-[24px] border border-cyan-300/18 bg-cyan-500/10 p-4 shadow-[0_14px_34px_rgba(34,211,238,0.08)]">
            <p className="mb-3 text-xs leading-5 text-cyan-50/80">
              No worries. Choose the closest reason so CLARA can keep your records clean.
            </p>

            <FinanceField label="Undocumented Reason">
              <QuickActionDropdown
                value={financeForm.undocumentedReason || ""}
                placeholder="Why is this undocumented?"
                ariaLabel="Select undocumented spending reason"
                options={UNDOCUMENTED_SPENDING_REASONS.map((reasonOption) => ({
                  value: reasonOption,
                  label: reasonOption,
                  tone: reasonOption === "Other undocumented reason" ? "cyan" : "neutral",
                }))}
                onChange={(nextValue) =>
                  setFinanceForm((prev) => ({
                    ...prev,
                    undocumentedReason: nextValue,
                  }))
                }
              />
            </FinanceField>

            {financeForm.undocumentedReason === "Other undocumented reason" ? (
              <div className="mt-3">
                <FinanceField label="Optional note">
                  <input
                    type="text"
                    value={financeForm.undocumentedNote || ""}
                    onChange={(event) =>
                      setFinanceForm((prev) => ({
                        ...prev,
                        undocumentedNote: event.target.value,
                      }))
                    }
                    placeholder="Add a short note, if needed"
                    className={financeInputClassName}
                  />
                </FinanceField>
              </div>
            ) : null}
          </div>
        ) : selectedManualExpenseBudget ? (
          <div className="rounded-[24px] border border-emerald-300/15 bg-emerald-500/10 px-4 py-3 shadow-[0_14px_34px_rgba(16,185,129,0.08)] text-xs leading-5 text-emerald-50/75">
            This will be saved as a planned expense under {selectedManualExpenseBudget.title}.
          </div>
        ) : null}
      </ManualExpenseFullScreenSheet>

      <FinanceActionModal
        open={financeModal.type === "save_budget"}
        title={
          !monthlyBudgetPlan.declared_budget && !financeModal.payload?.id
            ? "Declare monthly budget"
            : financeModal.payload?.id
              ? "Edit budget category"
              : "Budget discipline mode"
        }
        description={
          !monthlyBudgetPlan.declared_budget && !financeModal.payload?.id
            ? "Start by declaring the total money you plan to spend this month."
            : `Assign every peso from your ${getPHMonthKey()} budget into categories.`
        }
        onClose={handleBudgetModalClose}
        onSubmit={(event) => {
          event.preventDefault();
          saveBudgetInline({ exitAfterSave: true, saveCategory: false });
        }}
        submitLabel="Save Draft"
        loading={financeActionLoading}
      >
        {budgetExitConfirm ? (
          <div className="rounded-3xl border border-amber-300/20 bg-amber-500/10 p-4">
            <p className="text-sm font-bold text-amber-50">Your budget is not fully assigned yet.</p>
            <p className="mt-2 text-xs leading-5 text-amber-50/75">
              Save as draft before leaving so you can continue later.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2">
              <button
                type="button"
                disabled={financeActionLoading}
                onClick={() => saveBudgetInline({ exitAfterSave: true, saveCategory: false })}
                className="rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(16,185,129,0.22)] disabled:opacity-60"
              >
                Save Draft and Exit
              </button>
              <button
                type="button"
                onClick={() => setBudgetExitConfirm(false)}
                className="rounded-2xl border border-white/15 bg-white/[0.075] px-4 py-3 text-sm font-medium text-white/75 transition hover:bg-white/[0.08] hover:text-white"
              >
                Continue Budgeting
              </button>
            </div>
          </div>
        ) : null}

        <FinanceField
          label="Declared monthly budget amount"
          helper="This is the total money you plan to spend for the month."
        >
          <input
            type="number"
            min="0"
            step="0.01"
            value={financeForm.monthlyBudgetAmount}
            onChange={(event) =>
              setFinanceForm((prev) => ({
                ...prev,
                monthlyBudgetAmount: event.target.value,
              }))
            }
            placeholder="25000"
            className={financeInputClassName}
          />
        </FinanceField>

        {budgetFormDeclaredAmount > 0 ? (
          <div className="rounded-3xl border border-white/15 bg-white/[0.075] p-4 text-xs leading-5 text-white/70">
            <div className="flex items-center justify-between gap-3">
              <span>Declared budget</span>
              <strong className="text-white">{fmt(budgetFormDeclaredAmount)}</strong>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span>Allocated so far</span>
              <strong className="text-white">{fmt(budgetProjectedAllocated)}</strong>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span>Unallocated balance</span>
              <strong className={budgetProjectedUnallocated === 0 ? "text-emerald-200" : "text-amber-100"}>
                {fmt(budgetProjectedUnallocated)}
              </strong>
            </div>

            {budgetFinishHelper ? (
              <p className="mt-3 rounded-2xl border border-amber-300/15 bg-amber-500/10 px-3 py-2 text-[11px] leading-5 text-amber-50/80">
                {budgetFinishHelper}
              </p>
            ) : null}
          </div>
        ) : null}

        {budgetFormDeclaredAmount > 0 ? (
          <div className="rounded-3xl border border-white/15 bg-white/[0.035] p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-white/55">
              Add budget category
            </p>

            <div className="space-y-4">
              <FinanceField label="Category name">
                <input
                  type="text"
                  value={financeForm.budgetCategoryName || ""}
                  onChange={(event) =>
                    setFinanceForm((prev) => ({
                      ...prev,
                      budgetCategoryName: event.target.value,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Bills, Food, Transportation..."
                  className={financeInputClassName}
                />
              </FinanceField>

              <FinanceField label="Allocated amount">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={financeForm.totalBudget}
                  onChange={(event) =>
                    setFinanceForm((prev) => ({
                      ...prev,
                      totalBudget: event.target.value,
                    }))
                  }
                  placeholder="0"
                  className={financeInputClassName}
                />
              </FinanceField>

              <button
                type="button"
                disabled={financeActionLoading}
                onClick={() => saveBudgetInline({ exitAfterSave: false, saveCategory: true })}
                className="w-full rounded-2xl border border-emerald-300/20 bg-emerald-500/12 px-4 py-3 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-500/18 disabled:opacity-60"
              >
                {financeModal.payload?.id ? "Update Category" : "Add Category"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="rounded-3xl border border-white/15 bg-white/[0.035] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-white">Added categories</p>
            <span className="rounded-full border border-white/15 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-white/60">
              {monthlyBudgetPlan.categories.length}
            </span>
          </div>

          {monthlyBudgetPlan.categories.length ? (
            <div className="space-y-2">
              {monthlyBudgetPlan.categories.map((item) => (
                <div
                  key={item.key || item.id || item.title}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-black/15 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-0.5 text-xs text-white/50">{fmt(item.allocated)} allocated</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openBudgetModal(item)}
                      className="flex h-8 w-8 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.075] text-white/70 transition hover:bg-white/10 hover:text-white"
                      aria-label={`Edit ${item.title}`}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteBudgetCategoryModal(item)}
                      className="flex h-8 w-8 items-center justify-center rounded-2xl border border-rose-300/15 bg-rose-500/10 text-rose-100/80 transition hover:bg-rose-500/15 hover:text-rose-100"
                      aria-label={`Remove ${item.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/15 bg-black/15 px-4 py-4 text-sm text-white/55">
              No categories added yet.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            disabled={financeActionLoading}
            onClick={() => saveBudgetInline({ exitAfterSave: true, saveCategory: false })}
            className="rounded-2xl border border-white/15 bg-white/[0.075] px-4 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-60"
          >
            Save Draft
          </button>

          <button
            type="button"
            disabled={!budgetCanFinish || financeActionLoading}
            onClick={() => saveBudgetInline({ finish: true, exitAfterSave: true, saveCategory: false })}
            className="rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(16,185,129,0.24)] transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            Finish Budget
          </button>
        </div>
      </FinanceActionModal>

      <FinanceActionModal
        open={financeModal.type === "delete_budget_category"}
        title="Remove budget category"
        description="If this category already has linked expenses, CLARA will deactivate it instead of deleting history."
        onClose={closeFinanceModal}
        onSubmit={(event) => {
          event.preventDefault();
          deleteBudgetCategoryInline();
        }}
        submitLabel="Remove category"
        loading={financeActionLoading}
        danger
      >
        <div className="rounded-2xl border border-amber-400/15 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          Remove {financeModal.payload ? getBudgetListTitle(financeModal.payload) : "this category"} from this month’s spending plan?
        </div>
      </FinanceActionModal>

      <FinanceActionModal
        open={financeModal.type === "reset_budget"}
        title="Reset budget tracking"
        description="Start the active budget tracking window from right now."
        onClose={closeFinanceModal}
        onSubmit={(event) => {
          event.preventDefault();
          resetBudgetInline();
        }}
        submitLabel="Reset tracking"
        loading={financeActionLoading}
        danger
      >
        <div className="rounded-2xl border border-yellow-400/15 bg-yellow-500/10 p-4 text-sm leading-6 text-yellow-100">
          This keeps your budget setup, but it resets the tracking start date to now.
        </div>
      </FinanceActionModal>

      <FinanceActionModal
        open={financeModal.type === "save_savings_goal"}
        title={financeModal.payload?.id ? "Edit savings goal" : "New Savings Goal"}
        description={null}
        onClose={closeFinanceModal}
        onSubmit={(event) => {
          event.preventDefault();
          saveSavingsGoalInline();
        }}
        submitLabel={financeModal.payload?.id ? "Save changes" : "Create goal"}
        loading={financeActionLoading}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FinanceField label="Goal title">
            <input
              type="text"
              value={financeForm.title}
              onChange={(event) =>
                setFinanceForm((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="e.g., Emergency Fund, Dream Vacation"
              className={financeInputClassName}
            />
          </FinanceField>

          <FinanceField label="Category">
            <input
              type="text"
              value={financeForm.category || ""}
              onChange={(event) =>
                setFinanceForm((prev) => ({ ...prev, category: event.target.value }))
              }
              placeholder="e.g. Travel, Emergency, Gadget"
              className={financeInputClassName}
            />
          </FinanceField>

          <FinanceField label="Subcategory">
            <input
              type="text"
              value={financeForm.subcategory || ""}
              onChange={(event) =>
                setFinanceForm((prev) => ({ ...prev, subcategory: event.target.value }))
              }
              placeholder="e.g. Local Trip, Repairs, Phone"
              className={financeInputClassName}
            />
          </FinanceField>

          <FinanceField label="Target amount">
            <input
              type="number"
              min="0"
              step="0.01"
              value={financeForm.targetAmount}
              onChange={(event) =>
                setFinanceForm((prev) => ({
                  ...prev,
                  targetAmount: event.target.value,
                }))
              }
              placeholder="Target ₱"
              className={financeInputClassName}
            />
          </FinanceField>

          <FinanceField label="Already saved">
            <input
              type="number"
              min="0"
              step="0.01"
              value={financeForm.amount}
              onChange={(event) =>
                setFinanceForm((prev) => ({
                  ...prev,
                  amount: event.target.value,
                }))
              }
              placeholder="0"
              className={financeInputClassName}
            />
          </FinanceField>

          <FinanceField label="Source wallet">
            <select
              value={financeForm.savingsWalletId || ""}
              onChange={(event) =>
                setFinanceForm((prev) => ({
                  ...prev,
                  savingsWalletId: event.target.value,
                }))
              }
              className={financeInputClassName}
            >
              <option value="">Select wallet...</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={String(wallet.id)}>
                  {getWalletDisplayName(wallet)}
                </option>
              ))}
            </select>
          </FinanceField>

          <FinanceField label="Planned use date">
            <input
              type="date"
              value={financeForm.plannedUseDate || ""}
              onChange={(event) =>
                setFinanceForm((prev) => ({
                  ...prev,
                  plannedUseDate: event.target.value,
                }))
              }
              className={financeInputClassName}
            />
          </FinanceField>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/72">
            3 reasons / motivations
          </p>

          <input
            type="text"
            value={financeForm.reasonOne || ""}
            onChange={(event) =>
              setFinanceForm((prev) => ({ ...prev, reasonOne: event.target.value }))
            }
            placeholder="Reason 1"
            className={financeInputClassName}
          />

          <input
            type="text"
            value={financeForm.reasonTwo || ""}
            onChange={(event) =>
              setFinanceForm((prev) => ({ ...prev, reasonTwo: event.target.value }))
            }
            placeholder="Reason 2"
            className={financeInputClassName}
          />

          <input
            type="text"
            value={financeForm.reasonThree || ""}
            onChange={(event) =>
              setFinanceForm((prev) => ({ ...prev, reasonThree: event.target.value }))
            }
            placeholder="Reason 3"
            className={financeInputClassName}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FinanceField label="Emotional value">
            <select
              value={financeForm.emotionalValue || "joy"}
              onChange={(event) =>
                setFinanceForm((prev) => ({
                  ...prev,
                  emotionalValue: event.target.value,
                }))
              }
              className={financeInputClassName}
            >
              <option value="joy">Joy 😊</option>
              <option value="peace">Peace 😌</option>
              <option value="security">Security 🛡️</option>
              <option value="freedom">Freedom ✨</option>
              <option value="love">Love ❤️</option>
            </select>
          </FinanceField>

          <FinanceField label="Priority">
            <select
              value={financeForm.priority || "medium"}
              onChange={(event) =>
                setFinanceForm((prev) => ({
                  ...prev,
                  priority: event.target.value,
                }))
              }
              className={financeInputClassName}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </FinanceField>

          <FinanceField label="Flexibility">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setFinanceForm((prev) => ({ ...prev, flexibility: "flexible" }))
                }
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  (financeForm.flexibility || "flexible") === "flexible"
                    ? "border-emerald-400/30 bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 text-white shadow-[0_10px_30px_rgba(16,185,129,0.24)]"
                    : "border-white/15 bg-white/[0.075] text-white/75 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                Flexible
              </button>

              <button
                type="button"
                onClick={() =>
                  setFinanceForm((prev) => ({ ...prev, flexibility: "must_have" }))
                }
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  (financeForm.flexibility || "flexible") === "must_have"
                    ? "border-emerald-400/30 bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 text-white shadow-[0_10px_30px_rgba(16,185,129,0.24)]"
                    : "border-white/15 bg-white/[0.075] text-white/75 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                Must Have
              </button>
            </div>
          </FinanceField>
        </div>

        <FinanceField label="Notes">
          <textarea
            rows={4}
            value={financeForm.notes || ""}
            onChange={(event) =>
              setFinanceForm((prev) => ({ ...prev, notes: event.target.value }))
            }
            placeholder="Add extra context, reminders, or details for this goal."
            className={`${financeInputClassName} resize-none`}
          />
        </FinanceField>
      </FinanceActionModal>

      <FinanceActionModal
        open={financeModal.type === "delete_savings_goal"}
        title="Delete savings goal"
        description={`Remove ${getSavingsGoalTitle(financeModal.payload)} from your savings list?`}
        onClose={closeFinanceModal}
        onSubmit={(event) => {
          event.preventDefault();
          deleteSavingsGoalInline();
        }}
        submitLabel="Delete goal"
        loading={financeActionLoading}
        danger
      >
        <div className="rounded-2xl border border-rose-400/15 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
          This deletes the selected goal from the card details section.
        </div>
      </FinanceActionModal>

      <FinanceActionModal
        open={financeModal.type === "add_savings"}
        title="Add to savings goal"
        description={`Move money into ${getSavingsGoalTitle(financeModal.payload)} using one of your wallets.`}
        onClose={closeFinanceModal}
        onSubmit={(event) => {
          event.preventDefault();
          addSavingsInline();
        }}
        submitLabel="Add savings"
        loading={financeActionLoading}
      >
        <FinanceField label="Source wallet">
          <select
            value={financeForm.savingsWalletId}
            onChange={(event) =>
              setFinanceForm((prev) => ({
                ...prev,
                savingsWalletId: event.target.value,
              }))
            }
            className={financeInputClassName}
          >
            {wallets
              .filter((wallet) => getWalletDisplayBalance(wallet) > 0)
              .map((wallet) => (
                <option key={wallet.id} value={String(wallet.id)}>
                  {getWalletDisplayName(wallet)} • {fmt(getWalletDisplayBalance(wallet))}
                </option>
              ))}
          </select>
        </FinanceField>

        <FinanceField
          label="Amount"
          helper={`Remaining target: ${fmt(
            Math.max(
              getSavingsTarget(financeModal.payload) -
                getSavingsSaved(financeModal.payload),
              0
            )
          )}`}
        >
          <input
            type="number"
            min="0"
            step="0.01"
            value={financeForm.amount}
            onChange={(event) =>
              setFinanceForm((prev) => ({ ...prev, amount: event.target.value }))
            }
            placeholder="0"
            className={financeInputClassName}
          />
        </FinanceField>
      </FinanceActionModal>

      {dashboardShellReady ? (
        <ClaraAssistantPanel
          open={showAiAssistant}
          onClose={() => setShowAiAssistant(false)}
          context={claraAssistantContext}
        />
      ) : null}
    </>
  );
}
