import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";

const baseUrl = process.env.CLARA_ORB_BROWSER_BASE_URL || "http://127.0.0.1:4173/tests/fixtures/clara-orb-command-ring.html";
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_BIN || "/usr/bin/google-chrome";

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(baseUrl, { waitUntil: "networkidle0" });

  const launcher = await page.$('[data-clara-orb-launcher="true"]');
  assert.ok(launcher, "expected production Orb launcher");

  const launcherBox = await launcher.boundingBox();
  assert.ok(launcherBox, "expected Orb launcher bounds");

  const centerX = launcherBox.x + launcherBox.width / 2;
  const centerY = launcherBox.y + launcherBox.height / 2;

  const client = await page.target().createCDPSession();
  await client.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });

  const touch = async (type, x, y) => {
    await client.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x, y, radiusX: 1, radiusY: 1, force: 1 }],
    });
  };

  await touch("touchStart", centerX, centerY);
  await new Promise((resolve) => setTimeout(resolve, 620));

  const commands = await page.$$eval('[data-clara-orb-command-id]', (nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        id: node.dataset.claraOrbCommandId,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    })
  );

  const idsToCheck = ["log-expense", "add-income", "debt-obligation", "weekly-cross-check"];

  for (const id of idsToCheck) {
    const command = commands.find((item) => item.id === id);
    assert.ok(command, `missing ${id}`);

    await touch("touchMove", command.x, command.y);
    await new Promise((resolve) => setTimeout(resolve, 70));

    const geometry = await page.evaluate((commandId) => {
      const orb = document.querySelector('[data-clara-orb-launcher="true"]').getBoundingClientRect();
      const action = document.querySelector(`[data-clara-orb-command-id="${commandId}"]`);
      const label = action?.querySelector(".clara-orb-command-action-label");
      if (!label) return null;

      const labelRect = label.getBoundingClientRect();
      const orbCenter = {
        x: orb.left + orb.width / 2,
        y: orb.top + orb.height / 2,
      };
      const protectedRadius = orb.width * (117 / 320);
      const nearestX = Math.max(labelRect.left, Math.min(orbCenter.x, labelRect.right));
      const nearestY = Math.max(labelRect.top, Math.min(orbCenter.y, labelRect.bottom));
      const nearestDistance = Math.hypot(nearestX - orbCenter.x, nearestY - orbCenter.y);

      return { nearestDistance, protectedRadius, labelRect: { left: labelRect.left, top: labelRect.top, right: labelRect.right, bottom: labelRect.bottom } };
    }, id);

    assert.ok(geometry, `expected selected label for ${id}`);
    assert.ok(
      geometry.nearestDistance > geometry.protectedRadius,
      `${id} label entered Orb protected zone: ${JSON.stringify(geometry)}`
    );
  }

  await touch("touchEnd", centerX, centerY);
  console.log("CLARA Orb label-clearance browser verification passed.");
} finally {
  await browser.close();
}
