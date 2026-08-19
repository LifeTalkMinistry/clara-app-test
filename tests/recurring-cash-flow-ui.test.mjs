import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Schedule Bill fields are conditionally hidden for non-Bill categories", async () => {
  const source = await read(
    "src/components/fresh/main-dashboard/dashboard-panels/schedule/recurringScheduleDomEnhancer.js"
  );

  assert.match(source, /const isBill = category\?\.value === "Bill"/);
  assert.match(source, /controls\.hidden = !isBill/);
  assert.match(source, /Expected amount/);
  assert.match(source, /Automatically include in my budget/);
  assert.match(source, /Check budget impact/);
});

test("Budget recurrence controls appear only after the item is classified as a Bill", async () => {
  const source = await read(
    "src/components/fresh/main-dashboard/budget/recurringBudgetDomEnhancer.js"
  );

  assert.match(source, /const billSelected = itemType\.value === "bill"/);
  assert.match(source, /recurringToggle\.wrapper\.hidden = !billSelected/);
  assert.match(source, /details\.hidden = !billSelected \|\| !recurringToggle\.input\.checked/);
  assert.match(source, /Make this a recurring bill/);
  assert.match(source, /Automatically include in future budgets/);
});

test("Income cards no longer inject the saved usual timing as redundant card copy", async () => {
  const source = await read(
    "src/components/financial-carousel/cards/investment/ui/IncomeHubExpandedSurfaces.js"
  );

  assert.doesNotMatch(source, /BaseIncomeSourcePreviewRow/);
  assert.doesNotMatch(source, /Usually received:/);
  assert.doesNotMatch(source, /formatIncomeTimingLabel/);
  assert.match(source, /export \* from "\.\/IncomeHubExpandedSurfaces\.jsx"/);
});
