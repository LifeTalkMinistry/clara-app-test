import { getIncomeHubLocalUserId, upsertIncomeSource } from "./lib/incomeHubRepository";
import { supabase } from "./lib/supabaseClient";

const ACTIVE_KEY = "CLARA_ACTIVE_CURRENT_STATE_V1";
const SOURCE = "clara_young_professional_current_state";
const FAMILY = "young_professional_current_state";
const MONTHLY_SALARY = 32000;

function nowIso() {
  return new Date().toISOString();
}

function isYoungProfessionalActive() {
  if (typeof window === "undefined") return false;

  try {
    const state = JSON.parse(window.localStorage.getItem(ACTIVE_KEY) || "null");
    const title = String(state?.activeLifeStageTitle || state?.activeLifeStageKey || state?.lifeStage || "").toLowerCase();
    return title.includes("young professional");
  } catch {
    return false;
  }
}

async function getPossibleLocalUserIds() {
  const ids = new Set();
  ids.add(getIncomeHubLocalUserId(null));
  ids.add("local-user");

  try {
    const { data } = await supabase.auth.getUser();
    const authUser = data?.user;
    if (authUser?.id) ids.add(getIncomeHubLocalUserId(authUser));
    if (authUser?.email) ids.add(authUser.email);
  } catch {
    // Offline/local mode can continue with local-user.
  }

  return [...ids].filter(Boolean);
}

function buildYoungProfessionalSalarySource(localUserId) {
  const timestamp = nowIso();

  return {
    id: `clara_young_professional_primary_salary_${String(localUserId).replace(/[^a-zA-Z0-9_-]/g, "_")}`,
    kind: "income_source",
    recordType: "income_source",
    name: "Primary Salary",
    title: "Primary Salary",
    category: "Salary",
    stability: "Stable",
    totalMoneyIn: MONTHLY_SALARY,
    total_money_in: MONTHLY_SALARY,
    totalMoneyOut: 0,
    total_money_out: 0,
    currentBalance: MONTHLY_SALARY,
    current_balance: MONTHLY_SALARY,
    expectedMonthlyAmount: MONTHLY_SALARY,
    expected_monthly_amount: MONTHLY_SALARY,
    notes: "Young Professional setup: ₱16,000 first cutoff and ₱16,000 second cutoff.",
    lastActivityAt: timestamp,
    last_activity_at: timestamp,
    source: SOURCE,
    setupFamily: FAMILY,
    activeCurrentState: true,
    lifeStage: "Young Professional",
    createdAt: timestamp,
    created_at: timestamp,
    updatedAt: timestamp,
    updated_at: timestamp,
    deletedAt: null,
    deleted_at: null,
    syncStatus: "local_only",
  };
}

async function ensureYoungProfessionalIncomeSource() {
  if (!isYoungProfessionalActive()) return;

  const localUserIds = await getPossibleLocalUserIds();

  await Promise.all(
    localUserIds.map((localUserId) =>
      upsertIncomeSource(localUserId, buildYoungProfessionalSalarySource(localUserId))
    )
  );

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("clara-income-hub-updated"));
    window.dispatchEvent(new Event("clara-finance-updated"));
  }
}

if (typeof window !== "undefined") {
  window.setTimeout(() => {
    ensureYoungProfessionalIncomeSource().catch((error) => {
      console.warn("Young Professional income source seed skipped:", error);
    });
  }, 600);
}
