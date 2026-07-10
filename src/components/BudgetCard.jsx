import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, KeyRound, Smartphone } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import useBudgetCardLogic from "@/components/financial-carousel/cards/budget/logic/useBudgetCardLogic";
import BudgetCardContent from "@/components/financial-carousel/cards/budget/ui/BudgetCardContent";
import FinanceCardShell from "@/components/financial-carousel/shared/FinanceCardShell";
import { useAuth } from "@/context/AuthContext";
import { writeDeveloperMembershipPreview } from "@/lib/membership";
import { getOrCreateLocalVaultId } from "@/lib/local-user-identity";
import { resetLocalClaraJourney } from "@/lib/reset-local-clara-journey";
import {
  hasHiddenAdminSession,
  verifyHiddenAdminPassword,
} from "@/lib/ios-access-client";

const BUDGET_GLOW_LAYERS = [
  "pointer-events-none absolute -left-[132px] -top-[148px] z-[1] h-[270px] w-[270px] rounded-full bg-teal-300/[0.085] blur-[78px]",
  "pointer-events-none absolute -right-[132px] -top-[72px] z-[1] h-[270px] w-[270px] rounded-full bg-cyan-500/[0.055] blur-[86px]",
  "pointer-events-none absolute bottom-[-212px] right-[-132px] z-[1] h-[310px] w-[310px] rounded-full bg-indigo-700/[0.10] blur-[94px]",
  "pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_12%_0%,rgba(45,212,191,0.125),transparent_31%),radial-gradient(circle_at_86%_98%,rgba(79,70,229,0.115),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.012)_36%,rgba(0,0,0,0.18)_100%)]",
  "pointer-events-none absolute inset-x-0 top-0 z-[3] h-24 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.058),rgba(255,255,255,0.012)_42%,transparent)]",
  "pointer-events-none absolute inset-0 z-[3] rounded-[inherit] ring-1 ring-inset ring-teal-100/[0.055]",
];

const PLAN_PREVIEW_OPTIONS = [
  {
    label: "Free Preview",
    helper: "View the complete Free Version experience.",
    badge: "FREE",
    value: { plan: "free", membershipStatus: "not_committed" },
  },
  {
    label: "Committed — Active Preview",
    helper: "View the fully activated Committed Version.",
    badge: "ACTIVE",
    value: { plan: "committed_249", membershipStatus: "active" },
  },
];

function getErrorMessage(error) {
  return error?.message || "Local journey reset failed. Please try again.";
}

