import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("Challenge Hub hero and information dialog are React-owned", () => {
  const challenges = read("src/pages/Challenges.jsx");

  assert.match(challenges, /data-challenge-hub-hero/);
  assert.match(challenges, /Consistency builds financial strength\./);
  assert.match(challenges, /isChallengeHubInfoOpen/);
  assert.match(challenges, /challenge-hub-info-trigger/);
  assert.match(challenges, /role="dialog"/);
  assert.match(challenges, /aria-modal="true"/);
  assert.match(challenges, /Consistency is the advantage\./);
  assert.match(challenges, /Small actions, repeated well, become financial strength\./);
  assert.match(challenges, /event\.key !== "Escape"/);
  assert.match(challenges, /event\.target === event\.currentTarget/);
  assert.doesNotMatch(challenges, /document\.createElement/);
  assert.doesNotMatch(challenges, /MutationObserver/);
  assert.doesNotMatch(challenges, /Consistency wins here\./);
});

test("retired Challenge Hub DOM mutator has no remaining loader or source file", () => {
  const runtimeLoader = read("src/runtime/installChallengeStreakTracking.js");

  assert.doesNotMatch(runtimeLoader, /installChallengeHeroRefinement/);
  assert.match(runtimeLoader, /installMonthlyMissionRuntime/);
  assert.equal(
    fs.existsSync(path.join(root, "src/runtime/installChallengeHeroRefinement.js")),
    false,
  );
});

test("official Challenge theme owns presentation without the old generic hero-child patch", () => {
  const css = read("src/challenges-official-brand-theme.css");

  assert.match(css, /\[data-challenge-hub-hero\] \.challenge-hub-info-trigger/);
  assert.match(css, /\.challenge-hub-info-backdrop/);
  assert.match(css, /\.challenge-hub-info-dialog/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.doesNotMatch(css, /section:first-child > div\.relative > div:first-child/);
});

test("challenge progress, cadence, and race authorities remain present", () => {
  const challenges = read("src/pages/Challenges.jsx");
  const runtimeLoader = read("src/runtime/installChallengeStreakTracking.js");

  assert.match(challenges, /WeeklyMiniStreakCard/);
  assert.match(challenges, /const joinChallenge = \(\) =>/);
  assert.match(challenges, /const checkIn = \(\) =>/);
  assert.match(challenges, /function MonthlyDrawCard\(/);
  assert.match(runtimeLoader, /RACE_BOARD_HOST_ID/);
});
