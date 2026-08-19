import assert from "node:assert/strict";
import fs from "node:fs/promises";
import puppeteer from "puppeteer-core";

const HARNESS_URL =
  process.env.ORB_HARNESS_URL ||
  "http://127.0.0.1:4173/tests/fixtures/clara-orb-command-ring.html";
const CHROME_PATH = process.env.CHROME_PATH;
const HOLD_WAIT_MS = 650;

if (!CHROME_PATH) {
  throw new Error("CHROME_PATH is required for the Orb browser verification.");
}

await fs.mkdir("artifacts", { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

async function createHarnessPage({ width = 390, height = 844, reducedMotion = false } = {}) {
  const page = await browser.newPage();
  await page.setViewport({
    width,
    height,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });

  if (reducedMotion) {
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ]);
  }

  await page.goto(`${HARNESS_URL}?run=${Date.now()}-${Math.random()}`, {
    waitUntil: "networkidle0",
  });
  await page.waitForSelector('[data-clara-orb-launcher="true"]');
  const client = await page.createCDPSession();
  return { page, client };
}

async function getLauncherCenter(page) {
  return page.$eval('[data-clara-orb-launcher="true"]', (element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
}

async function getCommandCenter(page, commandId) {
  await page.waitForSelector(`[data-clara-orb-command-id="${commandId}"]`);
  return page.$eval(
    `[data-clara-orb-command-id="${commandId}"]`,
    (element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
  );
}

async function touchStart(client, point) {
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      {
        x: point.x,
        y: point.y,
        radiusX: 6,
        radiusY: 6,
        force: 1,
        id: 1,
      },
    ],
  });
}

async function touchMove(client, point) {
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      {
        x: point.x,
        y: point.y,
        radiusX: 6,
        radiusY: 6,
        force: 1,
        id: 1,
      },
    ],
  });
}

async function touchEnd(client) {
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}

async function touchCancel(client) {
  await client.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
}

async function readState(page) {
  return page.evaluate(() => {
    const launcher = document.querySelector('[data-clara-orb-launcher="true"]');
    const ring = document.querySelector('[data-clara-orb-command-ring="true"]');
    const selected = document.querySelector('[data-clara-orb-command-id][data-selected="true"]');
    const status = document.querySelector(".clara-orb-status-copy p");
    const idleCopy = document.querySelector(".clara-orb-idle-copy");
    return {
      interactionState: launcher?.dataset.orbInteractionState || null,
      ringExpanded: ring?.dataset.expanded || null,
      selectedCommandId: selected?.dataset.claraOrbCommandId || null,
      statusText: status?.textContent?.trim() || "",
      idleOpacity: idleCopy ? Number.parseFloat(getComputedStyle(idleCopy).opacity) : null,
      commands: [...(window.__claraOrbHarness?.commands || [])],
      pauses: [...(window.__claraOrbHarness?.pauses || [])],
    };
  });
}

async function holdToCommand({ page, client }, commandId) {
  const center = await getLauncherCenter(page);
  await touchStart(client, center);
  await new Promise((resolve) => setTimeout(resolve, HOLD_WAIT_MS));
  const target = await getCommandCenter(page, commandId);
  await touchMove(client, target);
  await new Promise((resolve) => setTimeout(resolve, 90));
  return { center, target };
}

