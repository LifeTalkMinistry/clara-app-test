import assert from "node:assert/strict";
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const baseUrl =
  process.env.CLARA_ORB_BROWSER_BASE_URL ||
  "http://127.0.0.1:4173/tests/fixtures/clara-orb-command-ring.html";
const executablePath =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  process.env.CHROME_PATH ||
  process.env.CHROME_BIN ||
  "/usr/bin/google-chrome";
const HOLD_WAIT_MS = 650;
const BLOOM_SETTLE_MS = 280;

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const idsToCheck = [
  "log-expense",
  "add-income",
  "wallet",
  "calendar",
  "money-schedule",
  "emergency-fund",
  "savings-goal",
  "debt-obligation",
  "weekly-cross-check",
];

const verificationCases = [
  ...idsToCheck.map((id) => ({ id, width: 390, height: 844 })),
  { id: "debt-obligation", width: 320, height: 568 },
  { id: "weekly-cross-check", width: 320, height: 568 },
];

try {
  fs.mkdirSync("artifacts", { recursive: true });

  for (const { id, width, height } of verificationCases) {
    const page = await browser.newPage();
    await page.setViewport({
      width,
      height,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
    });
    await page.goto(`${baseUrl}?clearance=${id}-${width}-${Date.now()}`, {
      waitUntil: "networkidle0",
    });
    await page.waitForSelector('[data-clara-orb-launcher="true"]');

    const client = await page.createCDPSession();

    const center = await page.$eval('[data-clara-orb-launcher="true"]', (element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });

    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        {
          x: center.x,
          y: center.y,
          radiusX: 6,
          radiusY: 6,
          force: 1,
          id: 1,
        },
      ],
    });

    await wait(HOLD_WAIT_MS);
    await page.waitForSelector(`[data-clara-orb-command-id="${id}"]`);
    await wait(BLOOM_SETTLE_MS);

    const commandPoint = await page.$eval(
      `[data-clara-orb-command-id="${id}"]`,
      (element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }
    );

    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: commandPoint.x,
          y: commandPoint.y,
          radiusX: 6,
          radiusY: 6,
          force: 1,
          id: 1,
        },
      ],
    });

    await wait(110);

    const geometry = await page.evaluate((commandId) => {
      const orb = document.querySelector('[data-clara-orb-launcher="true"]')?.getBoundingClientRect();
      const action = document.querySelector(`[data-clara-orb-command-id="${commandId}"]`);
      const label = action?.querySelector(".clara-orb-command-action-label");
      const status = document.querySelector(".clara-orb-status-copy p");
      if (!orb || !action) return null;

      const labelRect = label?.getBoundingClientRect() || null;
      const labelVisible = Boolean(
        label &&
          getComputedStyle(label).display !== "none" &&
          labelRect &&
          labelRect.width > 0 &&
          labelRect.height > 0
      );

      const orbCenter = {
        x: orb.left + orb.width / 2,
        y: orb.top + orb.height / 2,
      };
      const protectedRadius = orb.width * (117 / 320);
      let nearestDistance = Number.POSITIVE_INFINITY;
      let commandCollisions = [];

      if (labelVisible && labelRect) {
        const nearestX = Math.max(labelRect.left, Math.min(orbCenter.x, labelRect.right));
        const nearestY = Math.max(labelRect.top, Math.min(orbCenter.y, labelRect.bottom));
        nearestDistance = Math.hypot(nearestX - orbCenter.x, nearestY - orbCenter.y);
        const collisionPadding = 3;
        commandCollisions = [...document.querySelectorAll('[data-clara-orb-command-id]')]
          .filter((node) => node !== action)
          .map((node) => {
            const rect = node.getBoundingClientRect();
            const overlaps = !(
              labelRect.right + collisionPadding <= rect.left ||
              labelRect.left - collisionPadding >= rect.right ||
              labelRect.bottom + collisionPadding <= rect.top ||
              labelRect.top - collisionPadding >= rect.bottom
            );
            return overlaps ? node.dataset.claraOrbCommandId : null;
          })
          .filter(Boolean);
      }

      return {
        selected: action.dataset.selected === "true",
        statusText: status?.textContent?.trim() || "",
        labelVisible,
        nearestDistance,
        protectedRadius,
        commandCollisions,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        labelRect: labelRect
          ? {
              left: labelRect.left,
              top: labelRect.top,
              right: labelRect.right,
              bottom: labelRect.bottom,
            }
          : null,
      };
    }, id);

    assert.ok(geometry, `expected selected command geometry for ${id} at ${width}px`);
    assert.equal(geometry.selected, true, `${id} must be the selected command at ${width}px`);
    assert.ok(geometry.statusText.length > 0, `${id} must keep a visible status label at ${width}px`);

    const compactWeeklyUsesStatusOnly = id === "weekly-cross-check" && width <= 340;
    if (compactWeeklyUsesStatusOnly) {
      assert.equal(
        geometry.labelVisible,
        false,
        "compact Weekly Cross-Check must avoid duplicate local label collisions"
      );
      assert.equal(
        geometry.statusText,
        "Weekly Cross-Check",
        "compact Weekly Cross-Check must retain its canonical top status"
      );
    } else {
      assert.equal(geometry.labelVisible, true, `expected selected label for ${id} at ${width}px`);
      assert.ok(
        geometry.nearestDistance > geometry.protectedRadius,
        `${id} label entered Orb protected zone at ${width}px: ${JSON.stringify(geometry)}`
      );
      assert.deepEqual(
        geometry.commandCollisions,
        [],
        `${id} label overlapped another command icon at ${width}px: ${JSON.stringify(geometry)}`
      );
      assert.ok(
        geometry.labelRect.left >= -0.5,
        `${id} label overflowed the left viewport edge at ${width}px`
      );
      assert.ok(
        geometry.labelRect.right <= geometry.viewportWidth + 0.5,
        `${id} label overflowed the right viewport edge at ${width}px`
      );
      assert.ok(
        geometry.labelRect.top >= -0.5,
        `${id} label overflowed the top viewport edge at ${width}px`
      );
      assert.ok(
        geometry.labelRect.bottom <= geometry.viewportHeight + 0.5,
        `${id} label overflowed the bottom viewport edge at ${width}px`
      );
    }

    if (
      id === "log-expense" ||
      id === "add-income" ||
      id === "debt-obligation" ||
      id === "weekly-cross-check"
    ) {
      await page.screenshot({
        path: `artifacts/orb-command-label-${id}-${width}x${height}.png`,
        fullPage: false,
      });
    }

    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });

    await page.close();
  }

  console.log("CLARA Orb label-clearance browser verification passed with compact status handling.");
} finally {
  await browser.close();
}
