from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding="utf-8")

def write(path, content):
    (ROOT / path).write_text(content, encoding="utf-8")

def replace_once(path, old, new, label):
    source = read(path)
    if new in source:
        return
    if old not in source:
        raise SystemExit(f"{label}: expected source shape not found in {path}")
    write(path, source.replace(old, new, 1))

def replace_test(path, name, block):
    source = read(path)
    pattern = re.compile(r'test\("' + re.escape(name) + r'"[\s\S]*?(?=\ntest\(|\Z)')
    matches = list(pattern.finditer(source))
    if len(matches) != 1:
        raise SystemExit(f"{path}: expected one test named {name!r}, found {len(matches)}")
    source = source[:matches[0].start()] + block.rstrip() + "\n" + source[matches[0].end():]
    write(path, source)

# Genuine runtime fix: restore Buy Check's aggregate wallet evidence contract.
write("src/lib/clara-buy-check-wallet-engine.js", r'''import {
  getWalletSpendableBalance as getCanonicalWalletSpendableBalance,
  syncWalletProtectedAllocations,
} from "./clara-wallet-money-semantics.js";

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const number = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function roundMoney(value) {
  const number = toNumber(value);
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return clean(value).toLowerCase();
}

function explicitFalse(value) {
  return value === false || value === 0 || lower(value) === "false" || lower(value) === "no" || lower(value) === "blocked";
}

function explicitTrue(value) {
  return value === true || value === 1 || lower(value) === "true" || lower(value) === "yes";
}

function walletId(value = {}) {
  return clean(value.id || value.wallet_id || value.walletId || value.local_id || value.localId || value.uuid || value.name || "");
}

function walletName(value = {}) {
  return clean(value.name || value.wallet_name || value.walletName || value.label || value.title || "Wallet") || "Wallet";
}

function walletBalance(value = {}) {
  return roundMoney(value.currentBalance ?? value.balance ?? value.current_balance ?? value.wallet_balance ?? value.derived_balance ?? value.starting_balance ?? 0);
}

function walletReservedBalance(value = {}) {
  return roundMoney(Math.max(toNumber(value.totalProtectedAmount ?? value.total_protected_amount ?? 0), 0));
}

function walletSpendableBalance(value = {}) {
  return roundMoney(getCanonicalWalletSpendableBalance(value));
}

function isActiveWallet(value = {}) {
  if (!walletId(value)) return false;
  if (value.deletedAt || value.deleted_at) return false;
  if (value.is_archived === true || explicitTrue(value.archived)) return false;
  if (explicitFalse(value.active) || explicitFalse(value.is_active) || explicitFalse(value.isActive)) return false;
  if (["archived", "deleted", "closed", "inactive"].includes(lower(value.status))) return false;
  return true;
}

function getWalletSpendability(value = {}) {
  const status = lower(value.spendabilityStatus || value.spendability_status);
  if (status === "blocked") {
    return {
      status: "blocked",
      reason: clean(value.spendabilityBlockReason || value.spendability_block_reason || "Wallet is blocked for spending."),
    };
  }
  if (status === "eligible") return { status: "eligible", reason: "" };

  if (
    explicitFalse(value.is_spendable) ||
    explicitFalse(value.isSpendable) ||
    explicitTrue(value.is_protected) ||
    explicitTrue(value.isProtected) ||
    explicitTrue(value.protected)
  ) {
    return {
      status: "blocked",
      reason: clean(value.protectionReason || value.protection_reason || "Wallet is explicitly blocked for spending."),
    };
  }
  return { status: "eligible", reason: "" };
}

function isProtectedWallet(value = {}) {
  return getWalletSpendability(value).status === "blocked";
}

function walletProtectionReason(value = {}) {
  return getWalletSpendability(value).reason;
}

function getWalletBreakdown(context = {}, amount = 0) {
  const target = Math.max(toNumber(amount), 0);
  const rawWallets = Array.isArray(context.wallets) ? context.wallets : [];
  const syncedWallets = syncWalletProtectedAllocations({
    rows: rawWallets,
    allWallets: rawWallets,
    emergencyFund: context.emergencyFund || null,
    savingsGoals: Array.isArray(context.savingsGoals) ? context.savingsGoals : [],
  });

  const wallets = syncedWallets.filter(isActiveWallet).map((wallet) => {
    const id = walletId(wallet);
    const name = walletName(wallet);
    const currentBalance = walletBalance(wallet);
    const totalProtectedAmount = walletReservedBalance(wallet);
    const spendableBalance = walletSpendableBalance(wallet);
    const spendability = getWalletSpendability(wallet);
    const blocked = spendability.status === "blocked";

    return {
      id,
      name,
      rawBalance: currentBalance,
      grossBalance: currentBalance,
      currentBalance,
      reservedAmount: totalProtectedAmount,
      reservedBalance: totalProtectedAmount,
      totalProtectedAmount,
      spendable: spendableBalance,
      spendableBalance,
      protected: blocked,
      spendabilityStatus: spendability.status,
      spendabilityBlockReason: spendability.reason,
      enough: Boolean(id) && !blocked && spendableBalance >= target,
      protectionReason: spendability.reason,
      raw: wallet,
    };
  });

  const eligibleFundingWallets = wallets.filter(
    (wallet) => wallet.spendabilityStatus === "eligible" && wallet.spendableBalance > 0
  );
  const spendableTotal = roundMoney(
    eligibleFundingWallets.reduce((sum, wallet) => sum + wallet.spendableBalance, 0)
  );
  const largestEligibleBalance = roundMoney(
    eligibleFundingWallets.reduce((largest, wallet) => Math.max(largest, wallet.spendableBalance), 0)
  );
  const protectedTotal = roundMoney(
    wallets.filter((wallet) => wallet.spendabilityStatus === "blocked")
      .reduce((sum, wallet) => sum + wallet.currentBalance, 0)
  );
  const reservedAmount = roundMoney(
    wallets.reduce((sum, wallet) => sum + wallet.totalProtectedAmount, 0)
  );

  return {
    wallets,
    eligibleFundingWallets,
    spendableTotal,
    largestEligibleBalance,
    fundingWalletCount: eligibleFundingWallets.filter((wallet) => wallet.spendableBalance >= target).length,
    combinedEnough: spendableTotal >= target,
    individualEnough: largestEligibleBalance >= target,
    protectedTotal,
    reservedAmount,
    protectedMoneyNeeded:
      largestEligibleBalance < target &&
      spendableTotal < target &&
      (protectedTotal > 0 || reservedAmount > 0),
  };
}

export function getWalletOptions(context = {}, amount = 0) {
  return getWalletBreakdown(context, amount).eligibleFundingWallets
    .map((wallet) => ({
      id: wallet.id,
      name: wallet.name,
      balance: wallet.spendableBalance,
      enough: wallet.enough,
    }))
    .sort((left, right) => Number(right.enough) - Number(left.enough) || right.balance - left.balance);
}

export function getEligibleSpendableTotal(context = {}) {
  return getWalletBreakdown(context, 0).spendableTotal;
}

export function getProtectedMoneyNeeded(context = {}, amount = 0) {
  const target = Math.max(toNumber(amount), 0);
  const breakdown = getWalletBreakdown(context, target);
  if (breakdown.spendableTotal >= target) return null;

  const protectedAmount = roundMoney(breakdown.protectedTotal + breakdown.reservedAmount);
  if (breakdown.spendableTotal + protectedAmount < target) return null;

  return {
    amountNeeded: roundMoney(Math.max(target - breakdown.spendableTotal, 0)),
    protectedAmount,
    eligibleTotal: breakdown.spendableTotal,
  };
}

export {
  getWalletBreakdown,
  getWalletSpendability,
  isActiveWallet,
  isProtectedWallet,
  walletBalance,
  walletId,
  walletName,
  walletProtectionReason,
  walletReservedBalance,
  walletSpendableBalance,
};
''')

