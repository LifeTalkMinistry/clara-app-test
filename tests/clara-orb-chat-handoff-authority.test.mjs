import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const assistantDir = new URL(
  "../src/components/fresh/main-dashboard/assistant/",
  import.meta.url
);

const runtimeUrl = new URL(
  "../src/runtime/installClaraOrbChatHandoff.js",
  import.meta.url
);

const overlayCases = [
  ["ClaraLogExpenseOverlayV2.jsx", /data-clara-pause-overlay="true"/],
  ["ClaraAddIncomeOverlayV2.jsx", /data-clara-pause-overlay="true"/],
  ["ClaraWalletOverlayV2.jsx", /data-clara-pause-overlay="true"/],
  ["ClaraCalendarOverlay.jsx", /data-clara-pause-overlay="true"/],
  ["ClaraMoneyScheduleOverlay.jsx", /data-clara-pause-overlay="true"/],
  ["ClaraEmergencyFundOverlay.jsx", /data-clara-pause-overlay="true"/],
  ["ClaraSavingsGoalOverlay.jsx", /data-clara-pause-overlay="true"/],
  ["ClaraDebtObligationOverlay.jsx", /data-clara-pause-overlay="true"/],
  ["ClaraWeeklyMoneyCheckOverlayV2.jsx", /data-clara-weekly-cross-check-chat="true"/],
];

async function readAssistantFile(filename) {
  return readFile(new URL(filename, assistantDir), "utf8");
}

test("all nine ORB finance chats satisfy the universal handoff discovery contract", async () => {
  for (const [filename, rootMarker] of overlayCases) {
    const source = await readAssistantFile(filename);
    assert.match(source, /<ClaraChatHeader\b/, `${filename} must expose the shared chat header`);
    assert.match(source, rootMarker, `${filename} must expose a discoverable chat root`);
  }
});

test("shared CLARA header exposes semantic animation targets", async () => {
  const source = await readAssistantFile("ClaraChatHeader.jsx");
  assert.match(source, /data-clara-chat-header="true"/);
  assert.match(source, /data-clara-chat-close="true"/);
});

test("ORB chat handoff is semantic and no longer requires Buy Check ownership", async () => {
  const runtime = await readFile(runtimeUrl, "utf8");

  assert.match(runtime, /OVERLAY_CANDIDATE_SELECTOR/);
  assert.match(runtime, /data-clara-pause-overlay/);
  assert.match(runtime, /data-clara-weekly-cross-check-chat/);
  assert.match(runtime, /data-clara-chat-header/);
  assert.match(runtime, /data-clara-chat-close/);
  assert.match(runtime, /resolveChatOverlay/);
  assert.match(runtime, /resolveChatRegions/);
  assert.doesNotMatch(
    runtime,
    /\[data-clara-pause-overlay=\\?"true\\?"\]\[data-clara-buy-check-react-owner=\\?"true\\?"\]/
  );
});

test("radial command selection joins the same copy-first Orb launch lead", async () => {
  const runtime = await readFile(runtimeUrl, "utf8");

  assert.match(runtime, /CLARA_ORB_COMMAND_SELECT_EVENT/);
  assert.match(runtime, /handleCommandSelectLead/);
  assert.match(runtime, /beginHomeLead\(\)/);
  assert.match(runtime, /COPY_EXIT_LEAD_MS = 72/);
  assert.match(runtime, /delayOrbLaunchMotion/);
  assert.match(runtime, /hideOrbHomeCopyImmediately/);
});

test("canonical Ask Before You Spend timing and reduced-motion safeguards remain", async () => {
  const runtime = await readFile(runtimeUrl, "utf8");

  for (const token of [
    "duration: 260",
    "duration: 320",
    "delay: 35",
    "duration: 220",
    "delay: 95",
    "duration: 250",
    "delay: 125",
    "delay: 155",
    "delay: 175",
    "duration: 280",
    "delay: 190",
    "duration: 210",
    "delay: 115",
  ]) {
    assert.ok(runtime.includes(token), `handoff must preserve ${token}`);
  }

  assert.match(runtime, /prefers-reduced-motion: reduce/);
  assert.match(runtime, /transform, opacity/);
  assert.doesNotMatch(runtime, /style\.width\s*=|style\.height\s*=/);
});

test("animation authority stays feature-agnostic", async () => {
  const runtime = await readFile(runtimeUrl, "utf8");

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
    assert.ok(!runtime.includes(`"${commandId}"`), `${commandId} must not gain custom animation routing`);
  }
});
