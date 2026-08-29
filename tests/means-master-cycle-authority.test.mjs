import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("Means resolver gives explicit Master Pay Cycle priority over migration fallback", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.match(authority, /const explicitMasters = candidates\.filter\(isExplicitMaster\)/);
  assert.match(authority, /if \(explicitMasters\.length\) return cycles\[0\]/);
});

test("custom Master Pay Cycle repeats its declared cycle length", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.match(authority, /function resolveRepeatingCustomCycle/);
  assert.match(authority, /const lengthDays = financialDayDistance\(customCycle\.start, customCycle\.end\)/);
  assert.match(authority, /const cycleIndex = Math\.floor\(elapsedDays \/ lengthDays\)/);
  assert.match(authority, /const start = addFinancialDays\(customCycle\.start, cycleIndex \* lengthDays\)/);
});

test("non-explicit pay-cycle selection is documented as migration-only compatibility", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");
  assert.match(authority, /Migration compatibility only/);
});