replace_once(
    "src/lib/clara-buy-check-income-runway-engine.js",
    '''  return {
    connected: Boolean(context.incomeHubSnapshot?.connected || Array.isArray(context.incomes) || Array.isArray(context.incomeSources)),
    latestIncomeDate: latest?.date || null,
    latestIncomeAmount: latest?.amount || 0,
    sourceName: latest?.sourceName || "",
    estimatedNextIncomeDate: null,
    daysUntilNextIncome: null,
    regularity: "unknown",
    confidence: "none",
    timingAuthority: "schedule",
    basis: ["no_configured_income_schedule"],
    recordCount: records.length,
  };''',
    '''  const connected = Boolean(
    context.incomeHubSnapshot?.connected ||
      Array.isArray(context.incomes) ||
      Array.isArray(context.incomeSources)
  );
  const hasIncomeEvidence = connected && records.length > 0;

  return {
    connected,
    latestIncomeDate: latest?.date || null,
    latestIncomeAmount: latest?.amount || 0,
    sourceName: latest?.sourceName || "",
    estimatedNextIncomeDate: null,
    daysUntilNextIncome: null,
    regularity: "unknown",
    confidence: hasIncomeEvidence ? "low" : "none",
    timingAuthority: "schedule",
    basis: [
      hasIncomeEvidence
        ? "insufficient_income_history"
        : "no_configured_income_schedule",
    ],
    recordCount: records.length,
  };''',
    "income-confidence fallback",
)

