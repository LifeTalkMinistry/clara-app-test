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

test("Master Pay Cycle repository atomically keeps one selected source", async () => {
  const repository = await source("../src/lib/clara-master-pay-cycle-repository.js");

  assert.match(repository, /runLocalFinanceTransaction/);
  assert.match(repository, /const selected = String\(source\.id\) === targetId/);
  assert.match(repository, /isMasterPayCycle: selected/);
  assert.match(repository, /is_master_pay_cycle: selected/);
});

test("deleting the active Master requires another existing source", async () => {
  const repository = await source("../src/lib/clara-master-pay-cycle-repository.js");
  const surfaces = await source("../src/components/financial-carousel/cards/investment/ui/IncomeHubExpandedSurfaces.jsx");

  assert.match(repository, /MASTER_PAY_CYCLE_REPLACEMENT_REQUIRED/);
  assert.match(repository, /Select another existing income source as Master Pay Cycle/);
  assert.match(surfaces, /Choose another Master first/);
});

test("Income Hub exposes Customize Cycle and warns before cycle-impacting changes", async () => {
  const modal = await source("../src/components/financial-carousel/cards/investment/ui/IncomeSourceCreateModalBase.jsx");

  assert.match(modal, /Master Pay Cycle/);
  assert.match(modal, /Customize Cycle/);
  assert.match(modal, /customCycleStart/);
  assert.match(modal, /customCycleEnd/);
  assert.match(modal, /Change the active financial cycle\?/);
  assert.match(modal, /current 100 and Means Score/);
  assert.match(modal, /Historical transactions and actual due dates will not be rewritten/);
  assert.match(modal, /income amount itself does not enter the Means Score/);
});
