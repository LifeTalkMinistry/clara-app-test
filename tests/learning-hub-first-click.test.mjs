import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read = (path) => fs.readFile(new URL(path, import.meta.url), "utf8");

test("Learning Hub first click has one React owner and visible loading feedback", async () => {
  const [hubSource, toggleSource, soundSource] = await Promise.all([
    read("../src/components/fresh/main-dashboard/learning-hub/LearningHub.jsx"),
    read("../src/components/fresh/main-dashboard/learning-hub/ui/LearningHubToggleButton.jsx"),
    read("../src/runtime/installLearningHubOpenSound.js"),
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
});
