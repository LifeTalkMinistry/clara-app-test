import {
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { transformSavingsGoalsManagedBalance } from "../src/build/savingsGoalManagedBalanceTransform.js";

const pagePath = "src/pages/SavingsGoalsIntegrated.jsx";
const vitePath = "vite.config.js";
const packagePath = "package.json";
const workflowPath = ".github/workflows/verify-backend-membership-authority.yml";

const originalPage = readFileSync(pagePath, "utf8");
const materializedPage = transformSavingsGoalsManagedBalance(originalPage);
if (materializedPage === originalPage) {
  throw new Error("Savings Goal managed-balance transform made no changes.");
}
writeFileSync(pagePath, materializedPage);

let vite = readFileSync(vitePath, "utf8");
const transformImport =
  'import { savingsGoalManagedBalancePlugin } from "./src/build/savingsGoalManagedBalanceTransform.js";\n';
const transformedPlugins =
  "  plugins: [savingsGoalManagedBalancePlugin(), react()],";
if (!vite.includes(transformImport) || !vite.includes(transformedPlugins)) {
  throw new Error("Vite Savings Goal transform wiring was not found.");
}
vite = vite
  .replace(transformImport, "")
  .replace(transformedPlugins, "  plugins: [react()],");
writeFileSync(vitePath, vite);

const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
const oldTransformTest = "tests/savings-goal-managed-balance-transform.test.mjs";
const sourceTest = "tests/savings-goal-managed-balance-source.test.mjs";
const debtTest = "tests/debt-obligation-integrity.test.mjs";
const testParts = String(pkg.scripts.test || "")
  .split(/\s+/)
  .filter(Boolean)
  .filter((part) => part !== oldTransformTest);
if (!testParts.includes(sourceTest)) testParts.push(sourceTest);
if (!testParts.includes(debtTest)) testParts.push(debtTest);
pkg.scripts.test = testParts.join(" ");
writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

writeFileSync(
  sourceTest,
  `import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(\`../\${relativePath}\`, import.meta.url), "utf8");

const page = readSource("src/pages/SavingsGoalsIntegrated.jsx");
const vite = readSource("vite.config.js");

test("managed Savings Goal balance behavior lives in source code", () => {
  assert.match(page, /existing \\? currentSavedAmount/);
  assert.match(page, /Manage Saved Amount/);
  assert.match(page, /handleReleaseSavings/);
  assert.match(page, /handleCorrectSavingsBalance/);
  assert.match(page, /Savings balance needs correction/);
  assert.match(page, /Release Savings/);
  assert.match(page, /Correct Saved Balance/);
  assert.match(page, /Record correction only; no wallet transaction was created/);
  assert.match(page, /Protection removed; wallet balance was not changed/);
});

test("Vite compiles Savings Goals directly without source rewriting", () => {
  assert.doesNotMatch(vite, /savingsGoalManagedBalancePlugin|savingsGoalManagedBalanceTransform/);
  assert.equal(
    existsSync(new URL("../src/build/savingsGoalManagedBalanceTransform.js", import.meta.url)),
    false,
  );
});
`,
);

writeFileSync(
  debtTest,
  `import test from "node:test";
import assert from "node:assert/strict";
import {
  DEBT_OBLIGATION_RECORD_KIND,
  estimateDebtPayoffMonths,
  getDebtObligationMode,
  getNextDebtDueDate,
  isActiveDebtObligation,
  isDebtLinkedExpense,
  summarizeDebtObligationsPure,
} from "../src/lib/debtObligationMath.js";

test("legacy paid balances stay inactive while recurring obligations remain active", () => {
  const legacyPaid = {
    recordKind: DEBT_OBLIGATION_RECORD_KIND,
    status: "active",
    totalDebt: 0,
    monthlyDebt: 2500,
  };
  assert.equal(getDebtObligationMode(legacyPaid), "balance");
  assert.equal(isActiveDebtObligation(legacyPaid), false);
  assert.equal(
    isActiveDebtObligation({ ...legacyPaid, obligationMode: "recurring" }),
    true,
  );
});

test("completed balances are excluded from current debt pressure", () => {
  const summary = summarizeDebtObligationsPure(
    [
      {
        recordKind: DEBT_OBLIGATION_RECORD_KIND,
        status: "active",
        obligationMode: "balance",
        totalDebt: 50000,
        monthlyDebt: 6000,
      },
      {
        recordKind: DEBT_OBLIGATION_RECORD_KIND,
        status: "completed",
        obligationMode: "balance",
        totalDebt: 0,
        monthlyDebt: 4000,
      },
    ],
    { income: 30000 },
  );
  assert.equal(summary.activeCount, 1);
  assert.equal(summary.monthlyDebt, 6000);
  assert.equal(summary.debtRatio, 20);
});

test("payoff math handles interest and negative amortization", () => {
  const withoutInterest = estimateDebtPayoffMonths({
    balance: 10000,
    monthlyPayment: 1000,
    annualInterestRate: 0,
  });
  const withInterest = estimateDebtPayoffMonths({
    balance: 10000,
    monthlyPayment: 1000,
    annualInterestRate: 24,
  });
  const impossible = estimateDebtPayoffMonths({
    balance: 100000,
    monthlyPayment: 1000,
    annualInterestRate: 24,
  });
  assert.equal(withoutInterest, 10);
  assert.ok(withInterest > withoutInterest);
  assert.equal(impossible, Number.POSITIVE_INFINITY);
});

test("monthly due dates roll forward and debt expenses remain identifiable", () => {
  const next = getNextDebtDueDate(
    { dueDate: "2025-01-31" },
    new Date("2026-02-10T00:00:00"),
  );
  assert.equal(next?.getFullYear(), 2026);
  assert.equal(next?.getMonth(), 1);
  assert.equal(next?.getDate(), 28);
  assert.equal(isDebtLinkedExpense({ linked_target_type: "debt" }, []), true);
  assert.equal(
    isDebtLinkedExpense(
      { category: "Home Credit" },
      [{ title: "Home Credit" }],
    ),
    true,
  );
  assert.equal(
    isDebtLinkedExpense(
      { category: "Groceries" },
      [{ title: "Home Credit" }],
    ),
    false,
  );
});
`,
);

writeFileSync(
  workflowPath,
  `name: Verify Backend Membership Authority

on:
  pull_request:
    branches:
      - main

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run complete test suite
        run: npm test > membership-tests.log 2>&1

      - name: Run complete lint suite
        run: npm run lint > membership-lint.log 2>&1

      - name: Build production bundle
        run: npx vite build --base=./ > membership-build.log 2>&1

      - name: Scan production bundle for forbidden authorities
        run: |
          set -o pipefail
          if grep -R -n -E 'verifyHiddenAdminPassword|grantDeveloperCommittedAccess|readDeveloperMembershipPreview|OPEN_COMMITTED_ACCESS_CODE_EVENT|CommittedAccessCodeModal|IosPwaAccessGate|HiddenAdminRoute|AdminRescueButton|CoachingAdminPage|clara-ios-access' dist > membership-bundle-scan.log 2>&1; then
            echo 'Forbidden executable membership or admin authority found in production bundle.' >> membership-bundle-scan.log
            exit 1
          fi
          echo 'No forbidden executable membership or admin authority found in production bundle.' > membership-bundle-scan.log

      - name: Upload validation logs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: backend-membership-authority-validation
          path: |
            membership-tests.log
            membership-lint.log
            membership-build.log
            membership-bundle-scan.log
          if-no-files-found: warn
          retention-days: 3
`,
);

for (const path of [
  "src/build/savingsGoalManagedBalanceTransform.js",
  oldTransformTest,
  ".github/workflows/materialize-savings-goal-source.yml",
  ".github/materialize-trigger.txt",
  "scripts/materialize-savings-goal-source.mjs",
]) {
  if (existsSync(path)) unlinkSync(path);
}

console.log("Savings Goal managed-balance behavior is now committed source code.");
