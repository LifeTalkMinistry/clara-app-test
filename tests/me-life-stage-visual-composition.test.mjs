import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../src/me-life-stage-signal-gap-fix.css", import.meta.url),
  "utf8"
);
const pressureSpacingCss = readFileSync(
  new URL("../src/me-life-stage-pressure-dock-spacing.css", import.meta.url),
  "utf8"
);
const runtimeRegistry = readFileSync(
  new URL("../src/runtime/installClaraRuntimePatches.js", import.meta.url),
  "utf8"
);

test("Me visual composition uses bounded inherited rows instead of a flexible spacer", () => {
  assert.match(
    css,
    /minmax\(var\(--clara-life-hero-min\),\s*var\(--clara-life-hero-max\)\)/
  );
  assert.match(css, /minmax\(var\(--clara-life-support-min\),\s*auto\)/);
  assert.match(css, /align-content:\s*start\s*!important/);
  assert.doesNotMatch(
    css,
    /minmax\(var\(--clara-life-hero-min\),\s*1fr\)/
  );
  assert.doesNotMatch(css, /100svh\s*-/);
});

test("hero and support card overlap through explicit CSS Grid ownership", () => {
  assert.match(css, /> section:first-of-type\s*\{[^}]*grid-row:\s*1\s*\/\s*3/s);
  assert.match(
    css,
    /> section\[data-clara-support-card="true"\]\s*\{[^}]*grid-row:\s*2/s
  );
  assert.match(
    pressureSpacingCss,
    /> \[data-clara-pressure-signals="true"\]\s*\{[^}]*grid-row:\s*3/s
  );
  assert.match(
    pressureSpacingCss,
    /> section\[data-clara-trend-snapshot="true"\]\s*\{[^}]*grid-row:\s*4/s
  );
  assert.doesNotMatch(css, /margin-top:\s*-\d/);
  assert.doesNotMatch(css, /margin:\s*calc\([^)]*\*\s*-1/);
});

test("pressure dock is centered inside one slot with equal space above and below", () => {
  assert.match(
    pressureSpacingCss,
    /calc\(\s*var\(--clara-life-pressure-dock-height\)\s*\+\s*var\(--clara-life-signal-snapshot-gap\)\s*\+\s*var\(--clara-life-signal-snapshot-gap\)\s*\)/s
  );
  assert.match(
    pressureSpacingCss,
    /> \[data-clara-pressure-signals="true"\]\s*\{[^}]*align-self:\s*center\s*!important/s
  );
  assert.doesNotMatch(pressureSpacingCss, /transform:|top:\s*-?\d|margin-(?:top|bottom):\s*-/);

  const canonicalIndex = runtimeRegistry.indexOf('import "../me-life-stage-signal-gap-fix.css";');
  const spacingIndex = runtimeRegistry.indexOf('import "../me-life-stage-pressure-dock-spacing.css";');
  assert.ok(canonicalIndex >= 0);
  assert.ok(spacingIndex > canonicalIndex);
});

test("canonical data-scoped layout outranks legacy class-fragment patches", () => {
  assert.match(css, /data-clara-me-life-stage-root="true"/);
  assert.match(css, /:not\(#clara-me-legacy-layout\)/);
  assert.match(css, /height:\s*100%\s*!important/);
  assert.match(css, /min-height:\s*0\s*!important/);
});
