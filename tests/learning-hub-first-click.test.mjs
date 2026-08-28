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
    mobilePerformanceSource,
  ] = await Promise.all([
    read("../src/components/fresh/main-dashboard/learning-hub/LearningHub.jsx"),
    read("../src/components/fresh/main-dashboard/learning-hub/ui/LearningHubToggleButton.jsx"),
    read("../src/runtime/installLearningHubOpenSound.js"),
    read("../src/components/fresh/main-dashboard/learning-hub/ui/LearningHubCarousel.jsx"),
    read("../src/components/fresh/main-dashboard/learning-hub/ui/LearningMaterialCard.jsx"),
    read("../src/components/fresh/main-dashboard/learning-hub/LearningHubLoaded.jsx"),
    read("../src/mobile-performance.css"),
  ]);

  assert.match(hubSource, /const LearningHubLoaded = lazy\(loadLearningHubModule\)/);
  assert.match(hubSource, /void preloadLearningHub\(\);\s*onOpenHub\?\.\(\)/);
  assert.doesNotMatch(hubSource, /setShouldLoadHub/);
  assert.match(hubSource, /requestIdleCallback\(warmLearningHub/);
  assert.match(hubSource, /fallback={<LearningHubOpeningPlaceholder \/>}/);
  assert.doesNotMatch(hubSource, /MutationObserver/);

  assert.match(toggleSource, /data-clara-learning-hub-toggle="true"/);
  assert.match(soundSource, /button\[data-clara-learning-hub-toggle="true"\]/);

  assert.match(carouselSource, /touchAction:\s*"pan-y"/);
  assert.doesNotMatch(carouselSource, /event\.preventDefault\s*\(/);
  assert.match(carouselSource, /new IntersectionObserver/);
  assert.match(carouselSource, /visibilitychange/);

  assert.match(cardSource, /const BASE_CARD_WIDTH = 184/);
  assert.match(cardSource, /contain: "layout paint style"/);
  assert.doesNotMatch(
    mobilePerformanceSource,
    /\.clara-learning-hub-card\s*\{[^}]*will-change:\s*transform,\s*opacity/is,
  );

  assert.match(loadedSource, /LearningExperienceOpeningFallback/);
  assert.match(loadedSource, /preloadMaterialExperience\(item\)/);
});
