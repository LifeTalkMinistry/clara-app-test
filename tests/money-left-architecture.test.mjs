import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read = (path) => fs.readFile(new URL(path, import.meta.url), "utf8");

test("Money Left owns its calculator and orb gestures inside React", async () => {
  const [
    summarySource,
    calculatorSource,
    gestureSource,
    mainSource,
    modalHandlersSource,
    orbHandlersSource,
    soundSource,
    themeSource,
  ] = await Promise.all([
    read("../src/components/fresh/main-dashboard/money-summary/DashboardMoneySummaryStable.jsx"),
    read("../src/components/fresh/main-dashboard/money-summary/MoneyLeftCalculator.jsx"),
    read("../src/components/fresh/main-dashboard/money-summary/useMoneyLeftOrbGestures.js"),
    read("../src/main.jsx"),
    read("../src/components/fresh/main-dashboard/finance-actions/useDashboardFinanceModalHandlers.js"),
    read("../src/components/fresh/main-dashboard/finance-actions/useDashboardOrbInteractionHandlers.js"),
    read("../src/runtime/installMoneyLeftOrbInteractionSound.js"),
    read("../src/clara-fab-theme.css"),
  ]);

  assert.match(summarySource, /import MoneyLeftCalculator/);
  assert.match(summarySource, /import useMoneyLeftOrbGestures/);
  assert.match(summarySource, /data-clara-money-calculator-toggle="true"/);
  assert.match(summarySource, /\.\.\.moneyLeftCardHandlers/);
  assert.doesNotMatch(summarySource, /MutationObserver/);

  assert.match(calculatorSource, /data-clara-money-calculator-modal="true"/);
  assert.match(calculatorSource, /data-clara-calculator-manual-log-action="true"/);
  assert.match(calculatorSource, /createPortal/);
  assert.match(calculatorSource, /const onCloseRef = useRef\(onClose\)/);
  assert.match(calculatorSource, /onCloseRef\.current = onClose/);
  assert.match(calculatorSource, /\}, \[isOpen\]\);/);
  assert.doesNotMatch(calculatorSource, /\}, \[isOpen, onClose\]\);/);
  assert.doesNotMatch(calculatorSource, /Function\s*\(/);
  assert.doesNotMatch(calculatorSource, /MutationObserver/);

  assert.match(gestureSource, /resolvedGesture:\s*true/);
  assert.match(gestureSource, /playMoneyLeftOrbInteractionSound/);
  assert.doesNotMatch(gestureSource, /document\.addEventListener/);

  assert.doesNotMatch(mainSource, /installMoneyLeftCalculator/);
  assert.doesNotMatch(mainSource, /installMoneyLeftCalculatorAlignment/);
  assert.doesNotMatch(mainSource, /installMoneyLeftCalculatorManualLogBridge/);
  assert.doesNotMatch(mainSource, /installMoneyLeftCalculatorAmountPrefill/);
  assert.doesNotMatch(mainSource, /installMoneyLeftOrbInteractionSound/);

  assert.match(modalHandlersSource, /initialAmount/);
  assert.match(modalHandlersSource, /amount:\s*initialAmount/);
  assert.match(orbHandlersSource, /options\?\.resolvedGesture/);
  assert.match(
    orbHandlersSource,
    /safeOpenManualExpenseModal\(\{ initialAmount: options\.initialAmount \}\)/,
  );

  assert.match(soundSource, /playMoneyLeftOrbInteractionSound/);
  assert.doesNotMatch(soundSource, /document\.addEventListener/);
  assert.doesNotMatch(soundSource, /pointerStates/);

  assert.match(themeSource, /\[data-clara-summary-privacy-toggle="true"\],\s*\n\.theme-page-shell main \[data-clara-money-calculator-toggle="true"\]/);
  assert.match(themeSource, /width:\s*24px !important;/);
  assert.match(themeSource, /height:\s*24px !important;/);
  assert.match(
    themeSource,
    /left:\s*calc\(clamp\(112px, 33vw, 132px\) \+ 38px\) !important;/,
  );
});
