import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Protect the Settings-only top spacing from future layout regressions.
const settingsCleanupCss = await readFile(
  new URL("../src/settings-cleanup.css", import.meta.url),
  "utf8"
);

test("active Settings lowers the shared header group without affecting other panels", () => {
  assert.match(
    settingsCleanupCss,
    /\.theme-page-shell > div\.relative\.shrink-0:has\(button\[aria-label="Settings"\]\[aria-current="page"\]\)/
  );
  assert.match(settingsCleanupCss, /margin-top:\s*10px;/);
});
