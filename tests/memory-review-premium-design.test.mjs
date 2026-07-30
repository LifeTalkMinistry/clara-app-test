import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const registry = fs.readFileSync("src/runtime/installClaraRuntimePatches.js", "utf8");
const css = fs.readFileSync("src/clara-memory-review-premium.css", "utf8");
const layoutCss = fs.readFileSync("src/clara-memory-review-layout-integrity.css", "utf8");
const headerActionsCss = fs.readFileSync("src/clara-memory-review-header-actions-position.css", "utf8");

test("Memory Review premium styles load after the memory runtime", () => {
  const runtimeIndex = registry.indexOf('import "../clara-assistant-memory-tab";');
  const onboardingIndex = registry.indexOf('import "../clara-onboarding-memory-review-bridge";');
  const premiumIndex = registry.indexOf('import "../clara-memory-review-premium.css";');
  const layoutIndex = registry.indexOf('import "../clara-memory-review-layout-integrity.css";');
  const headerActionsIndex = registry.indexOf('import "../clara-memory-review-header-actions-position.css";');

  assert.ok(runtimeIndex >= 0, "memory runtime import must remain installed");
  assert.ok(onboardingIndex > runtimeIndex, "onboarding memory bridge must remain after the runtime");
  assert.ok(premiumIndex > onboardingIndex, "premium presentation must load after memory behavior");
  assert.ok(layoutIndex > premiumIndex, "layout integrity rules must load after premium presentation");
  assert.ok(headerActionsIndex > layoutIndex, "header action positioning must load after other Memory styles");
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

test("Memory Review cards keep natural height inside the scrolling flex list", () => {
  assert.match(layoutCss, /\.clara-memory-review-list\s*\{/);
  assert.match(layoutCss, /overflow-y:\s*auto/);
  assert.match(layoutCss, />\s*\.clara-memory-context-intro/);
  assert.match(layoutCss, />\s*\.clara-memory-context-disclaimer/);
  assert.match(layoutCss, />\s*\.clara-memory-section/);
  assert.match(layoutCss, /flex:\s*0\s+0\s+auto/);
  assert.match(layoutCss, /max-height:\s*none/);
});

test("Memory Review header actions stay anchored to the top-right corner", () => {
  assert.match(headerActionsCss, /\.clara-memory-review-header\s*\{/);
  assert.match(headerActionsCss, /padding-right:\s*118px/);
  assert.match(headerActionsCss, /\.clara-memory-header-actions\s*\{/);
  assert.match(headerActionsCss, /position:\s*absolute/);
  assert.match(headerActionsCss, /top:\s*16px/);
  assert.match(headerActionsCss, /right:\s*16px/);
  assert.match(headerActionsCss, /justify-content:\s*flex-end/);
});

test("Memory Review premium layers stay presentation-only", () => {
  const presentationCss = `${css}\n${layoutCss}\n${headerActionsCss}`;
  assert.doesNotMatch(presentationCss, /MutationObserver/);
  assert.doesNotMatch(presentationCss, /localStorage/);
  assert.doesNotMatch(presentationCss, /innerHTML/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /max-width:\s*380px/);
});
