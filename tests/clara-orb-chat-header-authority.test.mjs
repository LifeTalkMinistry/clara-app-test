import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const assistantDir = new URL(
  "../src/components/fresh/main-dashboard/assistant/",
  import.meta.url
);

const overlayCases = [
  ["ClaraLogExpenseOverlayV2.jsx", "Log Expense", "Check · Record · Stay accurate"],
  ["ClaraAddIncomeOverlayV2.jsx", "Add Income", "Record · Transfer · Keep income accurate"],
  ["ClaraWalletOverlayV2.jsx", "Wallet", "Current · Protected · Spendable"],
  ["ClaraCalendarOverlay.jsx", "Calendar", "Plan · Schedule · Stay ahead"],
  ["ClaraMoneyScheduleOverlay.jsx", "Money Schedule", "Daily routine · Monday to Sunday"],
  ["ClaraEmergencyFundOverlay.jsx", "Emergency Fund", "Protect · Prepare · Build security"],
  ["ClaraSavingsGoalOverlay.jsx", "Savings Goal", "Set · Save · Reach your goal"],
  ["ClaraDebtObligationOverlay.jsx", "Debt / Obligations", "Record · Pay · Review · Stay accountable"],
  ["ClaraWeeklyMoneyCheckOverlayV2.jsx", "Weekly Cross-Check", "Verify · Reconcile · Stay accountable"],
];

async function readAssistantFile(filename) {
  return readFile(new URL(filename, assistantDir), "utf8");
}

test("all ORB conversational overlays use one shared CLARA Chat header", async () => {
  for (const [filename, title, tagline] of overlayCases) {
    const source = await readAssistantFile(filename);
    assert.match(
      source,
      /import ClaraChatHeader from ["']\.\/ClaraChatHeader["'];/,
      `${filename} must import ClaraChatHeader`
    );
    assert.match(source, /<ClaraChatHeader\b/, `${filename} must render ClaraChatHeader`);
    assert.ok(source.includes(`title="${title}"`), `${filename} must keep its canonical title`);
    assert.ok(source.includes(`tagline="${tagline}"`), `${filename} must keep its canonical tagline`);
    assert.doesNotMatch(
      source,
      /rounded-\[24px\][^\n]*border-blue-200\/18[^\n]*linear-gradient\(115deg/,
      `${filename} must not recreate the universal header shell locally`
    );
  }
});

test("ClaraChatHeader owns the canonical Debt header presentation", async () => {
  const source = await readAssistantFile("ClaraChatHeader.jsx");
  assert.match(source, /data-clara-chat-header="true"/);
  assert.match(source, /rounded-\[24px\]/);
  assert.match(source, /border-blue-200\/18/);
  assert.match(source, /linear-gradient\(115deg/);
  assert.match(source, /px-4 py-3\.5 pr-14/);
  assert.match(source, /text-\[9px\][^\n]*tracking-\[0\.24em\]/);
  assert.match(source, /text-\[17px\][^\n]*font-black/);
  assert.match(source, /text-\[10px\][^\n]*tracking-\[0\.14em\]/);
  assert.match(source, /h-9 w-9/);
  assert.match(source, />CLARA CHAT<\/p>/);
});

test("special close semantics remain delegated to feature overlays", async () => {
  const wallet = await readAssistantFile("ClaraWalletOverlayV2.jsx");
  const weekly = await readAssistantFile("ClaraWeeklyMoneyCheckOverlayV2.jsx");
  const emergency = await readAssistantFile("ClaraEmergencyFundOverlay.jsx");

  assert.match(wallet, /onClose=\{closeWallet\}/);
  assert.match(weekly, /onClose=\{closeChat\}/);
  assert.match(emergency, /onClose=\{onClose\}/);
  assert.match(emergency, /closeDisabled=\{saving\}/);
});

test("ORB runtime owns routing and Log Expense input behavior, not header styling", async () => {
  const runtime = await readFile(
    new URL("../src/runtime/installClaraOrbCommandChatRouting.js", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(runtime, /simplifyLogExpenseHeader/);
  assert.doesNotMatch(runtime, /simplifyMoneyScheduleHeader/);
  assert.doesNotMatch(runtime, /querySelector\(["']header["']\)/);
  assert.doesNotMatch(runtime, /header\.style/);
  assert.doesNotMatch(runtime, /claraLogExpensePremiumHeader|claraMoneySchedulePremiumHeader/);

  assert.match(runtime, /sanitizeLogExpenseAmountInput/);
  assert.match(runtime, /configureLogExpenseComposerInputs/);
  assert.match(runtime, /CANONICAL_FORM_ATTRIBUTE/);
  assert.match(runtime, /CANONICAL_STACK_ATTRIBUTE/);

  for (const commandId of [
    "log-expense",
    "add-income",
    "wallet",
    "calendar",
    "money-schedule",
    "emergency-fund",
    "savings-goal",
    "debt-obligation",
    "weekly-cross-check",
  ]) {
    assert.ok(runtime.includes(`"${commandId}"`) || runtime.includes(`${commandId}:`));
  }
});
