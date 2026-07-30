import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("src/pages/MonthlyBudgetPlan.jsx", "utf8");

test("active Budget manager uses the premium page hierarchy", () => {
  assert.match(source, /data-clara-budget-premium="true"/);
  assert.match(source, /Plan every peso with purpose/);
  assert.match(source, /grid grid-cols-3 gap-2\.5 p-4/);
  assert.match(source, /Budget categories/);
});

test("Budget category cards expose real cycle progress", () => {
  assert.match(source, /const progress = allocated > 0/);
  assert.match(source, /style=\{\{ width: `\$\{fulfilledDebt \? 100 : progress\}%` \}\}/);
  assert.match(source, /progress\.toFixed\(0\)/);
  assert.match(source, /remaining/);
});

test("premium redesign preserves the existing management actions", () => {
  for (const token of ["onStartEdit", "onRemove", "saveItem", "addItem", "saveProtectedEdits", "resetPlan"]) {
    assert.match(source, new RegExp(token));
  }
});
