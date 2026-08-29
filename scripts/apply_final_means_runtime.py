from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "src/runtime/installClaraOrbGreeting.js"

text = RUNTIME.read_text()
original = text

old_imports = '''import {
  FINANCE_DATA_UPDATED_EVENT,
  getEmergencyFund,
  getExpenses,
  getSavingsGoals,
  getWallets,
} from "@/lib/financeRepository";
import {
  getIncomeSourceActivityLog,
  getIncomeSources,
} from "@/lib/incomeHubRepository";
import {
  DEBT_OBLIGATIONS_UPDATED_EVENT,
  getDebtObligations,
  getMonthlyDebtPayment,
} from "@/lib/debtObligationStore";
import {
  DEBT_OBLIGATION_SCHEDULE_SOURCE,
  buildDebtObligationScheduleProjection,
} from "@/lib/financialCardScheduleProjection";
import { getRecurrenceOccurrences } from "@/lib/recurringCashFlowRepository";
import { buildCanonicalWalletState } from "@/lib/clara-wallet-money-semantics";
import { isSavingsGoalActive } from "@/lib/savingsGoalLifecycle";
import { MEANS_SNAPSHOT_UPDATED_EVENT } from "@/lib/clara-means-boundary";
import { isDebtOccurrencePaid } from "@/lib/debtOccurrenceState";
import {
  CLARA_MONEY_ROUTINE_UPDATED_EVENT,
  getClaraMoneyScheduleStorageKey,
  readClaraMoneyRoutine,
} from "@/lib/clara-money-schedule-repository";
import {
  firstValidNumber,
  getPHMonthKey,
  getTransactionDate,
  normalizeLower,
} from "@/utils/dashboard/dashboardHelpers";
'''
new_imports = '''import { FINANCE_DATA_UPDATED_EVENT } from "@/lib/financeRepository";
import { DEBT_OBLIGATIONS_UPDATED_EVENT } from "@/lib/debtObligationStore";
import { MEANS_SNAPSHOT_UPDATED_EVENT } from "@/lib/clara-means-boundary";
import {
  CLARA_MONEY_ROUTINE_UPDATED_EVENT,
  CLARA_MONEY_SCHEDULE_UPDATED_EVENT,
} from "@/lib/clara-money-schedule-repository";
import { buildCanonicalMeansSnapshot } from "@/lib/clara-means-authority";
'''
if old_imports not in text:
    raise SystemExit("Expected legacy Means import block was not found; aborting instead of guessing.")
text = text.replace(old_imports, new_imports, 1)

text = text.replace('const INCOME_HUB_CASH_IN_TYPE = "add_money";\n', '', 1)
text = text.replace('const SAVINGS_GOAL_SCHEDULE_SOURCE = "savings_goal_card_projection";\n', '', 1)
text = text.replace('const MEANS_CYCLE_BASELINE_STORAGE_PREFIX = "clara:means-cycle-baseline:v1";\n', '', 1)

money_pattern = re.compile(r'''function money\(value\) \{\n  const amount = Number\(value \|\| 0\);\n  return `₱\$\{Math\.max\(0, amount\)\.toLocaleString\("en-PH", \{\n    maximumFractionDigits: 0,\n  \}\)\}`;\n\}''')
money_replacement = '''function money(value) {
  const amount = Number(value || 0);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const sign = safeAmount < 0 ? "−" : "";
  return `${sign}₱${Math.abs(safeAmount).toLocaleString("en-PH", {
    maximumFractionDigits: 0,
  })}`;
}'''
text, count = money_pattern.subn(money_replacement, text, count=1)
if count != 1:
    raise SystemExit(f"Expected to replace one legacy money formatter, replaced {count}.")

authority_block = '''function formatHorizonDate(dateKey) {
  const match = String(dateKey || "").match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
  if (!match) return "the next payday";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
  }).format(date);
}

async function buildMeansSnapshot(profile = {}) {
  return buildCanonicalMeansSnapshot({ profile });
}

function statusForScore(score)'''
helper_pattern = re.compile(
    r'function localDateKey\(value = new Date\(\)\) \{.*?function statusForScore\(score\)',
    re.S,
)
text, count = helper_pattern.subn(authority_block, text, count=1)
if count != 1:
    raise SystemExit(f"Expected to replace one legacy Means helper/authority span, replaced {count}.")

