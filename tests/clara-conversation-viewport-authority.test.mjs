import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

const assistantRoot = "src/components/fresh/main-dashboard/assistant";
const semanticOwners = [
  "ClaraAddIncomeOverlayV2.jsx",
  "ClaraLogExpenseOverlayV2.jsx",
  "ClaraDebtObligationOverlay.jsx",
  "ClaraWeeklyMoneyCheckOverlayV2.jsx",
  "ClaraMoneyScheduleOverlay.jsx",
  "ClaraWalletOverlayV2.jsx",
  "ClaraCalendarOverlay.jsx",
  "ClaraEmergencyFundOverlay.jsx",
  "ClaraSavingsGoalOverlay.jsx",
  "ClaraAiEnvironmentOverlayV2.jsx",
];

const bottomChasePatterns = [
  /scrollToLatest\s*=/,
  /scrollTop\s*=\s*[^;\n]*scrollHeight/,
  /scrollTop\s*\+=/,
  /scrollTo\??\.\(\s*\{[\s\S]{0,160}?top\s*:\s*[^,}\n]*scrollHeight/,
];

test("CLARA financial conversations use the semantic reveal authority instead of bottom chasing", async () => {
  for (const file of semanticOwners) {
    const text = await source(`${assistantRoot}/${file}`);
    assert.match(
      text,
      /useClaraConversationReveal/,
      `${file} must use the shared semantic conversation reveal authority`,
    );
    for (const pattern of bottomChasePatterns) {
      assert.doesNotMatch(text, pattern, `${file} must not own transcript position with ${pattern}`);
    }
  }
});

test("the shared reveal primitive is semantic, one-key, geometry based, and mutation independent", async () => {
  const text = await source(`${assistantRoot}/useClaraConversationReveal.js`);

  assert.match(text, /lastRevealedKeyRef/);
  assert.match(text, /revealKey/);
  assert.match(text, /getBoundingClientRect/);
  assert.match(text, /regionHeight\s*<=\s*viewportHeight/);
  assert.match(text, /assistantRect\.top\s*-\s*viewportRect\.top/);
  assert.match(text, /viewport\.scrollTo\(\{\s*top:\s*targetTop,\s*behavior\s*\}\)/);
  assert.match(text, /assistantRefMode\s*=\s*"self"/);
  assert.match(text, /actionRefMode\s*=\s*"self"/);
  assert.match(text, /latest-assistant/);
  assert.match(text, /last-child/);
  assert.doesNotMatch(text, /MutationObserver/);
  assert.doesNotMatch(text, /scrollHeight\s*-\s*viewport\.clientHeight\s*$/m);
});

test("Buy Check keyboard guard owns IME geometry only and never transcript position", async () => {
  const text = await source("src/runtime/installClaraBuyCheckKeyboardGuard.js");

  assert.match(text, /visualViewport/);
  assert.match(text, /scroll-padding-bottom/);
  assert.match(text, /KEYBOARD_THRESHOLD_PX/);
  assert.doesNotMatch(text, /MutationObserver/);
  assert.doesNotMatch(text, /scrollHeight/);
  assert.doesNotMatch(text, /scrollTop\s*(?:\+|-)?=/);
  assert.doesNotMatch(text, /scrollIntoView/);
  assert.doesNotMatch(text, /FOLLOW_LATEST/);
});

test("paced Money Schedule reveals only after its turn becomes actionable", async () => {
  const text = await source(`${assistantRoot}/ClaraMoneyScheduleOverlay.jsx`);

  assert.match(text, /controlsReady\s*=\s*interactionReady\s*&&\s*!pendingMessage/);
  assert.match(text, /assistantRefMode:\s*"latest-assistant"/);
  assert.match(text, /actionRefMode:\s*"last-child"/);
  assert.match(text, /requireAction:\s*true/);
  assert.doesNotMatch(text, /setTypedText\([^)]*\);\s*scroll/i);
  assert.doesNotMatch(text, /\[messages,\s*pendingMessage,\s*phase\][\s\S]{0,120}?scroll/i);
});

test("Ask Before You Spend settles a semantic assistant turn before revealing it", async () => {
  const text = await source(`${assistantRoot}/ClaraAiEnvironmentOverlayV2.jsx`);

  assert.match(text, /settledAssistantTurn/);
  assert.match(text, /semanticRevealKey/);
  assert.match(text, /binaryControlsRef/);
  assert.match(text, /setupPromptRef/);
  assert.match(text, /useClaraConversationReveal\(\{/);
  assert.doesNotMatch(text, /messageViewport\.scrollTo/);
  assert.doesNotMatch(text, /messageViewport\.scrollTop/);
  assert.doesNotMatch(text, /messageViewport\.scrollHeight/);
});
