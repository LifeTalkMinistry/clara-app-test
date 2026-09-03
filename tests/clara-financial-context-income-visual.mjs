import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.CLARA_VISUAL_BASE_URL || "http://127.0.0.1:4173";
const harnessPath = "/tests/visual/clara-financial-context-income.html";
const artifactDir = path.resolve("artifacts/add-income-diagnostic");
const scenarios = [
  { label: "desktop", viewport: { width: 1280, height: 800 }, ai: 0 },
  { label: "mobile", viewport: { width: 390, height: 844 }, ai: 0 },
  { label: "desktop-ai-class", viewport: { width: 1280, height: 800 }, ai: 1 },
  { label: "mobile-ai-class", viewport: { width: 390, height: 844 }, ai: 1 },
];

fs.mkdirSync(artifactDir, { recursive: true });

async function diagnosticTrace(page, afterEvent = 0) {
  return page.evaluate((start) => {
    const events = (window.__claraAddIncomeDiagnostic?.events || []).filter((entry) => entry.n > start);
    const timerEvents = events.filter((entry) => {
      const stack = String(entry.stack || "");
      return (
        stack.includes("ClaraAddIncomeOverlayV2") ||
        (entry.type.startsWith("timeout-") && Number(entry.delay) >= 400 && Number(entry.delay) <= 1100)
      );
    });
    const domEvents = events.filter((entry) => entry.type === "dom-snapshot");
    return {
      timerEvents,
      domEvents,
      tail: events.slice(-120),
    };
  }, afterEvent);
}

function findHeaderOnlySnapshot(trace) {
  return trace.domEvents.find((entry) => (
    entry.rootPresent === true &&
    entry.openingPresent === false &&
    Number(entry.stackChildren || 0) === 0 &&
    Number(entry.assistantRows || 0) === 0
  )) || null;
}

function findReplyTimerEvidence(trace, headerOnlySnapshot) {
  const scheduled = trace.timerEvents.find((entry) => (
    entry.type === "timeout-scheduled" &&
    String(entry.stack || "").includes("queueNextAssistantMessage")
  )) || null;
  const fired = scheduled
    ? trace.timerEvents.find((entry) => entry.type === "timeout-fired" && entry.id === scheduled.id) || null
    : null;
  const cleared = scheduled
    ? trace.timerEvents.find((entry) => entry.type === "timeout-cleared" && entry.id === scheduled.id) || null
    : null;
  return {
    scheduled,
    fired,
    cleared,
    headerOnlyBeforeReplyFired: Boolean(
      scheduled &&
      headerOnlySnapshot &&
      (!fired || Number(headerOnlySnapshot.t) < Number(fired.t))
    ),
  };
}

async function assertResumeCycle(page, label, cycle) {
  const resume = page.getByRole("button", { name: /Resume setup/i });
  await resume.waitFor({ state: "visible", timeout: 5000 });
  const startEvent = await page.evaluate(() => window.__claraAddIncomeDiagnostic?.counter || 0);
  await resume.click();

  const root = page.locator('[data-clara-add-income-chat="true"]');
  await root.waitFor({ state: "visible", timeout: 5000 });
  await page.getByText("Add Income", { exact: true }).waitFor({ state: "visible", timeout: 5000 });

  const assistant = root.locator('[data-clara-conversation-role="assistant"]').first();
  try {
    await assistant.waitFor({ state: "visible", timeout: 7000 });
  } catch (error) {
    const trace = await diagnosticTrace(page, startEvent);
    console.error(`ADD_INCOME_TRACE_FAILURE ${label} cycle=${cycle}\n${JSON.stringify(trace, null, 2)}`);
    throw error;
  }

  const trace = await diagnosticTrace(page, startEvent);
  const headerOnlySnapshot = findHeaderOnlySnapshot(trace);
  const replyTimer = findReplyTimerEvidence(trace, headerOnlySnapshot);
  const evidence = headerOnlySnapshot ? {
    label,
    cycle,
    headerOnlySnapshot,
    replyTimer,
    trace,
  } : null;

  if (evidence) {
    console.log(`ADD_INCOME_HEADER_ONLY_PROVEN ${label} cycle=${cycle}\n${JSON.stringify(evidence, null, 2)}`);
  }

  const state = await root.evaluate((element) => {
    const viewport = element.querySelector('[data-clara-ai-message-viewport="true"]');
    const stack = element.querySelector('[data-clara-ai-message-stack="true"]');
    const styleOf = (node) => {
      const style = node ? getComputedStyle(node) : null;
      return style ? {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        height: style.height,
        minHeight: style.minHeight,
        position: style.position,
        zIndex: style.zIndex,
        overflow: style.overflow,
        transform: style.transform,
        pointerEvents: style.pointerEvents,
      } : null;
    };
    return {
      stackChildren: stack?.children.length || 0,
      assistantRows: element.querySelectorAll('[data-clara-conversation-role="assistant"]').length,
      openingVisible: Boolean(element.querySelector('[data-clara-income-opening="true"]')),
      viewportRect: viewport?.getBoundingClientRect().toJSON?.() || null,
      stackRect: stack?.getBoundingClientRect().toJSON?.() || null,
      viewportStyle: styleOf(viewport),
      stackStyle: styleOf(stack),
    };
  });

  assert.ok(state.stackChildren > 0, `${label} cycle ${cycle}: message stack must not stay empty after resume`);
  assert.ok(state.assistantRows > 0, `${label} cycle ${cycle}: first assistant row must mount after resume`);
  assert.notEqual(state.viewportStyle?.display, "none", `${label} cycle ${cycle}: viewport must be displayed`);
  assert.notEqual(state.stackStyle?.display, "none", `${label} cycle ${cycle}: stack must be displayed`);
  assert.notEqual(state.viewportStyle?.visibility, "hidden", `${label} cycle ${cycle}: viewport must be visible`);
  assert.notEqual(state.stackStyle?.visibility, "hidden", `${label} cycle ${cycle}: stack must be visible`);
  assert.ok(Number.parseFloat(state.viewportStyle?.opacity || "1") > 0, `${label} cycle ${cycle}: viewport opacity must be non-zero`);
  assert.ok(Number.parseFloat(state.stackStyle?.opacity || "1") > 0, `${label} cycle ${cycle}: stack opacity must be non-zero`);
  assert.ok((state.viewportRect?.height || 0) > 0, `${label} cycle ${cycle}: viewport needs non-zero height`);
  assert.ok((state.stackRect?.height || 0) > 0, `${label} cycle ${cycle}: stack needs non-zero height`);

  return { root, state, evidence };
}

