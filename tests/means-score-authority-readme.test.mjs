import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("Means repair documentation preserves plan-vs-actual separation", async () => {
  const doc = await readFile(new URL("../docs/means-score-authority-repair.md", import.meta.url), "utf8");
  assert.match(doc, /Actual transaction history never reconstructs, shrinks, or expands the 100 baseline/);
  assert.match(doc, /Time passage alone does not spend money/);
  assert.match(doc, /Buy Check simulations use the same numerator\/denominator truth/);
});
