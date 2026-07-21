import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Protect the Settings-only content spacing from future layout regressions.
const settingsCleanupCss = await readFile(
  new URL("../src/settings-cleanup.css", import.meta.url),
  "utf8"
);

test("active Settings lowers its content below the shared top navigation", () => {
  assert.match(
    settingsCleanupCss,
    /div\.relative\.shrink-0:has\(button\[aria-label="Settings"\]\[aria-current="page"\]\) \+ \.clara-dashboard-content/
  );
  assert.match(settingsCleanupCss, /margin-top:\s*24px\s*!important;/);
});
