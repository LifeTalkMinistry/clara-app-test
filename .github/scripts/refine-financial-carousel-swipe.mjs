import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const resolvePath = (file) => path.join(root, file);
const read = (file) => fs.readFileSync(resolvePath(file), "utf8");
const write = (file, content) => fs.writeFileSync(resolvePath(file), content, "utf8");

function replaceRequired(file, search, replacement, label) {
  const source = read(file);
  const next = source.replace(search, replacement);
  if (next === source) {
    throw new Error(`Missing patch anchor (${label}) in ${file}`);
  }
  write(file, next);
}

const hookPath = "src/components/financial-carousel/logic/useAutoMovingHorizontalCarousel.js";

replaceRequired(
  hookPath,
  "const SCROLL_SETTLE_DEBOUNCE_MS = 110;",
  "const SCROLL_SETTLE_FALLBACK_MS = 220;",
  "less aggressive scroll settle fallback"
);

replaceRequired(
  hookPath,
  "  const isProgrammaticScrollRef = useRef(false);\n",
  "  const isProgrammaticScrollRef = useRef(false);\n  const supportsScrollEndRef = useRef(false);\n",
  "scrollend capability ref"
);

replaceRequired(
  hookPath,
  `  const handleControlledGuidePointerDown = useCallback((event) => {\n    if (!guideMaxStepPerInteractionRef.current) return;\n    if (event.pointerType === "mouse" && event.button !== 0) return;\n\n    const container = carouselRef.current;\n    if (!container) return;\n\n    beginGuideInteraction(true);`,
  `  const handleControlledGuidePointerDown = useCallback((event) => {\n    if (event.pointerType === "mouse" && event.button !== 0) return;\n\n    beginGuideInteraction(true);\n\n    if (!guideMaxStepPerInteractionRef.current) return;\n\n    const container = carouselRef.current;\n    if (!container) return;`,
  "normal pointer interaction ownership"
);

replaceRequired(
  hookPath,
  `      if (guidePointerGestureRef.current.active) {\n        return;\n      }\n\n      scrollSettleTimerRef.current = window.setTimeout(() => {\n        scrollSettleTimerRef.current = null;\n        commitSettledScrollIndex();\n      }, SCROLL_SETTLE_DEBOUNCE_MS);`,
  `      if (guidePointerGestureRef.current.active || supportsScrollEndRef.current) {\n        return;\n      }\n\n      scrollSettleTimerRef.current = window.setTimeout(() => {\n        scrollSettleTimerRef.current = null;\n        commitSettledScrollIndex();\n      }, SCROLL_SETTLE_FALLBACK_MS);`,
  "scrollend-first settle ownership"
);

replaceRequired(
  hookPath,
  `    let resizeFrame = null;\n\n    const realignCurrentSlide = () => {\n      if (resizeFrame) {\n        window.cancelAnimationFrame(resizeFrame);\n      }\n\n      resizeFrame = window.requestAnimationFrame(() => {\n        resizeFrame = null;\n\n        const safeIndex = clampIndex(activeIndexRef.current, itemCount);\n        const targetLeft = getSlideWidth() * safeIndex;\n\n        if (Math.abs(container.scrollLeft - targetLeft) <= 1) return;\n\n        markProgrammaticScroll("auto");\n        container.scrollTo({ left: targetLeft, behavior: "auto" });\n      });\n    };`,
  `    let resizeFrame = null;\n    let observedWidth = container.clientWidth || 0;\n\n    const realignCurrentSlide = () => {\n      if (resizeFrame) {\n        window.cancelAnimationFrame(resizeFrame);\n      }\n\n      resizeFrame = window.requestAnimationFrame(() => {\n        resizeFrame = null;\n\n        const nextWidth = container.clientWidth || 0;\n        if (Math.abs(nextWidth - observedWidth) <= 0.5) return;\n        observedWidth = nextWidth;\n\n        const safeIndex = clampIndex(activeIndexRef.current, itemCount);\n        const targetLeft = getSlideWidth() * safeIndex;\n\n        if (Math.abs(container.scrollLeft - targetLeft) <= 1) return;\n\n        markProgrammaticScroll("auto");\n        container.scrollTo({ left: targetLeft, behavior: "auto" });\n      });\n    };`,
  "width-only resize realignment"
);

