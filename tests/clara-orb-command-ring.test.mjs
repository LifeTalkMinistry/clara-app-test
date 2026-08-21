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
} from "../src/lib/clara-orb-command-ring.js";

const orbPage = fs.readFileSync("src/components/community/ClaraOrbPage.jsx", "utf8");
const orbCommandRing = fs.readFileSync("src/lib/clara-orb-command-ring.js", "utf8");
const orbCommandRingCss = fs.readFileSync("src/lib/clara-orb-command-ring.css", "utf8");

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

test("Add Income keeps the Income Hub fallback inside HashRouter and deployment base", () => {
  const addIncomeCommand = CLARA_ORB_COMMANDS.find(
    (command) => command.id === "add-income"
  );

  assert.equal(addIncomeCommand?.href, "#/investment-plan");
  assert.doesNotEqual(addIncomeCommand?.href, "/investment-plan");
  assert.match(orbCommandRing, /cancelable:\s*true/);
  assert.match(orbCommandRing, /window\.location\?\.assign/);
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

test("label clearance does not move the command circles off their bounded ring", () => {
  assert.ok(CLARA_ORB_COMMANDS.every((command) => command.radius === 1));
  assert.match(orbCommandRing, /import\(["']\.\/clara-orb-command-ring\.css["']\)/);
  assert.match(orbCommandRingCss, /data-clara-orb-command-id="log-expense"/);
  assert.match(orbCommandRingCss, /data-clara-orb-command-id="add-income"/);
  assert.match(orbCommandRingCss, /data-clara-orb-command-id="weekly-cross-check"/);
  assert.match(orbCommandRingCss, /data-clara-orb-command-id="debt-obligation"/);
});

test("Money Schedule routine UI uses a restrained ledger hierarchy instead of nested form cards", () => {
  assert.match(orbCommandRingCss, /data-clara-money-routine-day-controls="true"/);
  assert.match(orbCommandRingCss, /section:has\(\+ \[data-clara-money-routine-day-controls="true"\]\)/);
  assert.match(orbCommandRingCss, /data-clara-money-routine-weekly-review="true"/);
  assert.match(orbCommandRingCss, /data-clara-money-routine-review-day/);
  assert.match(orbCommandRingCss, /data-clara-money-routine-review-item="true"/);
  assert.match(orbCommandRingCss, /border-bottom:\s*1px solid rgba\(255, 255, 255, 0\.07\)/);
  assert.match(orbCommandRingCss, /data-clara-money-routine-day-controls="true"\] > button:not\(:last-child\)/);
  assert.match(orbCommandRingCss, /data-clara-money-routine-day-controls="true"\] > button:last-child/);
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