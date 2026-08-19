import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pacingSource = await readFile(
  new URL("../src/lib/clara-conversation-pacing.js", import.meta.url),
  "utf8"
);
const logExpenseSource = await readFile(
  new URL("../src/components/fresh/main-dashboard/assistant/ClaraLogExpenseOverlayV2.jsx", import.meta.url),
  "utf8"
);
const buyCheckSource = await readFile(
  new URL("../src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayV2.jsx", import.meta.url),
  "utf8"
);
const weeklySource = await readFile(
  new URL("../src/components/fresh/main-dashboard/assistant/ClaraWeeklyMoneyCheckOverlayV2.jsx", import.meta.url),
  "utf8"
);
const masterclassRuntimeSource = await readFile(
  new URL("../src/components/community/masterclass/ClaraMasterclassRuntime.jsx", import.meta.url),
  "utf8"
);
const masterclassPrimitiveSource = await readFile(
  new URL("../src/components/community/masterclass/ClaraMasterclassPrimitives.jsx", import.meta.url),
  "utf8"
);

test("canonical pacing matches the Emergency Fund Masterclass timing envelope", () => {
  assert.match(pacingSource, /CLARA_TYPING_MIN_DURATION_MS = 1800/);
  assert.match(pacingSource, /CLARA_TYPING_MAX_DURATION_MS = 5200/);
  assert.match(pacingSource, /CLARA_TYPING_TICK_MS = 28/);
  assert.match(pacingSource, /CLARA_READ_MIN_DELAY_MS = 5200/);
  assert.match(pacingSource, /CLARA_READ_MAX_DELAY_MS = 8200/);

  assert.match(masterclassRuntimeSource, /Math\.min\(5200, Math\.max\(1800, source\.length \* 7\)\)/);
  assert.match(masterclassRuntimeSource, /const tickMs = 28/);
  assert.match(masterclassPrimitiveSource, /const MIN_READ_DELAY_MS = 5200/);
  assert.match(masterclassPrimitiveSource, /const MAX_READ_DELAY_MS = 8200/);
});

test("all production CLARA financial chat surfaces declare masterclass pacing", () => {
  assert.match(logExpenseSource, /data-clara-conversation-pacing="masterclass"/);
  assert.match(buyCheckSource, /data-clara-conversation-pacing=\{pacingEnabled \? "masterclass" : "preview"\}/);
  assert.match(weeklySource, /data-clara-conversation-pacing="masterclass"/);
});

test("Log Expense types the actual CLARA sentence and unlocks controls only after reading time", () => {
  assert.match(logExpenseSource, /getClaraTypingPlan/);
  assert.match(logExpenseSource, /pendingMessage/);
  assert.match(logExpenseSource, /typedText/);
  assert.match(logExpenseSource, /getClaraReadDelay\(\)/);
  assert.match(logExpenseSource, /controlsReady = interactionReady/);
});

test("Ask Before You Spend progressively types new CLARA messages and locks reply controls", () => {
  assert.match(buyCheckSource, /function CanonicalTypewriter/);
  assert.match(buyCheckSource, /getClaraReplyDelay/);
  assert.match(buyCheckSource, /getClaraTypingPlan/);
  assert.match(buyCheckSource, /getClaraReadDelay/);
  assert.match(buyCheckSource, /pacingLocked/);
  assert.match(buyCheckSource, /actionBarVisible/);
});

test("Weekly Money Check waits for one CLARA turn at a time", () => {
  assert.match(weeklySource, /getClaraTypingPlan/);
  assert.match(weeklySource, /getClaraReadDelay/);
  assert.match(weeklySource, /pendingReviewRef/);
  assert.match(weeklySource, /mergeTrailingAssistant/);
  assert.match(weeklySource, /interactionLocked = Boolean\(typingMessageId\) \|\| readLocked/);
  assert.doesNotMatch(weeklySource, /window\.setTimeout\(\(\) => beginReview\(nextSnapshots, answeredMessages\), 600\)/);
});
