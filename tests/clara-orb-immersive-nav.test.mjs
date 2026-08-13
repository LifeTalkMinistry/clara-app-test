import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const immersiveNavSource = readSource("src/runtime/installClaraOrbImmersiveNav.js");
const formerHitTargetSource = readSource("src/runtime/installClaraOrbPreciseHitTarget.js");
const orbPageSource = readSource("src/components/community/ClaraOrbPage.jsx");

test("Orb page root owns pointer reveal behavior", () => {
  assert.match(immersiveNavSource, /PAGE_SELECTOR = "\\.clara-community-orb-view"/);
  assert.match(immersiveNavSource, /activePage\?\.addEventListener\("pointerdown"/);
  assert.match(immersiveNavSource, /activePage\?\.addEventListener\("pointerup"/);
  assert.doesNotMatch(immersiveNavSource, /document\.addEventListener\("pointerdown"/);
  assert.doesNotMatch(immersiveNavSource, /document\.addEventListener\("pointerup"/);
});

test("the stable Orb launcher hierarchy is the only reveal exclusion", () => {
  assert.match(immersiveNavSource, /ORB_INTERACTIVE_SELECTOR = '\[data-clara-orb-launcher="true"\]'/);
  assert.match(immersiveNavSource, /start\.orbOwned \|\| isOrbInteractionTarget\(event\.target, activePage\)/);
  assert.match(orbPageSource, /data-clara-orb-launcher="true"/);
  assert.doesNotMatch(immersiveNavSource, /a, button, input, textarea, select/);
});

test("non-Orb pointer completion wakes navigation without a tap-slop dead zone", () => {
  assert.doesNotMatch(immersiveNavSource, /TAP_SLOP_PX/);
  assert.doesNotMatch(immersiveNavSource, /Math\.hypot/);
  assert.match(immersiveNavSource, /setVisible\(true\);\s*\n\s*};\s*\n\s*\n\s*const handlePagePointerCancel/);
});

test("the square Orb canvas is pointer-transparent outside the painted sphere", () => {
  assert.match(immersiveNavSource, /\[data-clara-orb-launcher="true"\] \* \{\s*pointer-events: none !important;/);
  assert.match(immersiveNavSource, /\.clara-orb-vector > circle \{\s*pointer-events: all !important;/);
});

test("legacy coordinate hit testing and propagation blocking are retired", () => {
  assert.doesNotMatch(formerHitTargetSource, /ORB_CENTER_X|ORB_CENTER_Y|ORB_HIT_RADIUS|SVG_SIZE/);
  assert.doesNotMatch(formerHitTargetSource, /getBoundingClientRect|stopImmediatePropagation|preventDefault/);
  assert.doesNotMatch(formerHitTargetSource, /addEventListener\("click"/);
});
