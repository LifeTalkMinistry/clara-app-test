import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  new URL("../src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayV2.jsx", import.meta.url),
  "utf8",
);

test("Buy Check re-enables controls when one binary prompt follows another", () => {
  assert.match(source, /setInteractionMode\(nextMode\);\s*setBinarySubmitting\(false\);/s);
  assert.doesNotMatch(source, /if \(nextMode !== "binary"\) setBinarySubmitting\(false\);/);
});
