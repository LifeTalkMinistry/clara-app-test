import assert from "node:assert/strict";
import { chromium, devices } from "playwright";

const baseUrl = process.env.CLARA_VISUAL_BASE_URL || "http://127.0.0.1:4173";
const harnessPath = "/tests/visual/clara-add-income-header-only-regression.html";

const requiredViewports = [
  { label: "width-1280", width: 1280, height: 800 },
  { label: "width-1024", width: 1024, height: 800 },
  { label: "width-768", width: 768, height: 800 },
  { label: "width-600", width: 600, height: 844 },
  { label: "width-500", width: 500, height: 844 },
  { label: "width-480", width: 480, height: 844 },
  { label: "width-431", width: 431, height: 844 },
  { label: "width-430", width: 430, height: 844 },
  { label: "width-414", width: 414, height: 844 },
  { label: "width-390", width: 390, height: 844 },
  { label: "width-375", width: 375, height: 812 },
  { label: "width-360", width: 360, height: 740 },
  { label: "width-320", width: 320, height: 740 },
];

const flowViewports = [
  { label: "desktop-flow", width: 1280, height: 800 },
  { label: "critical-430-flow", width: 430, height: 844 },
  { label: "mobile-390-flow", width: 390, height: 844 },
];

function installVisibleStateObserver(page) {
  return page.evaluate(() => {
    const state = {
      violations: [],
      lastSignature: "",
    };
    window.__claraAddIncomeVisibleInvariant = state;

    const layoutVisible = (element) => {
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

    const paintVisible = (element, clipRoot) => {
      if (!layoutVisible(element)) return false;
      const rect = element.getBoundingClientRect();
      const rootRect = clipRoot?.getBoundingClientRect?.() || {
        left: 0,
        top: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
      };
      const visualLeft = window.visualViewport?.offsetLeft || 0;
      const visualTop = window.visualViewport?.offsetTop || 0;
      const visualRight = visualLeft + (window.visualViewport?.width || window.innerWidth);
      const visualBottom = visualTop + (window.visualViewport?.height || window.innerHeight);
      const left = Math.max(rect.left, rootRect.left, visualLeft, 0);
      const right = Math.min(rect.right, rootRect.right, visualRight, window.innerWidth);
      const top = Math.max(rect.top, rootRect.top, visualTop, 0);
      const bottom = Math.min(rect.bottom, rootRect.bottom, visualBottom, window.innerHeight);
      if (right <= left || bottom <= top) return false;

      const xs = [
        left + 1,
        left + (right - left) * 0.25,
        left + (right - left) * 0.5,
        left + (right - left) * 0.75,
        right - 1,
      ];
      const ys = [
        top + 1,
        top + (bottom - top) * 0.25,
        top + (bottom - top) * 0.5,
        top + (bottom - top) * 0.75,
        bottom - 1,
      ];

      return xs.some((x) => ys.some((y) => {
        const hit = document.elementFromPoint(x, y);
        return Boolean(hit && (hit === element || element.contains(hit)));
      }));
    };

    const inspect = () => {
      const root = document.querySelector('[data-clara-add-income-chat="true"]');
      if (!layoutVisible(root)) return;

      const loader = root.querySelector('[data-clara-income-opening="true"]');
      const stack = root.querySelector('[data-clara-ai-message-stack="true"]');
      const actionRegion = root.querySelector('[data-clara-conversation-action-region="true"]');
      const errors = Array.from(
        root.querySelectorAll('[role="alert"], [data-clara-conversation-error="true"]')
      );
      const messageNodes = stack
        ? Array.from(stack.children).filter((child) => child !== actionRegion)
        : [];
      const actionNodes = actionRegion ? Array.from(actionRegion.children) : [];

      const loaderVisible = paintVisible(loader, root);
      const messageVisible = messageNodes.some((child) => paintVisible(child, root));
      const actionVisible = actionNodes.some((child) => paintVisible(child, root));
      const errorVisible = errors.some((child) => paintVisible(child, root));

      const signature = JSON.stringify({ loaderVisible, messageVisible, actionVisible, errorVisible });
      if (signature === state.lastSignature) return;
      state.lastSignature = signature;

      if (!loaderVisible && !messageVisible && !actionVisible && !errorVisible) {
        const viewport = root.querySelector('[data-clara-ai-message-viewport="true"]');
        state.violations.push({
          at: performance.now(),
          html: root.innerHTML.slice(0, 2200),
          rootHeight: root.getBoundingClientRect().height,
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
  assert.deepEqual(violations, [], `${label}: Add Income must never expose a header-only painted state`);
}

async function inspectConversationGeometry(page, label) {
  return page.evaluate((label) => {
    const setup = document.querySelector('[data-clara-financial-context-setup="true"]');
    const root = document.querySelector('[data-clara-add-income-chat="true"]');
    const viewport = root?.querySelector('[data-clara-ai-message-viewport="true"]');
    const assistant = root?.querySelector('[data-clara-conversation-role="assistant"]');
    const actionRegion = root?.querySelector('[data-clara-conversation-action-region="true"]');
    const firstAction = actionRegion
      ? Array.from(actionRegion.children).find((child) => child.getBoundingClientRect().height > 0)
      : null;

    const shape = (node) => {
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
        position: style.position,
        display: style.display,
        visibility: style.visibility,
        opacity: Number.parseFloat(style.opacity || "1"),
        overflow: style.overflow,
        overflowY: style.overflowY,
        contain: style.contain,
        borderRadius: style.borderRadius,
      };
    };

    const paintVisible = (element, clipRoot) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (
        rect.width <= 0 ||
        rect.height <= 0 ||
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number.parseFloat(style.opacity || "1") <= 0
      ) return false;

      const rootRect = clipRoot?.getBoundingClientRect?.() || {
        left: 0,
        top: 0,
        right: innerWidth,
        bottom: innerHeight,
      };
      const visualLeft = window.visualViewport?.offsetLeft || 0;
      const visualTop = window.visualViewport?.offsetTop || 0;
      const visualRight = visualLeft + (window.visualViewport?.width || innerWidth);
      const visualBottom = visualTop + (window.visualViewport?.height || innerHeight);
      const left = Math.max(rect.left, rootRect.left, visualLeft, 0);
      const right = Math.min(rect.right, rootRect.right, visualRight, innerWidth);
      const top = Math.max(rect.top, rootRect.top, visualTop, 0);
      const bottom = Math.min(rect.bottom, rootRect.bottom, visualBottom, innerHeight);
      if (right <= left || bottom <= top) return false;

      const xs = [left + 1, (left + right) / 2, right - 1];
      const ys = [top + 1, (top + bottom) / 2, bottom - 1];
      return xs.some((x) => ys.some((y) => {
        const hit = document.elementFromPoint(x, y);
        return Boolean(hit && (hit === element || element.contains(hit)));
      }));
    };

    return {
      label,
      env: {
        width: innerWidth,
        height: innerHeight,
        dpr: devicePixelRatio,
        ua: navigator.userAgent,
        maxTouchPoints: navigator.maxTouchPoints,
        visualViewportHeight: window.visualViewport?.height || innerHeight,
        max430: matchMedia('(max-width: 430px)').matches,
      },
      setup: shape(setup),
      root: shape(root),
      viewport: shape(viewport),
      assistant: {
        ...shape(assistant),
        paintVisible: paintVisible(assistant, root),
      },
      action: {
        ...shape(firstAction),
        paintVisible: paintVisible(firstAction, root),
      },
    };
  }, label);
}

function assertConversationGeometry(result) {
  const { label, env, setup, root, viewport, assistant } = result;
  assert.ok(setup, `${label}: Financial Context SetupFrame must exist`);
  assert.ok(root, `${label}: Add Income root must exist`);
  assert.ok(viewport, `${label}: conversation viewport must exist`);
  assert.ok(assistant, `${label}: assistant content must exist`);

  const usableViewportHeight = env.visualViewportHeight || env.height;
  assert.ok(
    root.height >= usableViewportHeight - 2,
    `${label}: Add Income root must occupy the usable viewport (${root.height} vs ${usableViewportHeight})`
  );
  assert.ok(
    viewport.height >= Math.max(180, usableViewportHeight * 0.4),
    `${label}: conversation viewport collapsed to ${viewport.height}px`
  );
  assert.equal(
    assistant.paintVisible,
    true,
    `${label}: assistant content must be paint-visible, not merely present in the DOM`
  );
  assert.equal(
    String(setup.contain || "none").includes("paint"),
    false,
    `${label}: Financial Context SetupFrame must not acquire billboard contain: paint`
  );
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

async function waitForAssistant(root) {
  await root.locator('[data-clara-conversation-role="assistant"]').first().waitFor({
    state: "visible",
    timeout: 10000,
  });
}

async function resumeAndAssert(page, label) {
  await resetViolations(page);
  const resume = page.getByRole("button", { name: /Resume setup/i });
  await resume.waitFor({ state: "visible", timeout: 5000 });
  await resume.click();

  const root = page.locator('[data-clara-add-income-chat="true"]');
  await root.waitFor({ state: "visible", timeout: 5000 });
  await waitForAssistant(root);
  await assertNoHeaderOnlyState(page, label);
  const geometry = await inspectConversationGeometry(page, label);
  assertConversationGeometry(geometry);
  return root;
}

async function verifyFreshIncomeQuestionFlow(page, label) {
  const root = page.locator('[data-clara-add-income-chat="true"]');
  await page.locator('[data-clara-income-source-first-choice="true"]').waitFor({
    state: "visible",
    timeout: 22000,
  });
  await page.getByRole("button", { name: "Salary", exact: true }).click();

  const nameInput = page.getByPlaceholder("Income source name");
  await nameInput.waitFor({ state: "visible", timeout: 10000 });
  await nameInput.fill("Primary Salary");
  await nameInput.press("Enter");

  await page.getByRole("button", { name: "Stable", exact: true }).waitFor({ state: "visible", timeout: 10000 });
  await page.getByRole("button", { name: "Stable", exact: true }).click();

  const minimumInput = page.getByPlaceholder("Lowest reliable amount");
  await minimumInput.waitFor({ state: "visible", timeout: 10000 });
  await minimumInput.fill("15000");
  await minimumInput.press("Enter");

  await page.getByRole("button", { name: "Every week", exact: true }).waitFor({ state: "visible", timeout: 10000 });
  await page.getByRole("button", { name: "Every week", exact: true }).click();
  await page.getByRole("button", { name: "Friday", exact: true }).waitFor({ state: "visible", timeout: 10000 });
  await page.getByRole("button", { name: "Friday", exact: true }).click();

  await page.locator('[data-clara-income-source-created-choice="true"]').waitFor({
    state: "visible",
    timeout: 12000,
  });
  await assertNoHeaderOnlyState(page, `${label} completed source questions`);
  const geometry = await inspectConversationGeometry(page, `${label} completed source questions`);
  assertConversationGeometry(geometry);
  assert.equal(
    geometry.action.paintVisible,
    true,
    `${label}: final source-created controls must be paint-visible`
  );
  assert.ok(
    await root.getByRole("button", { name: "Done", exact: true }).isVisible(),
    `${label}: Done control must remain visible after typing and question progression`
  );
}

async function verifyBillboardOwnership(page, width) {
  await page.goto(`${baseUrl}${harnessPath}?mode=billboard`, {
    waitUntil: "domcontentloaded",
    timeout: 15000,
  });
  const result = await page.evaluate(() => {
    const hub = document.querySelector('[data-clara-learning-hub-section="true"]');
    const image = hub?.querySelector("img");
    const hubStyle = hub ? getComputedStyle(hub) : null;
    const imageStyle = image ? getComputedStyle(image) : null;
    return {
      width: innerWidth,
      hub: hub ? {
        contain: hubStyle.contain,
        overflow: hubStyle.overflow,
        borderRadius: hubStyle.borderRadius,
        width: hub.getBoundingClientRect().width,
      } : null,
      image: image ? {
        borderRadius: imageStyle.borderRadius,
        width: image.getBoundingClientRect().width,
        height: image.getBoundingClientRect().height,
      } : null,
    };
  });

  assert.ok(result.hub, `billboard ${width}: Learning Hub marker must exist`);
  if (width <= 430) {
    assert.equal(result.hub.contain.includes("paint"), true, `billboard ${width}: mobile Learning Hub must retain paint containment`);
    assert.equal(result.hub.overflow, "hidden", `billboard ${width}: mobile Learning Hub must retain rounded clipping`);
    assert.equal(
      result.hub.borderRadius,
      width <= 374 ? "22px" : "24px",
      `billboard ${width}: expected mobile billboard radius must remain intact`
    );
    assert.equal(
      result.image.borderRadius,
      width <= 374 ? "22px" : "24px",
      `billboard ${width}: media radius must follow billboard radius`
    );
  } else {
    assert.equal(result.hub.contain.includes("paint"), false, `billboard ${width}: mobile clipping rule must not leak to desktop widths`);
  }
  console.log(`BILLBOARD ${JSON.stringify(result)}`);
}

const browser = await chromium.launch({ headless: true });

try {
  // Required width matrix against production-equivalent Layout -> Community gate -> SetupFrame -> Add Income ancestry.
  for (const viewport of requiredViewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error?.stack || error)));
    const root = await openSetup(page);
    await waitForAssistant(root);
    await assertNoHeaderOnlyState(page, `${viewport.label} initial`);
    const geometry = await inspectConversationGeometry(page, viewport.label);
    console.log(`GEOMETRY ${JSON.stringify(geometry)}`);
    assertConversationGeometry(geometry);
    assert.deepEqual(errors, [], `${viewport.label}: browser errors must stay empty`);
    await page.close();
  }

  // Representative desktop/mobile flows: five close/reopen cycles plus typed source creation.
  for (const viewport of flowViewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error?.stack || error)));

    let root = await openSetup(page);
    await waitForAssistant(root);
    await assertNoHeaderOnlyState(page, `${viewport.label} initial`);

    await root.getByRole("button", { name: "Close Add Income" }).click();
    for (let cycle = 1; cycle <= 5; cycle += 1) {
      root = await resumeAndAssert(page, `${viewport.label} close-resume ${cycle}`);
      if (cycle < 5) {
        await root.getByRole("button", { name: "Close Add Income" }).click();
      }
    }

    await verifyFreshIncomeQuestionFlow(page, viewport.label);
    assert.deepEqual(errors, [], `${viewport.label}: browser errors must stay empty`);
    await page.close();
  }

  // Existing-income user remains visible and can advance setup after close/reopen.
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const root = await openSetup(page, "?seed=existing");
    await root.locator('[data-clara-income-home="true"]').waitFor({ state: "visible", timeout: 10000 });
    await assertNoHeaderOnlyState(page, "existing-source home");
    const initialGeometry = await inspectConversationGeometry(page, "existing-source home");
    assertConversationGeometry(initialGeometry);
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

  // Environment isolation A: mobile width with desktop UA, no touch, DPR 1.
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: false,
      hasTouch: false,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const root = await openSetup(page);
    await waitForAssistant(root);
    const geometry = await inspectConversationGeometry(page, "case-A-390-desktop-UA-no-touch-DPR1");
    assertConversationGeometry(geometry);
    console.log(`ENVIRONMENT ${JSON.stringify(geometry)}`);
    await context.close();
  }

  // Environment isolation B: desktop width with mobile UA, touch, DPR 3.
  {
    const iphone = devices["iPhone 12 Pro"];
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: iphone.userAgent,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
    });
    const page = await context.newPage();
    const root = await openSetup(page);
    await waitForAssistant(root);
    const geometry = await inspectConversationGeometry(page, "case-B-1280-mobile-UA-touch-DPR3");
    assertConversationGeometry(geometry);
    console.log(`ENVIRONMENT ${JSON.stringify(geometry)}`);
    await context.close();
  }

  // Preserve the production freshness regression under real iPhone emulation.
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

    const root = await openSetup(page, "?seed=existing&pwa=1");
    await root.locator('[data-clara-income-home="true"]').waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(1600);

    assert.equal(page.url().includes("__clara_fresh="), false, "iPhone freshness path must not reload active Add Income");
    assert.equal(freshnessNavigations, 0, "iPhone freshness path must not navigate while Add Income is active");
    await assertNoHeaderOnlyState(page, "iPhone production-freshness active conversation");
    assertConversationGeometry(await inspectConversationGeometry(page, "iPhone production-freshness active conversation"));

    await root.getByRole("button", { name: "Close Add Income" }).click();
    await page.waitForFunction(
      (build) => {
        const url = new URL(window.location.href);
        return url.searchParams.get("__clara_build") === build && url.searchParams.has("__clara_fresh");
      },
      forcedBuild,
      { timeout: 8000 }
    );
    assert.ok(freshnessNavigations >= 1, "deferred freshness should occur only after Add Income closes");
    assert.deepEqual(errors, [], "iPhone production-freshness path: browser errors must stay empty");
    await context.close();
  }

  // Standalone Add Income remains unchanged on desktop.
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    let root = await openSetup(page, "?mode=standalone");
    await waitForAssistant(root);
    await assertNoHeaderOnlyState(page, "standalone Add Income initial");
    await root.getByRole("button", { name: "Close Add Income" }).click();
    await page.getByRole("button", { name: "Reopen Add Income" }).click();
    root = page.locator('[data-clara-add-income-chat="true"]');
    await waitForAssistant(root);
    await assertNoHeaderOnlyState(page, "standalone Add Income reopen");
    await page.close();
  }

  // The same semantic owner still receives the intended rounded mobile billboard clipping.
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 431, height: 844 },
    { width: 430, height: 844 },
    { width: 390, height: 844 },
    { width: 320, height: 740 },
  ]) {
    const page = await browser.newPage({ viewport });
    await verifyBillboardOwnership(page, viewport.width);
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(
  "Verified Add Income fullscreen containment, paint visibility, production ancestry, required width matrix, 431/430 boundary, 5x close/reopen, typed source flow, existing-income flow, UA/touch/DPR isolation, PWA freshness safety, standalone desktop behavior, and semantic Learning Hub billboard clipping."
);
