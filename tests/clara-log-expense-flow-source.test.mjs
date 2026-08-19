import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const overlaySource = await readFile(
  new URL("../src/components/fresh/main-dashboard/assistant/ClaraLogExpenseOverlayV2.jsx", import.meta.url),
  "utf8"
);

const environmentSource = await readFile(
  new URL("../src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlay.jsx", import.meta.url),
  "utf8"
);

const commandRingCss = await readFile(
  new URL("../src/lib/clara-orb-command-ring.css", import.meta.url),
  "utf8"
);

const commandChatRoutingSource = await readFile(
  new URL("../src/runtime/installClaraOrbCommandChatRouting.js", import.meta.url),
  "utf8"
);

test("Log Expense chat starts with greeting and planned versus unplanned choice", () => {
  assert.match(overlaySource, /Hi \$\{firstName\}!/);
  assert.match(overlaySource, /scheduled budget, or was it unplanned spending/i);
  assert.match(overlaySource, />Scheduled \/ Planned</);
  assert.match(overlaySource, />Unplanned Spending</);
});

test("planned spending branch explicitly avoids duplicate logging", () => {
  assert.match(overlaySource, /you don’t have to log it again/i);
  assert.match(overlaySource, /count it twice/i);
  assert.match(overlaySource, /Show my planned list/);
});

test("empty planned list continues into a Money Schedule offer instead of ending", () => {
  assert.match(overlaySource, /I don’t see an active planned budget or Money Schedule yet/);
  assert.match(overlaySource, /Would you like to set up your Money Schedule now\?/);
  assert.match(overlaySource, />Yes, set it up</);
  assert.match(overlaySource, />Not now</);
  assert.match(overlaySource, /phase === "money-schedule-offer"/);
  assert.match(overlaySource, /useNavigate/);
  assert.match(overlaySource, /navigate\("\/community\?view=schedule"\)/);
  assert.doesNotMatch(overlaySource, /window\.location\.assign\("\/community\?view=schedule"\)/);
});

test("Log Expense uses the Emergency Fund Masterclass conversation rhythm", () => {
  assert.match(overlaySource, /getClaraReplyDelay/);
  assert.match(overlaySource, /getClaraTypingPlan/);
  assert.match(overlaySource, /getClaraReadDelay/);
  assert.match(overlaySource, /pendingMessage/);
  assert.match(overlaySource, /typedText/);
  assert.match(overlaySource, /data-clara-conversation-pacing="masterclass"/);
  assert.doesNotMatch(overlaySource, /function TypingBubble/);
  assert.doesNotMatch(overlaySource, /data-clara-log-expense-typing="true"/);
});

test("Log Expense hides controls until CLARA finishes typing", () => {
  assert.match(overlaySource, /setInteractionReady\(false\)/);
  assert.match(overlaySource, /setInteractionReady\(true\)/);
  assert.match(overlaySource, /controlsReady = interactionReady/);
  assert.match(overlaySource, /phase === "planning-choice" && controlsReady/);
  assert.match(overlaySource, /phase === "amount" && controlsReady/);
  assert.match(overlaySource, /phase === "confirm" && controlsReady/);
});

test("Log Expense free-text composer registers with the canonical CLARA keyboard guard", () => {
  assert.match(commandChatRoutingSource, /data-clara-log-expense-chat/);
  assert.match(commandChatRoutingSource, /data-clara-buy-check-react-form/);
  assert.match(commandChatRoutingSource, /data-clara-ai-message-stack/);
  assert.match(commandChatRoutingSource, /new MutationObserver\(queueKeyboardRegistration\)/);
  assert.match(commandChatRoutingSource, /registerLogExpenseChatKeyboardOwnership/);
});

test("Log Expense amount is numeric-only while item input remains unrestricted text", () => {
  assert.match(commandChatRoutingSource, /sanitizeLogExpenseAmountInput/);
  assert.match(commandChatRoutingSource, /replace\(\/\[\^0-9\.\]\/g, ""\)/);
  assert.match(commandChatRoutingSource, /inputmode", "decimal"/);
  assert.match(commandChatRoutingSource, /pattern", "\[0-9\]\*\[\.\]\?\[0-9\]\{0,2\}"/);
  assert.match(commandChatRoutingSource, /data-clara-log-expense-input-kind", "amount"/);
  assert.match(commandChatRoutingSource, /inputmode", "text"/);
  assert.match(commandChatRoutingSource, /removeAttribute\("pattern"\)/);
  assert.match(commandChatRoutingSource, /data-clara-log-expense-input-kind", "item"/);
});

test("unplanned spending reuses the atomic Buy Check expense repository", () => {
  assert.match(overlaySource, /addBuyCheckExpense/);
  assert.match(overlaySource, /planning_status: "unplanned"/);
  assert.match(overlaySource, /Logged through CLARA Orb/);
  assert.match(overlaySource, /dispatchFinanceUpdates\(\)/);
});

test("CLARA environment renders dedicated Log Expense mode", () => {
  assert.match(environmentSource, /entryMode === "log-expense"/);
  assert.match(environmentSource, /<ClaraLogExpenseOverlay/);
});

test("short Log Expense conversations sit lower like a normal chat instead of stacking under the header", () => {
  assert.match(commandRingCss, /\[data-clara-log-expense-chat="true"\]/);
  assert.match(commandRingCss, /\[data-clara-ai-message-viewport="true"\]/);
  assert.match(commandRingCss, /justify-content:\s*flex-end/);
  assert.match(commandRingCss, /padding-bottom:\s*clamp\(72px,\s*11vh,\s*96px\)/);
});
