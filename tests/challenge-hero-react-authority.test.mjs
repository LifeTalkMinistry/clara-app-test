import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("Challenge Hub hero and Information dialog are React-owned", () => {
  const source = read("src/pages/Challenges.jsx");
  assert.match(source, /function ChallengeHubHero\(/);
  assert.match(source, /function ChallengeHubInfoDialog\(/);
  assert.match(source, /isChallengeHubInfoOpen/);
  assert.match(source, /Consistency builds financial strength\./);
  assert.match(source, /Consistency is the advantage\./);
  assert.match(source, /Small actions, repeated well, become financial strength\./);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /event\.key !== "Escape"/);
  assert.match(source, /event\.target === event\.currentTarget/);
  assert.doesNotMatch(source, /document\.createElement/);
  assert.doesNotMatch(source, /MutationObserver/);
  assert.doesNotMatch(source, /Consistency wins here\./);
});

test("retired hero refinement has no active source file or loader reference", () => {
  const loader = read("src/runtime/installChallengeStreakTracking.js");
  assert.doesNotMatch(loader, /installChallengeHeroRefinement/);
  assert.equal(fs.existsSync(path.join(root, "src/runtime/installChallengeHeroRefinement.js")), false);
});

test("official Challenge theme centers the React-owned information dialog", () => {
  const css = read("src/challenges-official-brand-theme.css");
  assert.match(css, /official presentation authority/);
  assert.match(css, /\.clara-challenge-hub-hero__info/);
  assert.match(css, /\.clara-challenge-hub-info-backdrop/);
  assert.match(css, /\.clara-challenge-hub-info-dialog/);
  assert.match(css, /align-items: center/);
  assert.match(css, /justify-content: center/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /width: min\(100%,430px\)/);
});
