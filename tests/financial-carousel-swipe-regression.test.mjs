import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const hook = readSource("src/components/financial-carousel/logic/useAutoMovingHorizontalCarousel.js");
const viewport = readSource("src/components/financial-carousel/ui/CarouselViewport.jsx");
const slide = readSource("src/components/financial-carousel/ui/CarouselSlideShell.jsx");
const carousel = readSource("src/components/financial-carousel/FinancialCarousel.jsx");

test("native scrollend owns settling when supported", () => {
  assert.equal(hook.includes("const SCROLL_SETTLE_FALLBACK_MS = 220;"), true);
  assert.equal(hook.includes("supportsScrollEndRef.current"), true);
  assert.equal(hook.includes("guidePointerGestureRef.current.active || supportsScrollEndRef.current"), true);
  assert.equal(hook.includes("SCROLL_SETTLE_DEBOUNCE_MS"), false);
});

test("height-only card animation does not repeatedly realign horizontal scroll", () => {
  assert.equal(hook.includes("let observedWidth = container.clientWidth || 0;"), true);
  assert.equal(hook.includes("Math.abs(nextWidth - observedWidth) <= 0.5"), true);
});

test("normal pointer interaction is recorded before Guide-only controls", () => {
  const beginIndex = hook.indexOf("beginGuideInteraction(true);");
  const guideGuardIndex = hook.indexOf("if (!guideMaxStepPerInteractionRef.current) return;", beginIndex);
  assert.notEqual(beginIndex, -1);
  assert.notEqual(guideGuardIndex, -1);
  assert.equal(beginIndex < guideGuardIndex, true);
});

test("native carousel snaps one financial card at a time", () => {
  assert.equal(slide.includes("[scroll-snap-stop:always]"), true);
  assert.equal(viewport.includes("snap-x snap-mandatory"), true);
});

test("carousel movement remains owned by one track", () => {
  assert.equal(viewport.includes("onScroll={onScroll}"), true);
  assert.equal(viewport.includes("{...interactionHandlers}"), true);
  assert.equal(carousel.includes("useAutoMovingHorizontalCarousel"), true);
  assert.equal(carousel.includes("onTouchMove="), false);
});
