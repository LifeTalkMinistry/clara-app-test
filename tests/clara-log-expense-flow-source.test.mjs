import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const overlaySource = await readFile(
  new URL("../src/components/fresh/main-dashboard/assistant/ClaraLogExpenseOverlayV2.jsx", import.meta.url),
  "utf8"
);

const moneyScheduleSource = await readFile(
  new URL("../src/components/fresh/main-dashboard/assistant/ClaraMoneyScheduleOverlay.jsx", import.meta.url),
  "utf8"
);

const moneyScheduleRepositorySource = await readFile(
  new URL("../src/lib/clara-money-schedule-repository.js", import.meta.url),
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

test("empty planned list hands directly into Money Schedule chat instead of the Calendar", () => {
  assert.match(overlaySource, /I don’t see an active planned budget or Money Schedule yet/);
  assert.match(overlaySource, /Would you like to set up your Money Schedule now\?/);
  assert.match(overlaySource, />Yes, set it up</);
  assert.match(overlaySource, />Not now</);
  assert.match(overlaySource, /phase === "money-schedule-offer"/);
  assert.match(overlaySource, /CLARA_PAUSE_OPEN_REQUEST_EVENT/);
  assert.match(overlaySource, /mode: "money-schedule"/);
  assert.match(overlaySource, /commandId: "money-schedule"/);
  assert.doesNotMatch(overlaySource, /navigate\("\/community\?view=schedule"\)/);
  assert.doesNotMatch(overlaySource, /window\.location\.assign\("\/community\?view=schedule"\)/);
});

test("Money Schedule starts from the user's daily routine instead of a calendar event form", () => {
  assert.match(moneyScheduleSource, /usual daily routine expenses/i);
  assert.match(moneyScheduleSource, /Let’s start with Monday/i);
  assert.match(moneyScheduleSource, /leave out occasional or extra spending/i);
  assert.match(moneyScheduleSource, /build Monday one routine expense at a time/i);
  assert.match(moneyScheduleSource, /Transportation 100/);
  assert.doesNotMatch(moneyScheduleSource, /What are you expecting to pay for or receive/);
  assert.doesNotMatch(moneyScheduleSource, /When should this happen/);
});

test("Money Schedule uses the same editable day controls on Monday and copied days", () => {
  assert.match(moneyScheduleSource, /setEditItems\(\[\]\)/);
  assert.match(moneyScheduleSource, /"day-edit"/);
  assert.match(moneyScheduleSource, /data-clara-money-routine-day-controls="true"/);
  assert.match(moneyScheduleSource, /<PlusCircle className="h-4 w-4" \/> Add/);
  assert.match(moneyScheduleSource, /<MinusCircle className="h-4 w-4" \/> Remove/);
  assert.match(moneyScheduleSource, /<PencilLine className="h-4 w-4" \/> Change amount/);
  assert.match(moneyScheduleSource, /editReturnContext \? "Done editing" : "Done"/);
  assert.doesNotMatch(moneyScheduleSource, /phase === "day-review"/);
  assert.doesNotMatch(moneyScheduleSource, /Looks right/);
});

test("Money Schedule lets later days reuse or modify any completed day", () => {
  assert.match(moneyScheduleSource, /Same as \{day\.name\}/);
  assert.match(moneyScheduleSource, /Copy a day & change it/);
  assert.match(moneyScheduleSource, /Completely different setup/);
  assert.match(moneyScheduleSource, /Start from \{day\.name\}/);
  assert.match(moneyScheduleSource, /Use Add, Remove, or Change amount/);
  assert.match(moneyScheduleSource, /will start empty/);
});

test("Money Schedule can edit a completed day without losing the current setup position", () => {
  assert.match(moneyScheduleSource, /Edit a previous day/);
  assert.match(moneyScheduleSource, /phase === "edit-previous-source"/);
  assert.match(moneyScheduleSource, /data-clara-money-routine-edit-previous="true"/);
  assert.match(moneyScheduleSource, /editReturnContext/);
  assert.match(moneyScheduleSource, /returnDayIndex/);
  assert.match(moneyScheduleSource, /setDayIndex\(returnDayIndex\)/);
  assert.match(moneyScheduleSource, /Now let’s continue setting up/);
  assert.match(moneyScheduleSource, /Done editing/);
});

test("Money Schedule weekly review lets every day reopen in the same editor", () => {
  assert.match(moneyScheduleSource, /choosePreviousDayToEdit\(day, "weekly-review"\)/);
  assert.match(moneyScheduleSource, /aria-label=\{`Edit \$\{day\.name\} routine`\}/);
  assert.match(moneyScheduleSource, /Your weekly review is refreshed/);
});

test("Money Schedule persists a seven-day weekly routine until the user updates it", () => {
  assert.match(moneyScheduleSource, /saveClaraMoneyRoutine/);
  assert.match(moneyScheduleSource, /current weekly routine until you update it/i);
  assert.match(moneyScheduleRepositorySource, /CLARA_MONEY_ROUTINE_WEEKDAYS/);
  assert.match(moneyScheduleRepositorySource, /monday/);
  assert.match(moneyScheduleRepositorySource, /sunday/);
  assert.match(moneyScheduleRepositorySource, /repeatMode: "until_updated"/);
  assert.match(moneyScheduleRepositorySource, /weeklyTotalCentavos/);
  assert.match(moneyScheduleRepositorySource, /days\.length !== CLARA_MONEY_ROUTINE_WEEKDAYS\.length/);
});

test("Money Schedule stores routine money as integer centavos", () => {
  assert.match(moneyScheduleRepositorySource, /amountCentavos/);
  assert.match(moneyScheduleRepositorySource, /amount_centavos/);
  assert.match(moneyScheduleRepositorySource, /moneyTextToCentavos/);
  assert.match(moneyScheduleRepositorySource, /Math\.round\(wholeNumber \* 100 \+ fractionNumber\)/);
});

test("Money Schedule uses CLARA conversation pacing instead of static assistant replies", () => {
  assert.match(moneyScheduleSource, /getClaraReplyDelay/);
  assert.match(moneyScheduleSource, /getClaraTypingPlan/);
  assert.match(moneyScheduleSource, /getClaraReadDelay/);
  assert.match(moneyScheduleSource, /pendingMessage/);
  assert.match(moneyScheduleSource, /typedText/);
  assert.match(moneyScheduleSource, /interactionReady/);
  assert.match(moneyScheduleSource, /runAssistantSequence/);
  assert.match(moneyScheduleSource, /controlsReady = interactionReady/);
  assert.match(moneyScheduleSource, /<Bubble role="assistant" typing>/);
  assert.match(moneyScheduleSource, /data-clara-conversation-pacing="masterclass"/);
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