export default function BudgetCard({
  activeBudget = null,
  budgetCategories = [],
  declaredBudget = 0,
  unallocatedAmount = 0,
  isComplete = false,
  unplannedSpent = 0,
  undocumentedSpent = 0,
  unplannedItems = [],
  undocumentedItems = [],
  outsidePlanItems = [],
  expanded = false,
  onToggleDetails,
  financeActionLoading = false,
  onEditBudgetCategory,
  onDeleteBudgetCategory,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshProfile } = useAuth();
  const cardRef = useRef(null);
  const [showPlanPreview, setShowPlanPreview] = useState(false);
  const [showAdminPasswordPrompt, setShowAdminPasswordPrompt] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminPasswordError, setAdminPasswordError] = useState("");
  const [verifyingAdminPassword, setVerifyingAdminPassword] = useState(false);
  const [resetError, setResetError] = useState("");
  const [isResettingJourney, setIsResettingJourney] = useState(false);

  const {
    categories,
    declared,
    allocated,
    spent,
    remaining,
    unallocated,
    progress,
    hasDeclaredBudget,
    planIsComplete,
    status,
    message,
    remainingAmountColor,
    monthKey,
    badgeLabel,
    budgetPace,
  } = useBudgetCardLogic({
    activeBudget,
    budgetCategories,
    declaredBudget,
    unallocatedAmount,
    isComplete,
  });

  const openBudgetPlanPage = () => {
    navigate("/budget-plan");
  };

  const openBudgetCategoryOnPlanPage = (item) => {
    const id = item?.id || item?.key || item?.budget?.id || null;

    navigate("/budget-plan", {
      state: id ? { editCategoryId: String(id) } : undefined,
    });
  };

  const openProtectedHiddenAdmin = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    setResetError("");
    setAdminPasswordError("");

    if (hasHiddenAdminSession()) {
      setShowPlanPreview(true);
      return;
    }

    setAdminPassword("");
    setShowAdminPassword(false);
    setShowAdminPasswordPrompt(true);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    if (params.get("hiddenAdmin") !== "1") return;

    if (hasHiddenAdminSession()) {
      setShowPlanPreview(true);
    }

    navigate("/dashboard", { replace: true });
  }, [location.search, navigate]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return undefined;

    const titleNode = Array.from(card.querySelectorAll("p")).find(
      (node) => node.textContent?.trim() === "Budget"
    );

    if (!titleNode) return undefined;

    let lastTitleTapAt = 0;

    const handleTitleClick = (event) => {
      const now = Date.now();
      const clickedTwice = event.detail >= 2 || now - lastTitleTapAt <= 520;
      lastTitleTapAt = now;

      if (clickedTwice) {
        openProtectedHiddenAdmin(event);
      }
    };

    titleNode.classList.add("cursor-pointer", "select-none");
    titleNode.style.touchAction = "manipulation";
    titleNode.addEventListener("click", handleTitleClick, true);

    return () => {
      titleNode.removeEventListener("click", handleTitleClick, true);
      titleNode.style.touchAction = "";
    };
  }, [expanded]);

  const submitAdminPassword = async (event) => {
    event.preventDefault();
    if (verifyingAdminPassword) return;

    if (!adminPassword) {
      setAdminPasswordError("Enter the admin password.");
      return;
    }

    setVerifyingAdminPassword(true);
    setAdminPasswordError("");

    try {
      await verifyHiddenAdminPassword(adminPassword);
      setAdminPassword("");
      setShowAdminPasswordPrompt(false);
      setShowPlanPreview(true);
    } catch {
      setAdminPasswordError("That password was not accepted.");
    } finally {
      setVerifyingAdminPassword(false);
    }
  };

  const applyPlanPreview = (value) => {
    setResetError("");
    writeDeveloperMembershipPreview(value);
    setShowPlanPreview(false);
    window.location.reload();
  };

  const handleResetLocalJourney = async () => {
    if (isResettingJourney) return;

    const confirmed = window.confirm(
      "Reset this device’s CLARA journey and return to onboarding? Your real Google Play entitlement will be preserved."
    );
    if (!confirmed) return;

    setIsResettingJourney(true);
    setResetError("");

    try {
      const localUserId = getOrCreateLocalVaultId();
      await resetLocalClaraJourney({
        localUserId,
        preserveEntitlement: true,
      });
      await refreshProfile?.({ preferCache: false, reason: "local_journey_reset" });
      setShowPlanPreview(false);
      navigate("/onboarding", { replace: true });
      window.setTimeout(() => window.location.reload(), 0);
    } catch (error) {
      console.error("CLARA local journey reset failed", error);
      setResetError(getErrorMessage(error));
    } finally {
      setIsResettingJourney(false);
    }
  };

  return (
    <>
      <div ref={cardRef} className="flex h-full min-h-[inherit] flex-col rounded-[inherit]">
        <FinanceCardShell
          cardKey="budget"
          expanded={expanded}
          ringClass={status.ring}
          roundedClass="rounded-3xl"
          glowLayerClassNames={BUDGET_GLOW_LAYERS}
          surfaceClassName="!border-teal-100/[0.07] !bg-[linear-gradient(135deg,rgba(3,37,43,0.91),rgba(5,17,39,0.955)_44%,rgba(19,13,56,0.915))]"
          shadowClass="shadow-[0_26px_70px_rgba(0,0,0,0.47),0_0_28px_rgba(45,212,191,0.058),0_0_54px_rgba(79,70,229,0.085)]"
        >
          <BudgetCardContent
            expanded={expanded}
            onToggleDetails={onToggleDetails}
            financeActionLoading={financeActionLoading}
            onSaveBudget={openBudgetPlanPage}
            onEditBudgetCategory={openBudgetCategoryOnPlanPage}
            onDeleteBudgetCategory={onDeleteBudgetCategory}
            categories={categories}
            declared={declared}
            allocated={allocated}
            spent={spent}
            remaining={remaining}
            unallocated={unallocated}
            progress={progress}
            hasDeclaredBudget={hasDeclaredBudget}
            planIsComplete={planIsComplete}
            unplannedSpent={unplannedSpent}
            undocumentedSpent={undocumentedSpent}
            unplannedItems={unplannedItems}
            undocumentedItems={undocumentedItems}
            outsidePlanItems={outsidePlanItems}
            status={status}
            message={message}
            remainingAmountColor={remainingAmountColor}
            monthKey={monthKey}
            badgeLabel={badgeLabel}
            budgetPace={budgetPace}
            openBudgetModal={openBudgetPlanPage}
          />
        </FinanceCardShell>
      </div>

      {showAdminPasswordPrompt && (
        <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/70 px-4 pb-6 backdrop-blur-sm sm:items-center sm:pb-0">
          <form
            onSubmit={submitAdminPassword}
            className="w-full max-w-sm overflow-hidden rounded-[28px] border border-cyan-100/14 bg-[linear-gradient(145deg,rgba(5,21,42,0.98),rgba(14,20,58,0.98)_52%,rgba(45,24,83,0.98))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.55)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-100/15 bg-cyan-300/10 text-cyan-100">
                  <KeyRound className="h-5 w-5" />
                </div>
                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/55">
                  Protected Admin Area
                </p>
                <h3 className="mt-1 text-xl font-black text-white">Enter admin password</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminPasswordPrompt(false)}
                disabled={verifyingAdminPassword}
                className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-bold text-white/70 disabled:opacity-45"
              >
                Close
              </button>
            </div>

            <label className="mt-5 block space-y-2">
              <span className="text-xs font-bold text-white/48">Password</span>
              <div className="flex items-center gap-2 rounded-2xl border border-white/14 bg-black/20 px-3 focus-within:border-cyan-200/30">
                <input
                  type={showAdminPassword ? "text" : "password"}
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  autoComplete="current-password"
                  disabled={verifyingAdminPassword}
                  className="min-h-[52px] w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/25"
                  placeholder="Admin password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword((current) => !current)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/55 transition hover:bg-white/8 hover:text-white"
                  aria-label={showAdminPassword ? "Hide password" : "Show password"}
                >
                  {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {adminPasswordError ? (
              <p className="mt-3 rounded-2xl border border-rose-200/15 bg-rose-400/10 px-3 py-2.5 text-xs font-semibold text-rose-100">
                {adminPasswordError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={verifyingAdminPassword || !adminPassword}
              className="mt-4 w-full rounded-2xl bg-gradient-to-r from-cyan-300 to-emerald-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {verifyingAdminPassword ? "Verifying..." : "Open Admin Area"}
            </button>
          </form>
        </div>
      )}

      {showPlanPreview && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 px-4 pb-6 backdrop-blur-sm sm:items-center sm:pb-0">
          <div className="w-full max-w-sm overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(135deg,rgba(7,44,54,0.96),rgba(19,20,63,0.98)_52%,rgba(58,28,101,0.96))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.48)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-teal-200/70">
                  Access Preview
                </p>
                <h3 className="mt-1 text-lg font-black text-white">Choose journey state</h3>
                <p className="mt-1 text-xs font-semibold leading-5 text-white/62">
                  Developer tools for previewing access and resetting this device’s local journey.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPlanPreview(false)}
                disabled={isResettingJourney}
                className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-bold text-white/75 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Close
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate("/admin/ios-users")}
              disabled={isResettingJourney}
              className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-cyan-200/18 bg-cyan-300/10 px-4 py-3 text-left text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:bg-cyan-300/15 disabled:opacity-45"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/15 bg-cyan-300/10">
                <Smartphone className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black">iOS Users</span>
                <span className="mt-1 block text-xs font-semibold leading-5 text-cyan-50/55">
                  Manage all 20 iPhone PWA access codes.
                </span>
              </span>
            </button>

            <div className="space-y-2">
              {PLAN_PREVIEW_OPTIONS.map((option) => (
                <button
                  key={`${option.value.plan}-${option.value.membershipStatus}`}
                  type="button"
                  onClick={() => applyPlanPreview(option.value)}
                  disabled={isResettingJourney}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-left text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:bg-white/[0.10] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-black">{option.label}</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-teal-100/72">
                      {option.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold leading-5 text-white/50">{option.helper}</p>
                </button>
              ))}
            </div>

            <div className="my-4 h-px bg-white/10" />

            <button
              type="button"
              onClick={handleResetLocalJourney}
              disabled={isResettingJourney}
              className="w-full rounded-2xl border border-rose-200/15 bg-rose-500/[0.08] px-4 py-3 text-left text-rose-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:bg-rose-500/[0.13] disabled:cursor-not-allowed disabled:opacity-55"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-black">
                  {isResettingJourney ? "Resetting journey..." : "Reset Local Journey"}
                </span>
                <span className="rounded-full border border-rose-200/15 bg-rose-400/[0.10] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-rose-100/76">
                  TEST
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold leading-5 text-rose-100/58">
                Clear this device’s CLARA journey and return to onboarding.
              </p>
            </button>

            {resetError && (
              <p className="mt-3 rounded-2xl border border-rose-200/15 bg-rose-500/[0.08] px-3 py-2 text-xs font-semibold leading-5 text-rose-100/85">
                {resetError}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