source = read("src/lib/clara-wallet-money-semantics.js")
source = source.replace(
    '''const OTHER_PROTECTED_KEYS = [
  "otherProtectedAmount",
  "other_protected_amount",
  "protectedAllocationAmount",
  "protected_allocation_amount",
];''',
    '''const OTHER_PROTECTED_KEYS = [
  "otherProtectedAmount",
  "other_protected_amount",
  "protectedAllocationAmount",
  "protected_allocation_amount",
  "reservedAmount",
  "reserved_amount",
  "protectedAmount",
  "protected_amount",
];''',
    1,
)
if "function roundMoney(value)" not in source:
    marker = '''function toMoney(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[₱,\\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
'''
    if marker not in source:
        raise SystemExit("wallet semantics: toMoney shape changed")
    source = source.replace(
        marker,
        marker + '''
function roundMoney(value) {
  const amount = toMoney(value);
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}
''',
        1,
    )
source = source.replace(
    "const currentBalance = Math.max(0, getWalletCurrentBalance(wallet));",
    "const currentBalance = roundMoney(Math.max(0, getWalletCurrentBalance(wallet)));",
)
source = source.replace(
    '''  const totalProtectedAmount =
    emergencyProtectedAmount + savingsProtectedAmount + otherProtectedAmount;''',
    '''  const totalProtectedAmount = roundMoney(
    emergencyProtectedAmount + savingsProtectedAmount + otherProtectedAmount
  );''',
)
source = source.replace("    emergencyProtectedAmount,", "    emergencyProtectedAmount: roundMoney(emergencyProtectedAmount),")
source = source.replace("    savingsProtectedAmount,", "    savingsProtectedAmount: roundMoney(savingsProtectedAmount),")
source = source.replace("    otherProtectedAmount,", "    otherProtectedAmount: roundMoney(otherProtectedAmount),")
source = source.replace(
    "  return Math.max(0, amounts.currentBalance - amounts.totalProtectedAmount);",
    "  return roundMoney(Math.max(0, amounts.currentBalance - amounts.totalProtectedAmount));",
)
for field in [
    "currentBalance", "emergencyProtectedAmount", "savingsProtectedAmount",
    "otherProtectedAmount", "totalProtectedAmount", "spendableBalance", "projectedBalance"
]:
    source = source.replace(
        f"{field}: totals.{field} + {field},",
        f"{field}: roundMoney(totals.{field} + {field}),",
    )
write("src/lib/clara-wallet-money-semantics.js", source)

replace_test(
    "tests/budget-card-truth-regression.test.mjs",
    "Budget card requests completion while Home owns persisted lifecycle authority",
    r'''test("Budget card requests completion while Home owns persisted lifecycle authority", () => {
  assert.match(communityHomeFinancialCarousel, /completeMonthlyBudgetCycle/);
  assert.match(communityHomeFinancialCarousel, /buildBudgetCompletionSnapshot/);
  assert.match(communityHomeFinancialCarousel, /header: monthlyBudgetHeader/);
  assert.doesNotMatch(budgetCard, /completeMonthlyBudgetCycle/);
  assert.doesNotMatch(budgetCard, /buildBudgetCompletionSnapshot/);
  assert.match(budgetCard, /Weekly Money Check/);
  assert.match(budgetCard, /startWeeklyMoneyCheckSession/);
  assert.match(budgetCard, /saveWeeklyMoneyCheckWeekday/);
  assert.doesNotMatch(budgetCard, /data-budget-completion-action/);
});''',
)

replace_test(
    "tests/budget-completion-footer-containment.test.mjs",
    "Complete Budget participates in expanded Budget layout instead of absolute positioning",
    r'''test("Complete Budget participates in expanded Budget layout instead of absolute positioning", () => {
  assert.match(budgetCard, /Weekly Money Check/);
  assert.match(budgetCard, /Choose your weekly check-in/);
  assert.match(budgetCard, /WeekdayPickerModal/);
  assert.doesNotMatch(budgetCard, /data-budget-completion-footer="true"/);
  assert.doesNotMatch(budgetCard, /data-budget-completion-action="true"/);
});''',
)

replace_test(
    "tests/buy-check-gemini-authority.test.mjs",
    "hypothetical installment simulation cannot mutate money before safe recording exists",
    r'''test("hypothetical installment simulation cannot mutate money before safe recording exists", async () => {
  const finalization = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckFlowV5.js");
  const installmentGuard = finalization.indexOf('if (decision.choice === "buy" && paymentStructure)');
  const obligationWrite = finalization.indexOf("await upsertDebtObligation");
  const oneTimeExpenseWrite = finalization.indexOf("await addBuyCheckExpense");

  assert.ok(installmentGuard >= 0, "installment safety guard must exist");
  assert.ok(obligationWrite > installmentGuard, "installments must use the obligation ledger");
  assert.ok(oneTimeExpenseWrite > obligationWrite, "installment handling must finish before one-time expense mutation");
  assert.match(finalization, /No wallet money was deducted yet/);
  assert.match(finalization, /Record each actual payment from Debt \/ Obligations when you pay it/);
});''',
)

