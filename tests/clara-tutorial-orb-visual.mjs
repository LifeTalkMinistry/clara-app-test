import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.CLARA_VISUAL_BASE_URL || "http://127.0.0.1:4173";
const harnessPath = "/tests/visual/clara-tutorial-orb.html";
const artifactDir = path.resolve("artifacts/tutorial-orb");
const preparedQuestion = "CLARA, I want to buy shoes for ₱1,800. Kaya ba?";

const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 360, height: 740 },
  { width: 375, height: 823 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
];

const within = (actual, expected, tolerance, message) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected} ± ${tolerance}, got ${actual}`
  );
};

async function getOrbGeometry(page) {
  const launcher = page.locator('[data-clara-orb-launcher="true"]');
  await launcher.waitFor({ state: "visible" });
  const launcherBox = await launcher.boundingBox();
  assert.ok(launcherBox, "ORB launcher must have measurable geometry");

  const composition = page.locator('[data-clara-orb-composition="true"]');
  const compositionBox = await composition.boundingBox();
  assert.ok(compositionBox, "ORB composition must have measurable geometry");

  return { launcherBox, compositionBox };
}

async function assertViewportContained(page, viewport) {
  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }));

  assert.equal(dimensions.innerWidth, viewport.width);
  assert.equal(dimensions.innerHeight, viewport.height);
  assert.ok(
    dimensions.scrollWidth <= dimensions.innerWidth + 1,
    `horizontal overflow at ${viewport.width}x${viewport.height}: ${dimensions.scrollWidth}px`
  );
  assert.ok(
    dimensions.scrollHeight <= dimensions.innerHeight + 1,
    `vertical overflow at ${viewport.width}x${viewport.height}: ${dimensions.scrollHeight}px`
  );
}

async function readOrbEyeHeights(page) {
  return page.evaluate(() => {
    const svg = document.querySelector(".clara-orb-vector");
    if (!svg) return [];
    return Array.from(svg.children)
      .filter((node) => node.tagName?.toLowerCase() === "rect")
      .slice(0, 4)
      .map((node) => Number.parseFloat(node.getAttribute("height") || "0"));
  });
}

async function assertOrbActuallyBlinks(page, label) {
  const initial = await readOrbEyeHeights(page);
  assert.equal(initial.length, 4, `ORB eye bars must be measurable at ${label}`);

  const minimums = [...initial];
  const maximums = [...initial];
  const deadline = Date.now() + 5500;

  while (Date.now() < deadline) {
    await page.waitForTimeout(40);
    const sample = await readOrbEyeHeights(page);
    if (sample.length !== 4) continue;

    sample.forEach((height, index) => {
      minimums[index] = Math.min(minimums[index], height);
      maximums[index] = Math.max(maximums[index], height);
    });

    const blinkObserved = maximums.some(
      (height, index) => height > 0 && maximums[index] - minimums[index] >= height * 0.45
    );
    if (blinkObserved) return;
  }

  assert.fail(
    `Canonical ORB did not visibly blink at ${label}; eye height ranges were ${maximums
      .map((height, index) => `${minimums[index].toFixed(2)}-${height.toFixed(2)}`)
      .join(", ")}`
  );
}

fs.mkdirSync(artifactDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const label = `${viewport.width}x${viewport.height}`;

    const production = await browser.newPage({ viewport });
    await production.goto(`${baseUrl}${harnessPath}?mode=production`, { waitUntil: "networkidle" });
    const productionGeometry = await getOrbGeometry(production);
    await assertViewportContained(production, viewport);
    await production.screenshot({
      path: path.join(artifactDir, `production-${label}.png`),
      fullPage: true,
    });

    const tutorial = await browser.newPage({ viewport });
    await tutorial.goto(`${baseUrl}${harnessPath}?mode=tutorial`, { waitUntil: "networkidle" });
    const tutorialGeometry = await getOrbGeometry(tutorial);
    await assertViewportContained(tutorial, viewport);

    for (const retiredCopy of [
      "CLARA ORB",
      "MEET CLARA",
      "This is the CLARA ORB.",
      "Tap the ORB above to continue",
    ]) {
      assert.equal(
        await tutorial.getByText(retiredCopy, { exact: true }).count(),
        0,
        `${retiredCopy} must not render at ${label}`
      );
    }

    await tutorial.getByText("Hi Juan!", { exact: true }).waitFor({ state: "visible" });
    await tutorial.getByText("Tap CLARA to start", { exact: true }).waitFor({ state: "visible" });
    await tutorial.getByRole("button", { name: "Back to Juan" }).waitFor({ state: "visible" });
    await tutorial.getByRole("button", { name: "Skip tutorial" }).waitFor({ state: "visible" });

    const greetingScope = await tutorial
      .locator('[data-clara-orb-user-greeting="true"]')
      .getAttribute("data-clara-orb-greeting-scope");
    assert.equal(greetingScope, "tutorial", `Juan greeting must stay tutorial-scoped at ${label}`);

    if (viewport.width === 320 && viewport.height === 568) {
      await assertOrbActuallyBlinks(tutorial, label);
    }

    const centerX = tutorialGeometry.launcherBox.x + tutorialGeometry.launcherBox.width / 2;
    within(centerX, viewport.width / 2, 1.5, `ORB horizontal center at ${label}`);

    within(
      tutorialGeometry.launcherBox.x,
      productionGeometry.launcherBox.x,
      1.5,
      `tutorial/production ORB x at ${label}`
    );
    within(
      tutorialGeometry.launcherBox.y,
      productionGeometry.launcherBox.y,
      1.5,
      `tutorial/production ORB y at ${label}`
    );
    within(
      tutorialGeometry.launcherBox.width,
      productionGeometry.launcherBox.width,
      1.5,
      `tutorial/production ORB width at ${label}`
    );
    within(
      tutorialGeometry.launcherBox.height,
      productionGeometry.launcherBox.height,
      1.5,
      `tutorial/production ORB height at ${label}`
    );

    await tutorial.screenshot({
      path: path.join(artifactDir, `tutorial-${label}.png`),
      fullPage: true,
    });

    const storageBeforeTap = await tutorial.evaluate(() => JSON.stringify(window.localStorage));
    await tutorial.locator('[data-clara-orb-launcher="true"]').click();
    await tutorial.locator('[data-clara-ai-layout-variant="guide-preview"]').waitFor({
      state: "visible",
      timeout: 5000,
    });

    const legacyHeaderCopy = tutorial.getByText("CLARA MONEY TOOLS", { exact: true });
    assert.equal(await legacyHeaderCopy.isVisible(), false, `duplicate Buy Check header must stay hidden at ${label}`);
    assert.equal(
      await tutorial.locator(".clara-tutorial-chat-skip").count(),
      0,
      `tutorial must not add a separate top Skip control over the live Buy Check shell at ${label}`
    );

    await tutorial.locator('[data-clara-pause-entry-board="true"]').waitFor({ state: "visible" });
    await tutorial.locator('[data-clara-life-profile-trigger="true"]').waitFor({ state: "visible" });
    await tutorial.locator('[data-clara-buy-check-contained-close="true"]').waitFor({ state: "visible" });
    await tutorial.getByText("Ask before you spend.", { exact: true }).waitFor({ state: "visible" });

    const usageButton = tutorial.locator('[data-clara-buy-check-usage-button="true"]');
    await usageButton.waitFor({ state: "visible" });
    assert.equal((await usageButton.textContent())?.trim(), "12", `Juan preview must show 12 replies at ${label}`);

    const impactButton = tutorial.locator('[data-clara-impact-trigger="true"]');
    await impactButton.waitFor({ state: "visible" });
    assert.equal(
      (await impactButton.locator("span").textContent())?.trim(),
      "3",
      `Juan preview must show 3 protected decisions at ${label}`
    );

    await tutorial.locator('[data-clara-tutorial-chat-instruction="true"]').waitFor({ state: "visible" });
    const composer = tutorial.locator('[data-clara-buy-check-react-form="true"]');
    await composer.waitFor({ state: "visible" });
    assert.equal(
      await composer.locator("input").inputValue(),
      preparedQuestion,
      `Juan's prepared question must be loaded into the real composer at ${label}`
    );

    const sendButton = tutorial.getByRole("button", { name: "Send Ask Before You Spend answer" });
    assert.equal(await sendButton.isEnabled(), true, `real Send button must be enabled at ${label}`);

    const storageBeforeSend = await tutorial.evaluate(() => JSON.stringify(window.localStorage));
    await sendButton.click();
    await tutorial.locator('[data-clara-buy-check-thinking-row="true"]').waitFor({
      state: "visible",
      timeout: 1500,
    });
    await tutorial.getByText(preparedQuestion, { exact: true }).waitFor({ state: "visible" });

    await tutorial.getByText(/You can pay for it, Juan, but I’d wait/).waitFor({
      state: "visible",
      timeout: 4000,
    });
    await tutorial.getByRole("button", { name: "Show me where CLARA knew that" }).waitFor({
      state: "visible",
    });

    const storageAfterSend = await tutorial.evaluate(() => JSON.stringify(window.localStorage));
    assert.equal(storageAfterSend, storageBeforeSend, `tutorial Send must not mutate localStorage at ${label}`);
    assert.equal(storageAfterSend, storageBeforeTap, `ORB tutorial must remain storage-isolated at ${label}`);

    await tutorial.screenshot({
      path: path.join(artifactDir, `simulation-${label}.png`),
      fullPage: true,
    });

    await tutorial.getByRole("button", { name: "Close CLARA Ask Before You Spend" }).click();
    await tutorial.locator('[data-clara-tutorial-orb-intro="true"]').waitFor({ state: "visible" });
    await tutorial.locator('[data-clara-orb-launcher="true"]').waitFor({ state: "visible" });
    await tutorial.getByText("Hi Juan!", { exact: true }).waitFor({ state: "visible" });

    await tutorial.getByRole("button", { name: "Skip tutorial" }).click();
    assert.equal(
      await tutorial.evaluate(() => document.documentElement.dataset.skipRequested),
      "true",
      `Skip callback must stay wired at ${label}`
    );

    await production.close();
    await tutorial.close();
  }
} finally {
  await browser.close();
}

console.log(
  `Verified Juan greeting, canonical ORB blink, production Buy Check shell, real Send/thinking/reply flow, and tutorial isolation across ${viewports.length} mobile viewports.`
);