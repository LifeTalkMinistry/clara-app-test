import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const registry = fs.readFileSync("src/runtime/installClaraRuntimePatches.js", "utf8");
const css = fs.readFileSync("src/clara-memory-review-premium.css", "utf8");

test("Memory Review premium stylesheet loads after the memory runtime", () => {
  const runtimeIndex = registry.indexOf('import "../clara-assistant-memory-tab";');
  const onboardingIndex = registry.indexOf('import "../clara-onboarding-memory-review-bridge";');
  const premiumIndex = registry.indexOf('import "../clara-memory-review-premium.css";');

  assert.ok(runtimeIndex >= 0, "memory runtime import must remain installed");
  assert.ok(onboardingIndex > runtimeIndex, "onboarding memory bridge must remain after the runtime");
  assert.ok(premiumIndex > onboardingIndex, "premium presentation must load after memory behavior");
});

test("Memory Review uses scoped premium hierarchy for review and edit modes", () => {
  assert.match(css, /:is\(#clara-assistant-memory-panel, #clara-assistant-memory-edit-panel\)/);
  assert.match(css, /#clara-assistant-memory-panel/);
  assert.match(css, /#clara-assistant-memory-edit-panel/);
  assert.match(css, /\.clara-memory-review-header/);
  assert.match(css, /\.clara-memory-context-intro/);
  assert.match(css, /\.clara-memory-section/);
  assert.match(css, /\.clara-memory-edit-message\.assistant/);
  assert.match(css, /\.clara-memory-edit-form/);
  assert.match(css, /100svh/);
});

test("Memory cards preserve onboarding and empty-state presentation", () => {
  assert.match(css, /#clara-onboarding-memory-review-section/);
  assert.match(css, /\.clara-memory-section\.is-empty/);
  assert.match(css, /\.clara-memory-section-empty-line/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
});

test("Memory Review premium layer stays presentation-only", () => {
  assert.doesNotMatch(css, /MutationObserver/);
  assert.doesNotMatch(css, /localStorage/);
  assert.doesNotMatch(css, /innerHTML/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /max-width:\s*380px/);
});
