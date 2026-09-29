import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.CLARA_VISUAL_BASE_URL || "http://127.0.0.1:4173";
const harnessPath = "/tests/visual/clara-financial-context-income.html";
const artifactDir = path.resolve("artifacts/add-income-diagnostic");
fs.mkdirSync(artifactDir, { recursive: true });

async function traceAfter(page, start) {
  return page.evaluate((startEvent) => {
    const events = (window.__claraAddIncomeDiagnostic?.events || []).filter((entry) => entry.n > startEvent);
    return {
      events,
      domEvents: events.filter((entry) => entry.type === "dom-snapshot"),
      timerEvents: events.filter((entry) => {
        const stack = String(entry.stack || "");
        return stack.includes("ClaraAddIncomeOverlayV2") || entry.type.startsWith("timeout-");
      }),
    };
  }, start);
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${baseUrl}${harnessPath}?strict=0&ai=0`, {
    waitUntil: "domcontentloaded",
    timeout: 15000,
  });

  const initialRoot = page.locator('[data-clara-add-income-chat="true"]');
  await initialRoot.waitFor({ state: "visible", timeout: 10000 });
  await page.getByText("Add Income", { exact: true }).waitFor({ state: "visible", timeout: 5000 });
  await page.getByRole("button", { name: "Close Add Income" }).click();
  await page.getByRole("button", { name: /Resume setup/i }).waitFor({ state: "visible", timeout: 5000 });

  const start = await page.evaluate(() => window.__claraAddIncomeDiagnostic?.counter || 0);
  await page.getByRole("button", { name: /Resume setup/i }).click();
  const root = page.locator('[data-clara-add-income-chat="true"]');
  await root.waitFor({ state: "visible", timeout: 5000 });
  await root.locator('[data-clara-conversation-role="assistant"]').first().waitFor({ state: "visible", timeout: 8000 });
  await page.waitForTimeout(250);

  const trace = await traceAfter(page, start);
  fs.writeFileSync(path.join(artifactDir, "desktop-one-cycle-trace.json"), JSON.stringify(trace, null, 2));
  console.log(`ADD_INCOME_ONE_CYCLE_TRACE\n${JSON.stringify(trace, null, 2)}`);

  const headerOnly = trace.domEvents.find((entry) => (
    entry.rootPresent === true &&
    entry.openingPresent === false &&
    Number(entry.stackChildren || 0) === 0 &&
    Number(entry.assistantRows || 0) === 0
  ));

  const scheduledReply = trace.timerEvents.find((entry) => (
    entry.type === "timeout-scheduled" && String(entry.stack || "").includes("queueNextAssistantMessage")
  ));
  const firedReply = scheduledReply
    ? trace.timerEvents.find((entry) => entry.type === "timeout-fired" && entry.id === scheduledReply.id)
    : null;
  const clearedReply = scheduledReply
    ? trace.timerEvents.find((entry) => entry.type === "timeout-cleared" && entry.id === scheduledReply.id)
    : null;

  console.log(`ADD_INCOME_ORDERING_SUMMARY\n${JSON.stringify({ headerOnly, scheduledReply, firedReply, clearedReply }, null, 2)}`);
  assert.ok(trace.domEvents.length > 0, "diagnostic must capture DOM lifecycle events");
} finally {
  await browser.close();
}
