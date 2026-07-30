import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read = (path) => fs.readFile(new URL(path, import.meta.url), "utf8");

test("Learning Hub first click and swipe paths stay lazy, visible, and passive-safe", async () => {
  const [
    hubSource,
    toggleSource,
    soundSource,
    carouselSource,
    cardSource,
    loadedSource,
    previewSource,
    previewLoadedSource,
    overlaySource,
    mobilePerformanceSource,
  ] = await Promise.all([
    read("../src/components/fresh/main-dashboard/learning-hub/LearningHub.jsx"),
    read("../src/components/fresh/main-dashboard/learning-hub/ui/LearningHubToggleButton.jsx"),
    read("../src/runtime/installLearningHubOpenSound.js"),
    read("../src/components/fresh/main-dashboard/learning-hub/ui/LearningHubCarousel.jsx"),
    read("../src/components/fresh/main-dashboard/learning-hub/ui/LearningMaterialCard.jsx"),
    read("../src/components/fresh/main-dashboard/learning-hub/LearningHubLoaded.jsx"),
    read("../src/components/fresh/main-dashboard/guide/ClaraGuideLearningHubPreview.jsx"),
    read("../src/components/fresh/main-dashboard/guide/ClaraGuideLearningHubPreviewLoaded.jsx"),
    read("../src/components/fresh/main-dashboard/guide/ClaraGuideLearningHubOverlay.jsx"),
    read("../src/mobile-performance.css"),
  ]);

  assert.match(hubSource, /const \[shouldLoadHub, setShouldLoadHub\] = useState\(false\)/);
  assert.match(hubSource, /void preloadLearningHub\(\);\s*setShouldLoadHub\(true\)/);
  assert.match(hubSource, /requestIdleCallback\(warmLearningHub/);
  assert.match(hubSource, /fallback={<LearningHubOpeningPlaceholder \/>}/);
  assert.match(hubSource, /data-clara-learning-hub-opening="true"/);
  assert.doesNotMatch(hubSource, /MutationObserver/);
  assert.doesNotMatch(hubSource, /document\.addEventListener\(\s*["']click/);

  assert.match(toggleSource, /data-clara-learning-hub-toggle="true"/);
  assert.match(soundSource, /button\[data-clara-learning-hub-toggle="true"\]/);
  assert.doesNotMatch(soundSource, /aria-label="Open Learning Hub\."/);
  assert.doesNotMatch(soundSource, /aria-label="Collapse Learning Hub\."/);
  assert.doesNotMatch(soundSource, /installed = true;\s*getLearningHubAudio\(\)/);

  assert.match(carouselSource, /touchAction:\s*"pan-y"/);
  assert.match(carouselSource, /onTouchMove={disableInteractions \? undefined : handleTouchMove}/);
  assert.doesNotMatch(carouselSource, /event\.preventDefault\s*\(/);
  assert.match(carouselSource, /cardDragRangeRef\.current = measureCardDragRange\(\)/);
  assert.match(carouselSource, /applyDragOffset\(deltaX \/ cardDragRangeRef\.current\)/);
  assert.match(carouselSource, /new IntersectionObserver/);
  assert.match(carouselSource, /visibilitychange/);
  assert.match(carouselSource, /disableAutoScroll/);
  assert.match(carouselSource, /disableInteractions/);

  assert.match(cardSource, /const BASE_CARD_WIDTH = 184/);
  assert.match(cardSource, /width: BASE_CARD_WIDTH/);
  assert.match(cardSource, /scale3d\(/);
  assert.match(cardSource, /willChange: isDragging \? "transform, opacity" : undefined/);
  assert.match(cardSource, /contain: "layout paint style"/);
  assert.doesNotMatch(
    mobilePerformanceSource,
    /\.clara-learning-hub-card\s*\{[^}]*will-change:\s*transform,\s*opacity/is,
  );

  assert.match(previewSource, /lazy\(\(\) =>\s*import\("\.\/ClaraGuideLearningHubPreviewLoaded"\)/);
  assert.doesNotMatch(previewSource, /useLearningHub/);
  assert.doesNotMatch(previewSource, /LearningHubCarousel/);
  assert.match(previewLoadedSource, /disableAutoScroll/);
  assert.match(previewLoadedSource, /disableInteractions/);

  assert.match(loadedSource, /LearningExperienceOpeningFallback/);
  assert.doesNotMatch(loadedSource, /<Suspense fallback={null}>/);
  assert.match(loadedSource, /preloadMaterialExperience\(item\)/);

  assert.match(overlaySource, /schedulePositionUpdate/);
  assert.match(overlaySource, /requestAnimationFrame/);
});