replaceRequired(
  hookPath,
  `    const handleScrollEnd = () => {\n      clearScrollSettleTimer();\n      enforceGuideScrollRestrictions();\n\n      if (guidePointerGestureRef.current.active) {\n        return;\n      }\n\n      commitSettledScrollIndex();\n    };\n\n    container.addEventListener("scrollend", handleScrollEnd);\n\n    return () => {\n      container.removeEventListener("scrollend", handleScrollEnd);\n    };`,
  `    const supportsScrollEnd =\n      "onscrollend" in container ||\n      (typeof window !== "undefined" && "onscrollend" in window);\n    supportsScrollEndRef.current = supportsScrollEnd;\n\n    if (!supportsScrollEnd) {\n      return () => {\n        supportsScrollEndRef.current = false;\n      };\n    }\n\n    const handleScrollEnd = () => {\n      clearScrollSettleTimer();\n      enforceGuideScrollRestrictions();\n\n      if (guidePointerGestureRef.current.active) {\n        return;\n      }\n\n      commitSettledScrollIndex();\n    };\n\n    container.addEventListener("scrollend", handleScrollEnd);\n\n    return () => {\n      supportsScrollEndRef.current = false;\n      container.removeEventListener("scrollend", handleScrollEnd);\n    };`,
  "native scrollend feature detection"
);

const slidePath = "src/components/financial-carousel/ui/CarouselSlideShell.jsx";
replaceRequired(
  slidePath,
  `className="clara-finance-slide-shell relative flex w-full min-w-full shrink-0 snap-center overflow-visible transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"`,
  `className="clara-finance-slide-shell relative flex w-full min-w-full shrink-0 snap-center [scroll-snap-stop:always] overflow-visible transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"`,
  "one-card native snap stop"
);

const testPath = "tests/financial-carousel-swipe-regression.test.mjs";
write(
  testPath,
  `import test from "node:test";\nimport assert from "node:assert/strict";\nimport { readFileSync } from "node:fs";\n\nconst readSource = (relativePath) =>\n  readFileSync(new URL(\`../\${relativePath}\`, import.meta.url), "utf8");\n\nconst hook = readSource("src/components/financial-carousel/logic/useAutoMovingHorizontalCarousel.js");\nconst viewport = readSource("src/components/financial-carousel/ui/CarouselViewport.jsx");\nconst slide = readSource("src/components/financial-carousel/ui/CarouselSlideShell.jsx");\nconst carousel = readSource("src/components/financial-carousel/FinancialCarousel.jsx");\n\ntest("native scrollend owns settling when supported", () => {\n  assert.equal(hook.includes("const SCROLL_SETTLE_FALLBACK_MS = 220;"), true);\n  assert.equal(hook.includes("supportsScrollEndRef.current"), true);\n  assert.equal(hook.includes("guidePointerGestureRef.current.active || supportsScrollEndRef.current"), true);\n  assert.equal(hook.includes("SCROLL_SETTLE_DEBOUNCE_MS"), false);\n});\n\ntest("height-only card animation does not repeatedly realign horizontal scroll", () => {\n  assert.equal(hook.includes("let observedWidth = container.clientWidth || 0;"), true);\n  assert.equal(hook.includes("Math.abs(nextWidth - observedWidth) <= 0.5"), true);\n});\n\ntest("normal pointer interaction is recorded before Guide-only controls", () => {\n  const beginIndex = hook.indexOf("beginGuideInteraction(true);");\n  const guideGuardIndex = hook.indexOf("if (!guideMaxStepPerInteractionRef.current) return;", beginIndex);\n  assert.notEqual(beginIndex, -1);\n  assert.notEqual(guideGuardIndex, -1);\n  assert.equal(beginIndex < guideGuardIndex, true);\n});\n\ntest("native carousel snaps one financial card at a time", () => {\n  assert.equal(slide.includes("[scroll-snap-stop:always]"), true);\n  assert.equal(viewport.includes("snap-x snap-mandatory"), true);\n});\n\ntest("carousel movement remains owned by one track", () => {\n  assert.equal(viewport.includes("onScroll={onScroll}"), true);\n  assert.equal(viewport.includes("{...interactionHandlers}"), true);\n  assert.equal(carousel.includes("useAutoMovingHorizontalCarousel"), true);\n  assert.equal(carousel.includes("onTouchMove="), false);\n});\n`
);

const packagePath = "package.json";
let packageSource = read(packagePath);
if (!packageSource.includes("tests/financial-carousel-swipe-regression.test.mjs")) {
  const anchor = 'tests/financial-card-ownership-regression.test.mjs"';
  if (!packageSource.includes(anchor)) {
    throw new Error("Unable to add carousel swipe regression to npm test.");
  }
  packageSource = packageSource.replace(
    anchor,
    'tests/financial-card-ownership-regression.test.mjs tests/financial-carousel-swipe-regression.test.mjs"'
  );
  write(packagePath, packageSource);
}

console.log("Financial carousel swipe refinement applied.");
