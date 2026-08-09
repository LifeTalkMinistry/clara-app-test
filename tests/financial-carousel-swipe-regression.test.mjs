import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const hook = readSource("src/components/financial-carousel/logic/useAutoMovingHorizontalCarousel.js");
const guideSwipeAdapter = readSource("src/components/financial-carousel/logic/useGuideMobileSwipeAdapter.js");
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

test("Guide Mode mobile swipe stays intentionally lightweight", () => {
  assert.equal(guideSwipeAdapter.includes("const MOBILE_DRAG_LOCK_THRESHOLD_PX = 2;"), true);
  assert.equal(guideSwipeAdapter.includes("const MOBILE_SWIPE_DISTANCE_MAX_PX = 14;"), true);
  assert.equal(guideSwipeAdapter.includes("const MOBILE_SWIPE_DISTANCE_RATIO = 0.035;"), true);
  assert.equal(guideSwipeAdapter.includes("const MOBILE_LIVE_DRAG_GAIN = 1.18;"), true);
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
