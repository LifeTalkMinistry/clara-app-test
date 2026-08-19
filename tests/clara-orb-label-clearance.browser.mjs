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

try {
  fs.mkdirSync("artifacts", { recursive: true });

  for (const id of idsToCheck) {
    const page = await browser.newPage();
    await page.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
    });
    await page.goto(`${baseUrl}?clearance=${id}-${Date.now()}`, { waitUntil: "networkidle0" });
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
      if (!orb || !label) return null;

      const labelRect = label.getBoundingClientRect();
      const orbCenter = {
        x: orb.left + orb.width / 2,
        y: orb.top + orb.height / 2,
      };
      const protectedRadius = orb.width * (117 / 320);
      const nearestX = Math.max(labelRect.left, Math.min(orbCenter.x, labelRect.right));
      const nearestY = Math.max(labelRect.top, Math.min(orbCenter.y, labelRect.bottom));
      const nearestDistance = Math.hypot(nearestX - orbCenter.x, nearestY - orbCenter.y);

      return {
        selected: action?.dataset.selected === "true",
        statusText: status?.textContent?.trim() || "",
        nearestDistance,
        protectedRadius,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        labelRect: {
          left: labelRect.left,
          top: labelRect.top,
          right: labelRect.right,
          bottom: labelRect.bottom,
        },
      };
    }, id);

    assert.ok(geometry, `expected selected label for ${id}`);
    assert.equal(geometry.selected, true, `${id} must be the selected command`);
    assert.ok(geometry.statusText.length > 0, `${id} must keep a visible status label`);
    assert.ok(
      geometry.nearestDistance > geometry.protectedRadius,
      `${id} label entered Orb protected zone: ${JSON.stringify(geometry)}`
    );
    assert.ok(geometry.labelRect.left >= -0.5, `${id} label overflowed the left viewport edge`);
    assert.ok(
      geometry.labelRect.right <= geometry.viewportWidth + 0.5,
      `${id} label overflowed the right viewport edge`
    );
    assert.ok(geometry.labelRect.top >= -0.5, `${id} label overflowed the top viewport edge`);
    assert.ok(
      geometry.labelRect.bottom <= geometry.viewportHeight + 0.5,
      `${id} label overflowed the bottom viewport edge`
    );

    if (id === "log-expense" || id === "add-income" || id === "weekly-cross-check") {
      await page.screenshot({
        path: `artifacts/orb-command-label-${id}-390x844.png`,
        fullPage: false,
      });
    }

    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });

    await page.close();
  }

  console.log("CLARA Orb label-clearance browser verification passed for all nine commands.");
} finally {
  await browser.close();
}