const browser = await chromium.launch({ headless: true });

try {
  for (const scenario of scenarios) {
    const page = await browser.newPage({ viewport: scenario.viewport });
    const pageErrors = [];
    const headerOnlyEvidence = [];
    page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error)));

    await page.goto(`${baseUrl}${harnessPath}?strict=0&ai=${scenario.ai}`, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    const initialRoot = page.locator('[data-clara-add-income-chat="true"]');
    await initialRoot.waitFor({ state: "visible", timeout: 10000 });
    await page.getByText("Add Income", { exact: true }).waitFor({ state: "visible", timeout: 5000 });

    // Mirror the production failure path: interrupt the Income step, land on the
    // saved-progress surface, then repeatedly resume the exact same setup step.
    await page.getByRole("button", { name: "Close Add Income" }).click();
    await page.getByRole("button", { name: /Resume setup/i }).waitFor({ state: "visible", timeout: 5000 });

    for (let cycle = 1; cycle <= 5; cycle += 1) {
      const result = await assertResumeCycle(page, scenario.label, cycle);
      if (result.evidence) headerOnlyEvidence.push(result.evidence);
      if (cycle < 5) {
        await result.root.getByRole("button", { name: "Close Add Income" }).click();
        await page.getByRole("button", { name: /Resume setup/i }).waitFor({ state: "visible", timeout: 5000 });
      }
    }

    // This diagnostic branch intentionally proves the existing defect before any
    // production repair. The inverse becomes the permanent production regression.
    assert.ok(
      headerOnlyEvidence.length > 0,
      `${scenario.label}: expected the current production Add Income lifecycle to expose its header-only gap`
    );
    assert.ok(
      headerOnlyEvidence.some((entry) => entry.replyTimer.headerOnlyBeforeReplyFired),
      `${scenario.label}: expected a header-only snapshot before the first delayed reply timer fired`
    );

    await page.locator('[data-clara-income-source-first-choice="true"]').waitFor({
      state: "visible",
      timeout: 22000,
    });

    await page.screenshot({
      path: path.join(artifactDir, `${scenario.label}.png`),
      fullPage: true,
    });

    const trace = await diagnosticTrace(page, 0);
    fs.writeFileSync(
      path.join(artifactDir, `${scenario.label}-trace.json`),
      JSON.stringify({ headerOnlyEvidence, ...trace }, null, 2),
      "utf8"
    );

    assert.deepEqual(pageErrors, [], `${scenario.label}: browser page errors must stay empty`);
    await page.close();
  }
} finally {
  await browser.close();
}

console.log("Proved the current Financial Context Setup Add Income lifecycle exposes a header-only interval after close/resume before the delayed assistant reply timer fires.");