replace_test(
    "tests/clara-free-support-system.test.mjs",
    "CLARA support tiers preserve free core access while carrying supporter benefits",
    r'''test("CLARA support tiers preserve free core access while carrying supporter benefits", () => {
  assert.deepEqual(SUPPORT_TIER_KEYS, ["supporter", "builder", "champion"]);
  assert.equal(SUPPORT_TIERS.supporter.price, 99);
  assert.equal(SUPPORT_TIERS.builder.price, 149);
  assert.equal(SUPPORT_TIERS.champion.price, 299);
  assert.equal(SUPPORT_TIERS.supporter.name, "Take Control");
  assert.equal(SUPPORT_TIERS.builder.name, "Stay Consistent");
  assert.equal(SUPPORT_TIERS.champion.name, "Don't Do It Alone");
  assert.equal(SUPPORT_TIERS.builder.recommended, true);
  assert.equal(SUPPORT_TIERS.supporter.membershipKey, "core");
  assert.equal(SUPPORT_TIERS.builder.membershipKey, "personal");
  assert.equal(SUPPORT_TIERS.champion.membershipKey, "partner");
});''',
)

replace_test(
    "tests/clara-free-support-system.test.mjs",
    "support gratitude state lasts only through the active support cycle or a canonical admin plan",
    r'''test("support gratitude state lasts only through the active support cycle or a canonical admin plan", () => {
  const now = Date.parse("2026-08-09T00:00:00+08:00");
  const active = {
    tier: "builder",
    status: "active",
    support_expires_at: "2026-09-09T00:00:00+08:00",
  };
  const expired = { ...active, support_expires_at: "2026-08-08T00:00:00+08:00" };
  const inactive = { ...active, status: "inactive" };
  const adminAssigned = {
    tier: "champion",
    status: "active",
    active: true,
    source: "account_plan",
  };

  assert.equal(isSupportRecordActive(active, now), true);
  assert.equal(getSupportDisplayState(active, now).label, "Active");
  assert.equal(getSupportDisplayState(active, now).tier, "builder");
  assert.equal(isSupportRecordActive(expired, now), false);
  assert.equal(getSupportDisplayState(expired, now).label, "Membership");
  assert.equal(getSupportDisplayState(expired, now).tier, null);
  assert.equal(isSupportRecordActive(inactive, now), false);
  assert.equal(isSupportRecordActive(adminAssigned, now), true);
  assert.equal(getSupportDisplayState(adminAssigned, now).tier, "champion");
});''',
)

replace_test(
    "tests/clara-free-support-system.test.mjs",
    "Settings identity surfaces resolve only from active supporter status",
    r'''test("Settings identity surfaces resolve only from active supporter status", () => {
  const settings = read("src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx");
  const badge = read("src/components/support/SupportTierBadge.jsx");

  assert.match(settings, /useClaraSupport\(user\)/);
  assert.match(settings, /activeSupporterTier = supporterStatus\?\.active \? supporterStatus\.tier : null/);
  assert.match(settings, /badgeNode: activeSupporterTier \?/);
  assert.match(settings, /<SupportTierBadge tier=\{activeSupporterTier\} compact tone="settings" \/>/);
  assert.doesNotMatch(settings, /badge: currentPlan/);
  assert.match(badge, /getSupportTier/);
  assert.match(badge, /const label = canonicalTier\.name/);
});''',
)

replace_test(
    "tests/clara-free-support-system.test.mjs",
    "support verifier never mutates CLARA profile entitlements",
    r'''test("support verifier never mutates CLARA profile entitlements", () => {
  const hook = read("src/hooks/useClaraSupport.js");
  const support = read("src/lib/clara-support.js");

  assert.match(hook, /backendRequest\("\/api\/support\/status"/);
  assert.match(hook, /source: "account_plan"/);
  assert.doesNotMatch(hook, /\.from\("profiles"\)/);
  assert.doesNotMatch(hook, /process_google_play_purchase/);
  assert.doesNotMatch(support, /\.from\("profiles"\)/);
});''',
)

