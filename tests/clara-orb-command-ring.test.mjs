import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  CLARA_ORB_COMMANDS,
  ORB_COMMAND_HOLD_MS,
  ORB_COMMAND_PRE_HOLD_MOVE_PX,
  getOrbCommandAngularDistance,
  getOrbCommandDeadZone,
  getOrbCommandRadius,
  getOrbCommandTarget,
  getOrbCommandVisualRadiusMultiplier,
} from "../src/lib/clara-orb-command-ring.js";

const orbPage = fs.readFileSync("src/components/community/ClaraOrbPage.jsx", "utf8");

test("ORB command ring exposes exactly the nine product command categories", () => {
  assert.deepEqual(
    CLARA_ORB_COMMANDS.map((command) => command.id),
    [
      "log-expense",
      "add-income",
      "wallet",
      "calendar",
      "money-schedule",
      "emergency-fund",
      "savings-goal",
      "debt-obligation",
      "weekly-cross-check",
    ]
  );
  assert.equal(new Set(CLARA_ORB_COMMANDS.map((command) => command.angle)).size, 9);
});

test("hold timing and pre-activation motion tolerance stay deliberate", () => {
  assert.ok(ORB_COMMAND_HOLD_MS >= 450 && ORB_COMMAND_HOLD_MS <= 650);
  assert.ok(ORB_COMMAND_PRE_HOLD_MOVE_PX >= 10 && ORB_COMMAND_PRE_HOLD_MOVE_PX <= 20);
});

test("directional targeting uses a center dead zone and nearest configured angle", () => {
  assert.equal(
    getOrbCommandTarget({
      pointerX: 110,
      pointerY: 100,
      centerX: 100,
      centerY: 100,
      deadZonePx: 52,
    }),
    null
  );

  assert.equal(
    getOrbCommandTarget({
      pointerX: 100,
      pointerY: 0,
      centerX: 100,
      centerY: 100,
      deadZonePx: 52,
    })?.id,
    "log-expense"
  );

  assert.equal(
    getOrbCommandTarget({
      pointerX: 200,
      pointerY: 82,
      centerX: 100,
      centerY: 100,
      deadZonePx: 52,
    })?.id,
    "wallet"
  );

  assert.equal(getOrbCommandAngularDistance(-90, 270), 0);
});

test("responsive geometry keeps the ring bounded without changing command identity", () => {
  assert.equal(getOrbCommandDeadZone(100), 52);
  assert.equal(getOrbCommandDeadZone(400), 78);

  const radius = getOrbCommandRadius({
    centerX: 160,
    centerY: 300,
    viewportWidth: 320,
    viewportHeight: 600,
    orbWidth: 240,
  });

  assert.ok(radius >= 92 && radius <= 158);
});

test("command labels receive geometry-derived clearance away from the Orb", () => {
  const top = getOrbCommandVisualRadiusMultiplier(-90, "Log Expense");
  const upperRight = getOrbCommandVisualRadiusMultiplier(-50, "Add Income");
  const right = getOrbCommandVisualRadiusMultiplier(0, "Wallet");
  const lower = getOrbCommandVisualRadiusMultiplier(90, "Wallet");
  const wideUpperLeft = getOrbCommandVisualRadiusMultiplier(230, "Weekly Cross-Check");

  assert.ok(top > 1);
  assert.ok(upperRight > 1);
  assert.ok(wideUpperLeft > top);
  assert.ok(right >= 1);
  assert.equal(lower, 1);

  const logExpense = CLARA_ORB_COMMANDS.find((command) => command.id === "log-expense");
  const addIncome = CLARA_ORB_COMMANDS.find((command) => command.id === "add-income");
  const weeklyCrossCheck = CLARA_ORB_COMMANDS.find(
    (command) => command.id === "weekly-cross-check"
  );

  assert.ok(logExpense.radius >= 1.19);
  assert.ok(addIncome.radius >= 1.2);
  assert.ok(weeklyCrossCheck.radius >= 1.27);
});

test("production Orb preserves tap behavior while adding pointer-driven hold selection", () => {
  assert.match(orbPage, /onClick=\{handleOrbClick\}/);
  assert.match(orbPage, /onPointerDown=\{handleOrbPointerDown\}/);
  assert.match(orbPage, /onPointerMove=\{handleOrbPointerMove\}/);
  assert.match(orbPage, /onPointerUp=\{handleOrbPointerUp\}/);
  assert.match(orbPage, /onPointerCancel=\{handleOrbPointerCancel\}/);
  assert.match(orbPage, /suppressNextClickRef/);
  assert.match(orbPage, /dispatchClaraOrbCommandSelection\(dispatchCommandId\)/);
});

test("tutorial reuse remains tap-only and command haptics reuse CLARA haptic authority", () => {
  assert.match(orbPage, /const isCommandModeEnabled = typeof onActivate !== ["']function["']/);
  assert.match(orbPage, /triggerClaraHaptic\(["']light["']\)/);
  assert.match(orbPage, /triggerClaraHaptic\(["']selection["']\)/);
  assert.doesNotMatch(orbPage, /navigator\.vibrate/);
});

test("command mode only suppresses touch behavior on the Orb launcher surface", () => {
  assert.match(
    orbPage,
    /style=\{\{ touchAction: isCommandModeEnabled \? ["']none["'] : ["']manipulation["'] \}\}/
  );
  assert.doesNotMatch(orbPage, /document\.body\.style\.touchAction/);
});
