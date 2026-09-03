import assert from "node:assert/strict";
import { chromium, devices } from "playwright";

const baseUrl = process.env.CLARA_VISUAL_BASE_URL || "http://127.0.0.1:4173";
const harnessPath = "/tests/visual/clara-add-income-header-only-regression.html";

const setupViewports = [
  { label: "desktop", width: 1280, height: 800 },
  { label: "mobile-360", width: 360, height: 740 },
  { label: "mobile-390", width: 390, height: 844 },
  { label: "mobile-430", width: 430, height: 932 },
];

function installVisibleStateObserver(page) {
  return page.evaluate(() => {
    const state = {
      violations: [],
      lastSignature: "",
    };
    window.__claraAddIncomeVisibleInvariant = state;

    const isVisible = (element) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number.parseFloat(style.opacity || "1") > 0
      );
    };

    const inspect = () => {
      const root = document.querySelector('[data-clara-add-income-chat="true"]');
      if (!isVisible(root)) return;

      const loaderVisible = isVisible(root.querySelector('[data-clara-income-opening="true"]'));
      const stack = root.querySelector('[data-clara-ai-message-stack="true"]');
      const messageVisible = stack
        ? Array.from(stack.children).some((child) => isVisible(child))
        : false;
      const actionRegion = root.querySelector('[data-clara-conversation-action-region="true"]');
      const actionVisible = actionRegion
        ? Array.from(actionRegion.children).some((child) => isVisible(child))
        : false;
      const errorVisible = Array.from(
        root.querySelectorAll('[role="alert"], [data-clara-conversation-error="true"]')
      ).some((child) => isVisible(child));

      const signature = JSON.stringify({ loaderVisible, messageVisible, actionVisible, errorVisible });
      if (signature === state.lastSignature) return;
      state.lastSignature = signature;

      if (!loaderVisible && !messageVisible && !actionVisible && !errorVisible) {
        const viewport = root.querySelector('[data-clara-ai-message-viewport="true"]');
        state.violations.push({
          at: performance.now(),
          html: root.innerHTML.slice(0, 2200),
          viewportHeight: viewport?.getBoundingClientRect().height || 0,
          stackChildren: stack?.children.length || 0,
          actionChildren: actionRegion?.children.length || 0,
        });
      }
    };

    const observer = new MutationObserver(inspect);
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    window.__claraAddIncomeVisibleInvariantObserver = observer;
    inspect();
  });
}

async function resetViolations(page) {
  await page.evaluate(() => {
    if (window.__claraAddIncomeVisibleInvariant) {
      window.__claraAddIncomeVisibleInvariant.violations = [];
      window.__claraAddIncomeVisibleInvariant.lastSignature = "";
    }
  });
}

async function assertNoHeaderOnlyState(page, label) {
  await page.waitForTimeout(80);
  const violations = await page.evaluate(
    () => window.__claraAddIncomeVisibleInvariant?.violations || []
  );
  assert.deepEqual(violations, [], `${label}: Add Income must never expose a header-only visible state`);
}

async function assertConversationGeometry(root, label) {
  const geometry = await root.evaluate((element) => {
    const viewport = element.querySelector('[data-clara-ai-message-viewport="true"]');
    const stack = element.querySelector('[data-clara-ai-message-stack="true"]');
    const shape = (node) => {
      if (!node) return null;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return {
        display: style.display,
        visibility: style.visibility,
        opacity: Number.parseFloat(style.opacity || "1"),
        height: rect.height,
        width: rect.width,
      };
    };
    return { viewport: shape(viewport), stack: shape(stack) };
  });

  for (const [name, value] of Object.entries(geometry)) {
    assert.ok(value, `${label}: ${name} must exist`);
    assert.notEqual(value.display, "none", `${label}: ${name} must be displayed`);
    assert.notEqual(value.visibility, "hidden", `${label}: ${name} must be visible`);
    assert.ok(value.opacity > 0, `${label}: ${name} must have visible opacity`);
    assert.ok(value.height > 0, `${label}: ${name} must have non-zero height`);
    assert.ok(value.width > 0, `${label}: ${name} must have non-zero width`);
  }
}

async function openSetup(page, query = "") {
  await page.goto(`${baseUrl}${harnessPath}${query}`, {
    waitUntil: "domcontentloaded",
    timeout: 15000,
  });
  const root = page.locator('[data-clara-add-income-chat="true"]');
  await root.waitFor({ state: "visible", timeout: 10000 });
  await page.getByText("Add Income", { exact: true }).waitFor({ state: "visible", timeout: 5000 });
  await installVisibleStateObserver(page);
  return root;
}

async function resumeAndAssert(page, label) {
  await resetViolations(page);
  const resume = page.getByRole("button", { name: /Resume setup/i });
  await resume.waitFor({ state: "visible", timeout: 5000 });
  await resume.click();

  const root = page.locator('[data-clara-add-income-chat="true"]');
  await root.waitFor({ state: "visible", timeout: 5000 });
  await root.locator('[data-clara-conversation-role="assistant"]').first().waitFor({
    state: "visible",
    timeout: 8000,
  });
  await assertNoHeaderOnlyState(page, label);
  await assertConversationGeometry(root, label);
  return root;
}