obsolete_rows = [
    '      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:4px;padding-left:9px;font-size:9.5px;color:rgba(255,255,255,.31)"><span>↳ Savings goals</span><strong style="color:rgba(255,255,255,.58)">${money(snapshot.savingsGoalUpcoming)}</strong></span>\n',
    '      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:4px;padding-left:9px;font-size:9.5px;color:rgba(255,255,255,.31)"><span>↳ Other scheduled events</span><strong style="color:rgba(255,255,255,.58)">${money(snapshot.otherScheduledUpcoming)}</strong></span>\n',
]
for row in obsolete_rows:
    if row not in text:
        raise SystemExit("Expected obsolete Means detail row was not found; aborting.")
    text = text.replace(row, '', 1)

protected_block = re.compile(
    r'      \$\{\(snapshot\.emergencyProtected \|\| snapshot\.savingsProtected \|\| snapshot\.otherProtected\) > 0 \? `<span.*?</span>` : ""\}\n'
    r'      \$\{snapshot\.moneyLentUnavailable > 0 \? `<span.*?</span>` : ""\}\n',
    re.S,
)
text, count = protected_block.subn('', text, count=1)
if count != 1:
    raise SystemExit(f"Expected one obsolete protected/lent detail block, replaced {count}.")

info_pattern = re.compile(
    r'<span data-clara-means-info-copy="true" style="([^"]*)">.*?</span>',
    re.S,
)
info_copy = '<span data-clara-means-info-copy="true" style="\\1">This score compares your effective Wallet money with the protected and currently applicable requirements of this pay cycle. Past and today stay protected; future requirements adapt. Money Schedule days may be assumed spent until a successful Cross-Check confirms fresh Wallet truth. Savings Goal, Emergency Fund, and Money Lent tracking do not directly affect the Means Score.</span>'
text, count = info_pattern.subn(info_copy, text, count=1)
if count != 1:
    raise SystemExit(f"Expected one Means info copy span, replaced {count}.")

listen_anchor = '  window.addEventListener(CLARA_MONEY_ROUTINE_UPDATED_EVENT, handleFinanceRefresh);\n  window.addEventListener("clara:schedule:create-event", handleFinanceRefresh);'
listen_replacement = '  window.addEventListener(CLARA_MONEY_ROUTINE_UPDATED_EVENT, handleFinanceRefresh);\n  window.addEventListener(CLARA_MONEY_SCHEDULE_UPDATED_EVENT, handleFinanceRefresh);\n  window.addEventListener("clara:means-assumed-spent-reset", handleFinanceRefresh);\n  window.addEventListener("clara:schedule:create-event", handleFinanceRefresh);'
if listen_anchor not in text:
    raise SystemExit("Expected Means refresh listener anchor was not found.")
text = text.replace(listen_anchor, listen_replacement, 1)

remove_anchor = '      window.removeEventListener(CLARA_MONEY_ROUTINE_UPDATED_EVENT, handleFinanceRefresh);\n      window.removeEventListener("clara:schedule:create-event", handleFinanceRefresh);'
remove_replacement = '      window.removeEventListener(CLARA_MONEY_ROUTINE_UPDATED_EVENT, handleFinanceRefresh);\n      window.removeEventListener(CLARA_MONEY_SCHEDULE_UPDATED_EVENT, handleFinanceRefresh);\n      window.removeEventListener("clara:means-assumed-spent-reset", handleFinanceRefresh);\n      window.removeEventListener("clara:schedule:create-event", handleFinanceRefresh);'
if remove_anchor not in text:
    raise SystemExit("Expected Means refresh cleanup anchor was not found.")
text = text.replace(remove_anchor, remove_replacement, 1)

for forbidden in (
    'resolveLockedMeansCycleBaseline',
    'resolveMeansCycleBaselineState',
    'plannedDebtPaidInsideCycle',
    'futureSavingsGoalAmount',
    'MEANS_CYCLE_BASELINE_STORAGE_PREFIX',
):
    if forbidden in text:
        raise SystemExit(f"Legacy Means authority survived runtime surgery: {forbidden}")

if 'buildCanonicalMeansSnapshot' not in text:
    raise SystemExit("Canonical Means authority is not wired into ORB runtime.")

if text == original:
    raise SystemExit("Runtime patch made no changes.")

RUNTIME.write_text(text)
print("Patched installClaraOrbGreeting.js to delegate Means to canonical authority.")
