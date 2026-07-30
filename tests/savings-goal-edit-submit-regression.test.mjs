import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("src/pages/SavingsGoalsIntegrated.jsx", "utf8");

test("Savings Goal edit uses a real form submit with a mobile touch fallback", () => {
  assert.match(source, /function GoalFormDialog/);
  assert.match(source, /<form[\s\S]*onSubmit=/);
  assert.match(source, /data-savings-goal-submit/);
  assert.match(source, /onPointerUp=/);
  assert.match(source, /type="submit"/);
  assert.match(source, /role="alert"/);
  assert.match(source, /pointer-events-auto touch-manipulation/);
});
