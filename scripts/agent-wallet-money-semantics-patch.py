from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, content):
    (ROOT / path).write_text(content, encoding="utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one regex match, found {count}")
    return updated


# useFinancialData: accounting normalization stays current-balance-only, while
# all protected/spendable annotations come from the shared finance authority.
path = "src/hooks/useFinancialData.js"
text = read(path)
text = replace_once(
    text,
    'import { getWalletBalance } from "@/utils/financialEngine";\n',
    'import { getWalletBalance } from "@/utils/financialEngine";\nimport { syncWalletProtectedAllocations } from "@/lib/clara-wallet-money-semantics";\n',
    "useFinancialData shared semantics import",
)
text = regex_once(
    text,
    r'    const safeSavingsGoals = sortByOldest\(removeDeletedRows\(rawSavingsGoals\)\);\n.*?    const safeIncomes = safeWalletTransactions\.filter\(isEarnedIncomeTransaction\);',
    '''    const safeSavingsGoals = sortByOldest(removeDeletedRows(rawSavingsGoals));

    // Accounting normalization owns Current Balance only. Protected/spendable
    // values are read-only annotations added by the shared wallet semantics layer.
    const currentBalanceWallets = sortByOldest(removeDeletedRows(rawWallets)).map((wallet) => {
      const balance = getWalletBalance(wallet, safeWalletTransactions, safeTransfers);
      return {
        ...wallet,
        balance,
        derived_balance: balance,
      };
    });

    const normalizedWallets = syncWalletProtectedAllocations({
      rows: currentBalanceWallets,
      allWallets: currentBalanceWallets,
      emergencyFund: rawEmergencyFund || null,
      savingsGoals: safeSavingsGoals,
    });

    const safeIncomes = safeWalletTransactions.filter(isEarnedIncomeTransaction);''',
    "useFinancialData wallet normalization",
)
write(path, text)


# dashboardHelpers: keep existing public helper names, but delegate semantics.
path = "src/utils/dashboard/dashboardHelpers.js"
text = read(path)
if "clara-wallet-money-semantics" not in text:
    text = 'import {\n  getWalletCurrentBalance,\n  getWalletSpendableBalance as getSharedWalletSpendableBalance,\n} from "../../lib/clara-wallet-money-semantics.js";\n\n' + text
text = regex_once(
    text,
    r'export const getWalletDisplayBalance = \(\n  wallet = \{\}\n\) =>\n  safeNumber\(\n    wallet\?\.walletBalance \?\?.*?export const getWalletSpendableBalance = \(wallet = \{\}\) => \{.*?\n\};',
    '''export const getWalletDisplayBalance = (wallet = {}) =>
  getWalletCurrentBalance(wallet);

export const getWalletSpendableBalance = (wallet = {}) =>
  getSharedWalletSpendableBalance(wallet);''',
    "dashboard wallet display/spendable helpers",
)
write(path, text)


# Home owns the planning view declaratively. Actual total remains the source for
# FinancialCarousel; only DashboardMoneySummaryStable switches display mode.
path = "src/components/community/CommunityHomeFinancialCarousel.jsx"
text = read(path)
text = replace_once(
    text,
    'import { syncProtectedAllocations } from "@/components/financial-carousel/cards/wallet/ui/WalletCardContentSynced";\n',
    'import { getTotalWalletSpendableBalance } from "@/lib/clara-wallet-money-semantics";\n',
    "CommunityHome shared semantics import",
)
text = replace_once(
    text,
    '  const [walletActionLoading, setWalletActionLoading] = useState(false);\n',
    '  const [walletActionLoading, setWalletActionLoading] = useState(false);\n  const [moneyLeftMode, setMoneyLeftMode] = useState("current");\n',
    "CommunityHome money left mode state",
)
text = regex_once(
    text,
    r'  const spendableWalletBalance = useMemo\(\(\) => \{.*?\n  \}, \[emergencyFund, savingsGoals, wallets\]\);',
    '''  const spendableWalletBalance = useMemo(
    () =>
      getTotalWalletSpendableBalance({
        wallets,
        emergencyFund,
        savingsGoals,
      }),
    [emergencyFund, savingsGoals, wallets]
  );''',
    "CommunityHome spendable wallet total",
)
text = replace_once(
    text,
    '  const afterMonthlyBudgetMoney =\n    spendableMoneyProjection.projectedSpendableMoney;\n',
    '  const afterMonthlyBudgetMoney =\n    spendableMoneyProjection.projectedSpendableMoney;\n  const displayedMoneyLeft =\n    moneyLeftMode === "projected" ? afterMonthlyBudgetMoney : totalWalletBalance;\n',
    "CommunityHome displayed Money Left",
)
needle = '            walletMoney={totalWalletBalance}\n'
positions = [m.start() for m in re.finditer(re.escape(needle), text)]
if len(positions) != 2:
    raise RuntimeError(f"CommunityHome walletMoney props: expected 2 occurrences, found {len(positions)}")
