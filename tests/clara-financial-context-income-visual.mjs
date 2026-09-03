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

async function diagnosticTrace(page) {
  return page.evaluate(() => {
    const events = window.__claraAddIncomeDiagnostic?.events || [];
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
  });
}

async function detectHeaderOnlyGap(page, root, label, cycle) {
  const opening = root.locator('[data-clara-income-opening="true"]');
  await opening.waitFor({ state: "visible", timeout: 2500 }).catch(() => {});

  const handle = await page.waitForFunction(
    () => {
      const chat = document.querySelector('[data-clara-add-income-chat="true"]');
      if (!chat) return false;

      const shellRect = chat.getBoundingClientRect();
      const shellStyle = getComputedStyle(chat);
      const shellVisible =
        shellRect.width > 0 &&
        shellRect.height > 0 &&
        shellStyle.display !== "none" &&
        shellStyle.visibility !== "hidden" &&
        Number.parseFloat(shellStyle.opacity || "1") > 0;
      if (!shellVisible) return false;

      const openingVisible = Boolean(chat.querySelector('[data-clara-income-opening="true"]'));
      const stack = chat.querySelector('[data-clara-ai-message-stack="true"]');
      const stackChildren = stack?.children.length || 0;
      const actionRegion = chat.querySelector('[data-clara-conversation-action-region="true"]');
      const visibleActions = actionRegion
        ? Array.from(actionRegion.children).filter((node) => {
            const rect = node.getBoundingClientRect();
            const style = getComputedStyle(node);
            return (
              rect.width > 0 &&
              rect.height > 0 &&
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              Number.parseFloat(style.opacity || "1") > 0
            );
          }).length
        : 0;

      if (!openingVisible && stackChildren === 0 && visibleActions === 0) {
        return {
          observedAt: performance.now(),
          openingVisible,
          stackChildren,
          visibleActions,
          assistantRows: chat.querySelectorAll('[data-clara-conversation-role="assistant"]').length,
          pendingRows: chat.querySelectorAll('[data-clara-conversation-role="assistant"][data-clara-conversation-pending="true"]').length,
          shellHeight: shellRect.height,
        };
      }
      return false;
    },
    null,
    { timeout: 2500, polling: 10 }
  ).catch(() => null);

  if (!handle) return null;
  const gap = await handle.jsonValue();
  const trace = await diagnosticTrace(page);
  const evidence = { label, cycle, gap, trace };
  console.log(`ADD_INCOME_HEADER_ONLY_PROVEN ${label} cycle=${cycle}\n${JSON.stringify(evidence, null, 2)}`);
  return evidence;
}

async function assertResumeCycle(page, label, cycle) {
  const resume = page.getByRole("button", { name: /Resume setup/i });
  await resume.waitFor({ state: "visible", timeout: 5000 });
  await resume.click();

  const root = page.locator('[data-clara-add-income-chat="true"]');
  await root.waitFor({ state: "visible", timeout: 5000 });
  await page.getByText("Add Income", { exact: true }).waitFor({ state: "visible", timeout: 5000 });

  const headerOnlyEvidence = await detectHeaderOnlyGap(page, root, label, cycle);

  const assistant = root.locator('[data-clara-conversation-role="assistant"]').first();
  try {
    await assistant.waitFor({ state: "visible", timeout: 3500 });
  } catch (error) {
    const trace = await diagnosticTrace(page);
    console.error(`ADD_INCOME_TRACE_FAILURE ${label} cycle=${cycle}\n${JSON.stringify(trace, null, 2)}`);
    throw error;
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

  return { root, state, headerOnlyEvidence };
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
      if (result.headerOnlyEvidence) headerOnlyEvidence.push(result.headerOnlyEvidence);
      if (cycle < 5) {
        await result.root.getByRole("button", { name: "Close Add Income" }).click();
        await page.getByRole("button", { name: /Resume setup/i }).waitFor({ state: "visible", timeout: 5000 });
      }
    }

    // This diagnostic branch intentionally proves the existing defect before any
    // production repair: at least one close/resume cycle must expose a visible
    // Add Income shell with no loader, message, or actionable control.
    assert.ok(
      headerOnlyEvidence.length > 0,
      `${scenario.label}: expected the current production Add Income lifecycle to expose its header-only gap`
    );

    await page.locator('[data-clara-income-source-first-choice="true"]').waitFor({
      state: "visible",
      timeout: 22000,
    });

    await page.screenshot({
      path: path.join(artifactDir, `${scenario.label}.png`),
      fullPage: true,
    });

    const trace = await diagnosticTrace(page);
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

console.log("Proved the current Financial Context Setup Add Income lifecycle exposes a header-only interval after close/resume; the assistant later recovers when the delayed reply timer fires.");