try {
  {
    const harness = await createHarnessPage();
    const center = await getLauncherCenter(harness.page);
    await touchStart(harness.client, center);
    await new Promise((resolve) => setTimeout(resolve, 90));
    await touchEnd(harness.client);
    await new Promise((resolve) => setTimeout(resolve, 120));

    const state = await readState(harness.page);
    assert.equal(state.interactionState, "idle", "short tap must return to idle gesture state");
    assert.equal(state.ringExpanded, null, "short tap must not render the command ring");
    assert.equal(state.commands.length, 0, "short tap must not dispatch a command");
    assert.equal(state.pauses.length, 1, "short tap must preserve Ask Before You Spend activation");
    await harness.page.close();
  }

  {
    const harness = await createHarnessPage();
    const center = await getLauncherCenter(harness.page);
    await touchStart(harness.client, center);
    await new Promise((resolve) => setTimeout(resolve, HOLD_WAIT_MS));
    await new Promise((resolve) => setTimeout(resolve, 60));

    let state = await readState(harness.page);
    assert.equal(state.interactionState, "commandActive", "hold must activate command mode");
    assert.equal(state.ringExpanded, "true", "command controls must bloom outward after hold");
    assert.equal(state.statusText, "CLARA COMMANDS", "hold must replace the idle status with command status");
    assert.ok(state.idleOpacity <= 0.05, "Ask Before You Spend copy must fade during command mode");

    await touchEnd(harness.client);
    await new Promise((resolve) => setTimeout(resolve, 360));
    state = await readState(harness.page);
    assert.equal(state.interactionState, "idle", "center release must close command mode");
    assert.equal(state.commands.length, 0, "center release must cancel without a command");
    assert.equal(state.pauses.length, 0, "long press must suppress the normal tap action");
    await harness.page.close();
  }

  {
    const harness = await createHarnessPage();
    const { page, client } = harness;
    const { target: walletPoint } = await holdToCommand(harness, "wallet");

    let state = await readState(page);
    assert.equal(state.selectedCommandId, "wallet", "drag direction must target Wallet");
    assert.equal(state.statusText, "Wallet", "targeted command must be confirmed above the Orb");

    const calendarPoint = await getCommandCenter(page, "calendar");
    await touchMove(client, calendarPoint);
    await new Promise((resolve) => setTimeout(resolve, 90));
    state = await readState(page);
    assert.equal(state.selectedCommandId, "calendar", "selection must follow sector changes");

    await touchMove(client, walletPoint);
    await new Promise((resolve) => setTimeout(resolve, 90));
    state = await readState(page);
    assert.equal(state.selectedCommandId, "wallet", "selection must remain reversible before release");

    await page.screenshot({ path: "artifacts/orb-command-wallet-390x844.png" });
    await touchEnd(client);
    await new Promise((resolve) => setTimeout(resolve, 380));

    state = await readState(page);
    assert.equal(state.interactionState, "idle", "release must collapse back to idle");
    assert.deepEqual(
      state.commands.map((command) => command.commandId),
      ["wallet"],
      "release on Wallet must dispatch exactly one Wallet command"
    );
    assert.equal(state.pauses.length, 0, "command release must not also open Ask Before You Spend");

    const second = await holdToCommand(harness, "calendar");
    await touchEnd(client);
    await new Promise((resolve) => setTimeout(resolve, 380));
    state = await readState(page);
    assert.deepEqual(
      state.commands.map((command) => command.commandId),
      ["wallet", "calendar"],
      "repeated command gestures must not retain stale selection state"
    );

    await touchStart(client, second.center);
    await new Promise((resolve) => setTimeout(resolve, 80));
    await touchEnd(client);
    await new Promise((resolve) => setTimeout(resolve, 120));
    state = await readState(page);
    assert.equal(state.pauses.length, 1, "a later genuine short tap must still work after command mode");
    await page.close();
  }

  {
    const harness = await createHarnessPage();
    const center = await getLauncherCenter(harness.page);
    await touchStart(harness.client, center);
    await new Promise((resolve) => setTimeout(resolve, 90));
    await touchMove(harness.client, { x: center.x + 42, y: center.y });
    await new Promise((resolve) => setTimeout(resolve, HOLD_WAIT_MS));

    let state = await readState(harness.page);
    assert.equal(state.interactionState, "idle", "clear movement before threshold must cancel pending hold");
    assert.equal(state.ringExpanded, null, "pre-hold movement cancellation must not open the ring later");

    await touchEnd(harness.client);
    await new Promise((resolve) => setTimeout(resolve, 120));
    state = await readState(harness.page);
    assert.equal(state.commands.length, 0);
    assert.equal(state.pauses.length, 0, "cancelled pre-hold movement must not become a tap");
    await harness.page.close();
  }

  {
    const harness = await createHarnessPage();
    const center = await getLauncherCenter(harness.page);
    await touchStart(harness.client, center);
    await new Promise((resolve) => setTimeout(resolve, HOLD_WAIT_MS));
    await touchCancel(harness.client);
    await new Promise((resolve) => setTimeout(resolve, 360));

    const state = await readState(harness.page);
    assert.equal(state.interactionState, "idle", "pointer cancellation must restore idle state");
    assert.equal(state.commands.length, 0, "pointer cancellation must never dispatch a command");
    assert.equal(state.pauses.length, 0, "pointer cancellation must never trigger the tap action");
    await harness.page.close();
  }

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 430, height: 932 },
  ]) {
    const harness = await createHarnessPage(viewport);
    const center = await getLauncherCenter(harness.page);
    await touchStart(harness.client, center);
    await new Promise((resolve) => setTimeout(resolve, HOLD_WAIT_MS));
    await new Promise((resolve) => setTimeout(resolve, 80));

    const bounds = await harness.page.$$eval('[data-clara-orb-command-id]', (elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          id: element.dataset.claraOrbCommandId,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: window.innerWidth,
          height: window.innerHeight,
        };
      })
    );

    assert.equal(bounds.length, 9, "all nine commands must remain rendered responsively");
    for (const rect of bounds) {
      assert.ok(rect.left >= -0.5, `${rect.id} must not overflow the left viewport edge`);
      assert.ok(rect.right <= rect.width + 0.5, `${rect.id} must not overflow the right viewport edge`);
      assert.ok(rect.top >= -0.5, `${rect.id} must not overflow the top viewport edge`);
      assert.ok(rect.bottom <= rect.height + 0.5, `${rect.id} must not overflow the bottom viewport edge`);
    }

    if (viewport.width === 320) {
      await harness.page.screenshot({ path: "artifacts/orb-command-ring-320x568.png" });
    }

    await touchEnd(harness.client);
    await new Promise((resolve) => setTimeout(resolve, 320));
    await harness.page.close();
  }

  {
    const harness = await createHarnessPage({ width: 390, height: 844, reducedMotion: true });
    await holdToCommand(harness, "savings-goal");
    await touchEnd(harness.client);
    await new Promise((resolve) => setTimeout(resolve, 320));
    const state = await readState(harness.page);
    assert.deepEqual(
      state.commands.map((command) => command.commandId),
      ["savings-goal"],
      "reduced-motion mode must preserve command functionality"
    );
    await harness.page.close();
  }

  console.log("CLARA Orb browser verification passed.");
} finally {
  await browser.close();
}