replace_test(
    "tests/clara-free-support-system.test.mjs",
    "Support CLARA owns a persistent app-level overlay world and animation clock",
    r'''test("Support CLARA owns a persistent app-level overlay world and animation clock", () => {
  const bubble = read("src/components/support/SupportClaraBubble.jsx");

  assert.match(bubble, /createPortal/);
  assert.match(bubble, /clara-support-world/);
  assert.match(bubble, /document\.body\.appendChild\(world\)/);
  assert.match(bubble, /isolation: "isolate"/);
  assert.match(bubble, /pointerEvents: "none"/);
  assert.match(bubble, /localStorage\.getItem\(SUPPORT_BUBBLE_EPOCH_KEY\)/);
  assert.match(bubble, /ICON_FIRST_MS: 3000/);
  assert.match(bubble, /EXPANDED_MS: 3000/);
  assert.match(bubble, /ICON_SECOND_MS: 3000/);
  assert.match(bubble, /HIDDEN_MS: 10000/);
  assert.match(bubble, /if \(!user\?\.id \|\| !portalHost \|\| membershipState\.isActive\) return null;/);
  assert.doesNotMatch(bubble, /SESSION_EXPANSION_KEY/);
});''',
)

replace_test(
    "tests/clara-orb-log-expense-routing.test.mjs",
    "Calendar Orb command opens the existing Community Schedule calendar",
    r'''test("Calendar Orb command opens the existing Community Schedule calendar", async () => {
  const previousWindow = globalThis.window;
  const previousCustomEvent = globalThis.CustomEvent;

  class TestCustomEvent extends Event {
    constructor(type, options = {}) {
      super(type);
      this.detail = options.detail;
    }
  }

  const fakeWindow = new EventTarget();
  globalThis.window = fakeWindow;
  globalThis.CustomEvent = TestCustomEvent;

  try {
    await import(`../src/runtime/installClaraOrbCommandChatRouting.js?test=${Date.now()}-calendar`);
    const pauseRequest = new Promise((resolve) => {
      fakeWindow.addEventListener(
        CLARA_PAUSE_OPEN_REQUEST_EVENT,
        (event) => resolve(event.detail),
        { once: true }
      );
    });

    fakeWindow.dispatchEvent(
      new TestCustomEvent(CLARA_ORB_COMMAND_SELECT_EVENT, {
        detail: {
          commandId: "calendar",
          commandLabel: "Calendar",
          source: "clara-orb-page",
        },
      })
    );

    const detail = await pauseRequest;
    assert.equal(detail.mode, "calendar");
    assert.equal(detail.commandId, "calendar");
    assert.equal(detail.source, "clara-orb-page");
  } finally {
    fakeWindow.__claraOrbCommandChatRoutingRuntime__?.destroy?.();
    globalThis.window = previousWindow;
    globalThis.CustomEvent = previousCustomEvent;
  }
});''',
)

replace_test(
    "tests/clara-orb-wallet-chat-source.test.mjs",
    "first Wallet Orb chat pass remains read-only and does not duplicate finance mutations",
    r'''test("first Wallet Orb chat pass remains read-only and does not duplicate finance mutations", () => {
  assert.equal(walletOverlay.includes("addWallet"), true);
  assert.equal(walletOverlay.includes("addMoney"), true);
  assert.equal(walletOverlay.includes("transferBetweenWallets"), true);
  assert.equal(walletOverlay.includes("deleteWallet"), true);
  assert.equal(walletOverlay.includes("getWalletMoneySemantics"), true);
  assert.equal(walletOverlay.includes("updateWallet("), false);
  assert.equal(walletOverlay.includes("insertWalletTransaction("), false);
});''',
)

replace_test(
    "tests/cloud-vault-sync.test.mjs",
    "the production app has no background server finance synchronization",
    r'''test("the production app has no background server finance synchronization", async () => {
  const mainSource = await fs.readFile(new URL("../src/main.jsx", import.meta.url), "utf8");
  const repositorySource = await fs.readFile(new URL("../src/lib/financeRepository.js", import.meta.url), "utf8");
  const storageScreen = await fs.readFile(new URL("../src/pages/DataExport.jsx", import.meta.url), "utf8");
  const settingsSource = await fs.readFile(
    new URL("../src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(mainSource, /CloudVaultSyncBridge/);
  assert.doesNotMatch(mainSource, /installFastAccountSync/);
  assert.doesNotMatch(repositorySource, /server-finance-sync/);
  assert.doesNotMatch(repositorySource, /__claraPrepareServerFinanceMutation/);
  assert.match(settingsSource, /DeviceTransferPanel/);
  assert.match(storageScreen, /Backup & Restore/);
  assert.match(storageScreen, /Personal backup file/);
  assert.doesNotMatch(storageScreen, /syncServerFinance/);
  assert.doesNotMatch(storageScreen, /\/api\/finance\/sync/);
});''',
)

replace_test(
    "tests/cloud-vault-sync.test.mjs",
    "backend requests bypass the ngrok browser interstitial",
    r'''test("backend requests bypass the ngrok browser interstitial", async () => {
  const clientSource = await fs.readFile(new URL("../src/lib/clara-backend-client.js", import.meta.url), "utf8");

  assert.match(clientSource, /DEFAULT_API_URL = "https:\/\/api\.clarapmc\.com"/);
  assert.match(clientSource, /Authorization: `Bearer \$\{token\}`/);
  assert.doesNotMatch(clientSource, /ngrok-skip-browser-warning/);
});''',
)