second = positions[1]
text = text[:second] + '            walletMoney={displayedMoneyLeft}\n' + text[second + len(needle):]
text = regex_once(
    text,
    r'          <div\n            data-clara-after-budget-total="true".*?          </div>',
    '''          <button
            type="button"
            data-clara-after-budget-total="true"
            data-clara-after-budget-active={moneyLeftMode === "projected" ? "true" : "false"}
            aria-pressed={moneyLeftMode === "projected"}
            aria-label={
              moneyLeftMode === "projected"
                ? "Show current Money Left"
                : `Show spendable Money Left after protected funds, budget, and unpaid obligations. Projected amount: ${formatPhpCurrency(
                    afterMonthlyBudgetMoney
                  )}`
            }
            title={moneyLeftMode === "projected" ? "Current Money Left" : "Spendable after commitments"}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setMoneyLeftMode((current) =>
                current === "projected" ? "current" : "projected"
              );
            }}
          >
            <span data-clara-after-budget-icon="true" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 7H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
                <path d="M16 13h4" />
                <path d="M6 7V5a2 2 0 0 1 2-2h8" />
                <path d="M8 13h4" />
              </svg>
            </span>
          </button>''',
    "CommunityHome declarative Money Left toggle",
)
write(path, text)


# Runtime file remains only as a visual style installer for compatibility.
runtime = '''import "./installMoneyLeftAnalyticsShortcut";

const HOME_MONEY_LEFT_SELECTOR =
  '.clara-community-root[data-community-view="home"] .clara-community-home-money-left';
const PROJECTION_SELECTOR = '[data-clara-after-budget-total="true"]';
const STYLE_ID = 'clara-money-left-after-budget-toggle-style';

function installStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    ${HOME_MONEY_LEFT_SELECTOR} ${PROJECTION_SELECTOR} {
      position: absolute !important;
      z-index: 58 !important;
      top: clamp(12px, 3.4vw, 16px) !important;
      left: calc(var(--clara-money-tool-start, clamp(112px, 33vw, 132px)) + var(--clara-money-tool-step, 40px)) !important;
      width: var(--clara-money-tool-size, 32px) !important;
      min-width: var(--clara-money-tool-size, 32px) !important;
      height: var(--clara-money-tool-size, 32px) !important;
      min-height: var(--clara-money-tool-size, 32px) !important;
      padding: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      overflow: visible !important;
      pointer-events: auto !important;
      cursor: pointer !important;
      border: 1px solid rgba(255,216,74,0.42) !important;
      border-radius: 999px !important;
      background: linear-gradient(145deg, rgba(78,61,18,0.72), rgba(4,21,49,0.96)) !important;
      color: #ffd84a !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.10), 0 0 14px rgba(255,216,74,0.10) !important;
      line-height: 1 !important;
      transform: translateX(-50%) !important;
      transition: transform 150ms ease, border-color 150ms ease, background 150ms ease, color 150ms ease, box-shadow 150ms ease !important;
      -webkit-tap-highlight-color: transparent;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${PROJECTION_SELECTOR}:hover {
      border-color: rgba(255,255,255,0.52) !important;
      background: linear-gradient(145deg, rgba(105,82,22,0.82), rgba(6,28,63,0.98)) !important;
      color: #ffffff !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 0 18px rgba(255,216,74,0.15) !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${PROJECTION_SELECTOR}:active {
      transform: translateX(-50%) scale(0.94) !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${PROJECTION_SELECTOR}:focus-visible {
      outline: 2px solid rgba(255,216,74,0.82) !important;
      outline-offset: 2px !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${PROJECTION_SELECTOR}[data-clara-after-budget-active="true"] {
      border-color: rgba(255,226,106,0.78) !important;
      background: linear-gradient(145deg, rgba(126,93,16,0.88), rgba(8,37,81,0.98)) !important;
      color: #fff2a8 !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 0 20px rgba(255,216,74,0.20) !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${PROJECTION_SELECTOR} > span[data-clara-after-budget-icon="true"] {
      display: flex !important;
      width: var(--clara-money-tool-icon, 14px) !important;
      height: var(--clara-money-tool-icon, 14px) !important;
      align-items: center !important;
      justify-content: center !important;
      color: currentColor !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${PROJECTION_SELECTOR} > span[data-clara-after-budget-icon="true"] svg {
      display: block !important;
      width: var(--clara-money-tool-icon, 14px) !important;
      height: var(--clara-money-tool-icon, 14px) !important;
    }
  `;
  document.head.appendChild(style);
}

// Compatibility exports retained for callers that still install the runtime
// module. Display ownership now lives entirely in React.
export function applyAfterBudgetToggle() {
  installStyles();
}

export function installMoneyLeftAfterBudgetToggle() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  installStyles();
}

installMoneyLeftAfterBudgetToggle();
'''
write("src/runtime/installMoneyLeftAfterBudgetToggle.js", runtime)


# Keep the projection test aligned with the new Home ownership.
path = "tests/home-spendable-money-projection.test.mjs"
text = read(path)
text = text.replace("/syncProtectedAllocations/", "/getTotalWalletSpendableBalance/")
text = text.replace("/After commitments/", "/moneyLeftMode/\);\n  assert.match(communityHome, /displayedMoneyLeft/\);\n  assert.match(communityHome, /data-clara-after-budget-active/\)")
write(path, text)


# Ensure both projection and wallet-semantics regressions run in the standard suite.
path = "package.json"
package = json.loads(read(path))
test_script = package["scripts"]["test"]
for test_file in [
    "tests/home-spendable-money-projection.test.mjs",
    "tests/wallet-money-semantics.test.mjs",
]:
    if test_file not in test_script:
        test_script += f" {test_file}"
package["scripts"]["test"] = test_script
write(path, json.dumps(package, indent=2, ensure_ascii=False) + "\n")

print("wallet money semantics integration patch applied")
