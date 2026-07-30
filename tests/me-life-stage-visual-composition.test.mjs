import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../src/me-life-stage-signal-gap-fix.css", import.meta.url),
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
    css,
    /> \[data-clara-pressure-signals="true"\]\s*\{[^}]*grid-row:\s*3/s
  );
  assert.match(
    css,
    /> section\[data-clara-trend-snapshot="true"\]\s*\{[^}]*grid-row:\s*5/s
  );
  assert.doesNotMatch(css, /margin-top:\s*-\d/);
  assert.doesNotMatch(css, /margin:\s*calc\([^)]*\*\s*-1/);
});

test("canonical data-scoped layout outranks legacy class-fragment patches", () => {
  assert.match(css, /data-clara-me-life-stage-root="true"/);
  assert.match(css, /:not\(#clara-me-legacy-layout\)/);
  assert.match(css, /height:\s*100%\s*!important/);
  assert.match(css, /min-height:\s*0\s*!important/);
});