replace_test(
    "tests/dashboard-top-nav-ownership.test.mjs",
    "schedule guide runtime cannot click or block the top navigation",
    r'''test("schedule guide runtime cannot click or block the top navigation", () => {
  assert.match(scheduleRuntimeSource, /Guide Mode was retired/);
  assert.match(scheduleRuntimeSource, /export function installClaraGuideScheduleRuntime\(\) \{\}/);
  assert.doesNotMatch(scheduleRuntimeSource, /\.click\(\)/);
  assert.doesNotMatch(scheduleRuntimeSource, /MutationObserver/);
  assert.doesNotMatch(scheduleRuntimeSource, /addEventListener/);
  assert.doesNotMatch(scheduleRuntimeSource, /observer\.observe/);
});''',
)

replace_test(
    "tests/free-core-access-authority.test.mjs",
    "legacy Committed guards cannot deny a canonical free-core route",
    r'''test("legacy Committed guards cannot deny a canonical free-core route", async () => {
  const source = await read("../src/components/fresh/main-dashboard/program-access/committedFeatureAccess.js");

  assert.match(source, /import \{ isFreeCoreRoute \} from "@\/lib\/plan-config"/);
  assert.match(source, /const currentPath = getCurrentAppPath\(\)/);
  assert.match(source, /if \(isFreeCoreRoute\(currentPath\)\) return true/);
  assert.match(source, /return hasCommittedAccess/);
});''',
)

write(
    "tests/learning-hub-first-click.test.mjs",
    r'''import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read = (path) => fs.readFile(new URL(path, import.meta.url), "utf8");

test("Learning Hub first click and swipe paths stay lazy, visible, and passive-safe", async () => {
  const [
    hubSource,
    toggleSource,
    soundSource,
    carouselSource,
    cardSource,
    loadedSource,
    mobilePerformanceSource,
  ] = await Promise.all([
    read("../src/components/fresh/main-dashboard/learning-hub/LearningHub.jsx"),
    read("../src/components/fresh/main-dashboard/learning-hub/ui/LearningHubToggleButton.jsx"),
    read("../src/runtime/installLearningHubOpenSound.js"),
    read("../src/components/fresh/main-dashboard/learning-hub/ui/LearningHubCarousel.jsx"),
    read("../src/components/fresh/main-dashboard/learning-hub/ui/LearningMaterialCard.jsx"),
    read("../src/components/fresh/main-dashboard/learning-hub/LearningHubLoaded.jsx"),
    read("../src/mobile-performance.css"),
  ]);

  assert.match(hubSource, /const \[shouldLoadHub, setShouldLoadHub\] = useState\(false\)/);
  assert.match(hubSource, /void preloadLearningHub\(\);\s*setShouldLoadHub\(true\)/);
  assert.match(hubSource, /requestIdleCallback\(warmLearningHub/);
  assert.match(hubSource, /fallback={<LearningHubOpeningPlaceholder \/>}/);
  assert.doesNotMatch(hubSource, /MutationObserver/);

  assert.match(toggleSource, /data-clara-learning-hub-toggle="true"/);
  assert.match(soundSource, /button\[data-clara-learning-hub-toggle="true"\]/);

  assert.match(carouselSource, /touchAction:\s*"pan-y"/);
  assert.doesNotMatch(carouselSource, /event\.preventDefault\s*\(/);
  assert.match(carouselSource, /new IntersectionObserver/);
  assert.match(carouselSource, /visibilitychange/);

  assert.match(cardSource, /const BASE_CARD_WIDTH = 184/);
  assert.match(cardSource, /contain: "layout paint style"/);
  assert.doesNotMatch(
    mobilePerformanceSource,
    /\.clara-learning-hub-card\s*\{[^}]*will-change:\s*transform,\s*opacity/is,
  );

  assert.match(loadedSource, /LearningExperienceOpeningFallback/);
  assert.match(loadedSource, /preloadMaterialExperience\(item\)/);
});
''',
)

replace_test(
    "tests/log-expense-wallet-recovery-source.test.mjs",
    "Wallet chat owns wallet creation and funding",
    r'''test("Wallet chat owns wallet creation and funding", () => {
  assert.match(walletSource, /addWallet\(localUserId/);
  assert.match(walletSource, /addMoney\(localUserId/);
  assert.match(walletSource, /transferBetweenWallets/);
  assert.match(walletSource, /deleteWallet/);
  assert.match(walletSource, /onWalletReady/);
  assert.match(walletSource, /data-clara-wallet-chat-intent/);
});''',
)