const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of setupViewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error?.stack || error)));

    let root = await openSetup(page);
    await assertNoHeaderOnlyState(page, `${viewport.label} initial`);

    await root.getByRole("button", { name: "Close Add Income" }).click();
    for (let cycle = 1; cycle <= 5; cycle += 1) {
      root = await resumeAndAssert(page, `${viewport.label} close-resume ${cycle}`);
      if (cycle < 5) {
        await root.getByRole("button", { name: "Close Add Income" }).click();
      }
    }

    await page.locator('[data-clara-income-source-first-choice="true"]').waitFor({
      state: "visible",
      timeout: 22000,
    });
    await page.getByRole("button", { name: "Salary", exact: true }).click();
    await page.locator('[data-clara-income-source-custom-name="true"]').waitFor({
      state: "visible",
      timeout: 8000,
    });
    await assertNoHeaderOnlyState(page, `${viewport.label} fresh source interaction`);
    assert.deepEqual(errors, [], `${viewport.label}: browser errors must stay empty`);
    await page.close();
  }

  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const root = await openSetup(page, "?seed=existing");
    await root.locator('[data-clara-income-home="true"]').waitFor({ state: "visible", timeout: 10000 });
    await assertNoHeaderOnlyState(page, "existing-source home");
    await root.getByRole("button", { name: "Close Add Income" }).click();
    const resumed = await resumeAndAssert(page, "existing-source resume");
    await resumed.locator('[data-clara-income-home="true"]').waitFor({ state: "visible", timeout: 10000 });
    await resumed.getByRole("button", { name: "Done", exact: true }).click();
    await page.waitForFunction(
      () => window.__claraAddIncomeRegression?.setupState?.currentStep === "wallet",
      null,
      { timeout: 8000 }
    );
    assert.equal(
      await page.evaluate(() => window.__claraAddIncomeRegression?.setupState?.currentStep),
      "wallet",
      "setup must advance from Income Hub to Wallet"
    );
    await page.close();
  }

  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const root = await openSetup(page);
    await root.locator('[data-clara-conversation-role="assistant"]').first().waitFor({
      state: "visible",
      timeout: 8000,
    });
    await root.getByRole("button", { name: "Close Add Income" }).click();
    await resumeAndAssert(page, "close-during-typing resume");
    await page.close();
  }

  // Reproduce the production freshness path instead of merely enabling the PWA
  // runtime. The old regression got a 404 for build-info.json on the Vite dev
  // server, so forceLatestDocument() never ran. Here we return a newer build id
  // while Add Income is visibly active under real iPhone emulation.
  {
    const forcedBuild = "forced-mobile-regression-build";
    const context = await browser.newContext({ ...devices["iPhone 12 Pro"] });
    await context.route("**/build-info.json?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Cache-Control": "no-store" },
        body: JSON.stringify({ commit: forcedBuild, builtAt: new Date().toISOString() }),
      });
    });

    const page = await context.newPage();
    const errors = [];
    let freshnessNavigations = 0;
    page.on("pageerror", (error) => errors.push(String(error?.stack || error)));
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame() && frame.url().includes("__clara_fresh=")) {
        freshnessNavigations += 1;
      }
    });

    let root = await openSetup(page, "?seed=existing&pwa=1");
    await root.locator('[data-clara-income-home="true"]').waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(1600);

    assert.equal(
      page.url().includes("__clara_fresh="),
      false,
      "iPhone production-freshness path: Add Income must not be document-reloaded while active"
    );
    assert.equal(
      freshnessNavigations,
      0,
      "iPhone production-freshness path: no forced document navigation may occur while Add Income is active"
    );
    await assertNoHeaderOnlyState(page, "iPhone production-freshness active conversation");
    await assertConversationGeometry(root, "iPhone production-freshness active conversation");

    // Once the conversation closes, the deferred freshness request may safely
    // refresh the document. This protects user interaction without disabling the
    // release freshness mechanism.
    await root.getByRole("button", { name: "Close Add Income" }).click();
    await page.waitForFunction(
      (build) => {
        const url = new URL(window.location.href);
        return url.searchParams.get("__clara_build") === build && url.searchParams.has("__clara_fresh");
      },
      forcedBuild,
      { timeout: 8000 }
    );
    assert.ok(
      freshnessNavigations >= 1,
      "iPhone production-freshness path: deferred refresh should occur after Add Income closes"
    );
    assert.deepEqual(errors, [], "iPhone production-freshness path: browser errors must stay empty");
    await context.close();
  }

  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    let root = await openSetup(page, "?mode=standalone");
    await root.locator('[data-clara-conversation-role="assistant"]').first().waitFor({
      state: "visible",
      timeout: 8000,
    });
    await assertNoHeaderOnlyState(page, "standalone Add Income initial");
    await root.getByRole("button", { name: "Close Add Income" }).click();
    await page.getByRole("button", { name: "Reopen Add Income" }).click();
    root = page.locator('[data-clara-add-income-chat="true"]');
    await root.locator('[data-clara-conversation-role="assistant"]').first().waitFor({
      state: "visible",
      timeout: 8000,
    });
    await assertNoHeaderOnlyState(page, "standalone Add Income reopen");
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(
  "Verified Add Income never becomes header-only across fresh setup, 5x close/resume, typing interruption, existing source, setup progression, viewport-only mobile, real iPhone production freshness navigation, desktop, and standalone usage."
);