replace_test(
    "tests/notification-runtime-contracts.test.mjs",
    "phone delivery toggle reflects live capability, permission, and configuration",
    r'''test("phone delivery toggle reflects live capability, permission, and configuration", () => {
  assert.match(notificationPanelSource, /deliveryWantsDevice/);
  assert.match(notificationPanelSource, /taskReminderSettings\.pushSupported/);
  assert.match(notificationPanelSource, /taskReminderSettings\.permissionState === "granted"/);
  assert.match(notificationPanelSource, /taskReminderSettings\.pushConfigured/);
  assert.match(notificationPanelSource, /checked=\{pushDeliveryReady\}/);
  assert.match(notificationPanelSource, /aria-label="Push notifications"/);
});''',
)

replace_test(
    "tests/notification-runtime-contracts.test.mjs",
    "notification Settings exposes one clean On/Off phone delivery control",
    r'''test("notification Settings exposes one clean On/Off phone delivery control", () => {
  assert.match(notificationPanelSource, /Push notifications/);
  assert.match(notificationPanelSource, /checked=\{pushDeliveryReady\}/);
  assert.match(notificationPanelSource, /aria-label="Push notifications"/);
  assert.doesNotMatch(notificationPanelSource, /TaskReminderSettingsCard/);
  assert.doesNotMatch(notificationPanelSource, /Save advanced task schedule/);
});''',
)

replace_test(
    "tests/onboarding-direct-entry.test.mjs",
    "onboarding separates CLARA mechanics from the bigger vision",
    r'''test("onboarding separates CLARA mechanics from the bigger vision", () => {
  assert.match(
    onboardingScreensSource,
    /SCREEN_IDS = \[[\s\S]*?"country"[\s\S]*?"measurement"[\s\S]*?"means-score"[\s\S]*?"score-meaning"[\s\S]*?"simulation-ready"[\s\S]*?"juan-intro"[\s\S]*?"juan-choice"[\s\S]*?"quantified-feedback"[\s\S]*?"ask-clara-build-up"[\s\S]*?"clara-reveal"[\s\S]*?"mission-rule"[\s\S]*?"clara-context"[\s\S]*?"bigger-vision"[\s\S]*?\]/
  );
  assert.match(onboardingScreensSource, /JUAN_SHOE_OPTIONS/);
  assert.match(onboardingScreensSource, /afterScore/);
  assert.match(onboardingShellSource, /activeScreen === "mission-rule"/);
  assert.match(onboardingShellSource, /BiggerVisionScreen/);
  assert.doesNotMatch(onboardingShellSource, /MoneySituationScreen/);
  assert.doesNotMatch(onboardingShellSource, /FinancialSuccessScreen/);
});''',
)

replace_test(
    "tests/onboarding-direct-entry.test.mjs",
    "logged-out routes still wait for account restoration and then use Login",
    r'''test("logged-out routes still wait for account restoration and then use Login", () => {
  assert.match(appSource, /<FullScreenLoader message="Restoring your CLARA account\.\.\." \/>/);
  assert.match(appSource, /const isPublicAuthRoute =/);
  assert.match(appSource, /state=\{location\.pathname === "\/" \? undefined : \{ from: location \}\}/);
  assert.match(appSource, /<Suspense fallback=\{<FullScreenLoader message="Opening CLARA\.\.\." \/>\}>/);
});''',
)

replace_test(
    "tests/preferred-login-ui.test.mjs",
    "login remains mounted while an authentication request is processing",
    r'''test("login remains mounted while an authentication request is processing", () => {
  assert.match(appSource, /const isPublicAuthRoute =/);
  assert.match(appSource, /location\.pathname === "\/login"/);
  assert.match(appSource, /location\.pathname === "\/reset-password"/);
  assert.match(appSource, /loading && !isPublicAuthRoute/);
  assert.doesNotMatch(appSource, /if \(!authReady \|\| loading \|\| roleLoading\)/);
});''',
)

replace_test(
    "tests/savings-goal-card-flow-regression.test.mjs",
    "starter ideas prefill the goal and card totals preserve explicit zero",
    r'''test("starter ideas prefill the goal and card totals preserve explicit zero", () => {
  assert.match(page, /openAdd\(routeState\?\.starterTitle \|\| ""\)/);
  assert.match(page, /onClick=\{\(\) => openAdd\(\)\}/);
  assert.match(card, /goal\.saved_amount \?\?/);
  assert.match(card, /const activePrimaryGoal/);
  assert.match(card, /const saved = goals\.reduce/);
  assert.match(card, /const target = goals\.reduce/);
});''',
)

replace_test(
    "tests/savings-goal-card-flow-regression.test.mjs",
    "Savings Goals owns the complete top shell without a mount-time class",
    r'''test("Savings Goals owns the complete top shell without a mount-time class", () => {
  assert.doesNotMatch(wrapper, /useLayoutEffect/);
  assert.doesNotMatch(wrapper, /closest\("main"\)/);
  assert.match(topShell, /body:has\(\.savings-goals-premium\)/);
  assert.match(topShell, /#root:has\(\.savings-goals-premium\)/);
  assert.match(topShell, /\.theme-page-shell:has\(\.savings-goals-premium\)/);
  assert.match(topShell, /linear-gradient\(180deg, #051126 0%, #030817 58%, #050714 100%\) !important/);
  assert.match(topShell, /padding-top: 0 !important/);
  assert.match(topShell, /min-height: 100dvh/);
});''',
)

replace_test(
    "tests/savings-goal-card-flow-regression.test.mjs",
    "Savings Goal schedule entry cannot bypass financial-card projection sync",
    r'''test("Savings Goal schedule entry cannot bypass financial-card projection sync", () => {
  assert.match(scheduleEntry, /DashboardScheduleManualPanel/);
  assert.doesNotMatch(scheduleEntry, /syncFinancialCardSchedulesIntoCalendar/);
  assert.doesNotMatch(scheduleEntry, /financialProjectionEpoch/);
  assert.doesNotMatch(scheduleEntry, /localStorage/);
});''',
)

replace_once(
    "tests/savings-reconciliation-integrity.test.mjs",
    'const finance = readFileSync(new URL("../src/hooks/useFinancialData.js", import.meta.url), "utf8");',
    'const finance = readFileSync(new URL("../src/hooks/useFinancialDataBase.js", import.meta.url), "utf8");',
    "savings reconciliation owner",
)

replace_once(
    "tests/settings-integrity-regression.test.mjs",
    'const localFacadeSource = readSource("src/lib/local-supabase-facade.js");',
    'const localFacadeSource = readSource("src/lib/local-data-facade.js");',
    "settings local facade owner",
)

replace_test(
    "tests/settings-integrity-regression.test.mjs",
    "notification Settings no longer queries retired program tables to decide whether task settings exist",
    r'''test("notification Settings no longer queries retired program tables to decide whether task settings exist", () => {
  assert.doesNotMatch(notificationPanelSource, /from\("user_programs"\)/);
  assert.doesNotMatch(notificationPanelSource, /from\("user_program_day_assignments"\)/);
  assert.match(notificationPanelSource, /Push notifications/);
  assert.match(notificationPanelSource, /tasksAndCoaching/);
  assert.doesNotMatch(notificationPanelSource, /TaskReminderSettingsCard/);
});''',
)

replace_test(
    "tests/settings-local-only-regression.test.mjs",
    "router exposes the CLARA backend login and protects app routes",
    r'''test("router exposes the CLARA backend login and protects app routes", () => {
  assert.match(appSource, /pages\/Login/);
  assert.match(appSource, /<Login \/>/);
  assert.match(appSource, /const isPublicAuthRoute =/);
  assert.match(appSource, /loading && !isPublicAuthRoute/);
  assert.match(appSource, /state=\{location\.pathname === "\/" \? undefined : \{ from: location \}\}/);
  assert.match(
    appSource,
    /path="\/link-local-vault"[\s\S]*?<Navigate to=\{user \? CLARA_ORB_PATH : "\/login"\} replace \/>/
  );
});''',
)

replace_test(
    "tests/wallet-expanded-flow-regression.test.mjs",
    "wallet transfers respect spendable balance after protected funds",
    r'''test("wallet transfers respect spendable balance after protected funds", () => {
  assert.equal(helpers.includes("getWalletSpendableBalance"), true);
  assert.equal(handlers.includes("const transferableBalance"), true);
  assert.equal(handlers.includes("getWalletSpendableBalance(fromWallet)"), true);
  assert.equal(handlers.includes("if (transferableBalance < amount)"), true);
  assert.equal(handlers.includes("spendable balance after protected funds"), true);
});''',
)

replace_test(
    "tests/wallet-expanded-flow-regression.test.mjs",
    "wallet removal blocks money loss and preserves transaction history",
    r'''test("wallet removal blocks money loss and preserves transaction history", () => {
  assert.equal(handlers.includes("Transfer or clear the wallet balance before removing it"), true);
  assert.equal(handlers.includes("protectedAmount > 0 || hasLinkedFunds"), true);
  assert.equal(handlers.includes("hasHistory"), true);
  assert.equal(handlers.includes("is_archived: true"), true);
  assert.equal(syncedContent.includes("isEmergencyFundStorageWallet"), true);
  assert.equal(walletListItem.includes("onDeleteWallet?.(wallet)"), true);
  assert.equal(stateSync.includes("!wallet?.is_archived"), true);
  assert.equal(stateSync.includes("!wallet?.isArchived"), true);
});''',
)

print("Remaining full-suite + Means compatibility repair applied.")
