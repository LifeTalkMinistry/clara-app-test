import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("returning Add Income users get an action menu instead of being forced into money entry", async () => {
  const source = await readFile(
    new URL(
      "../src/components/fresh/main-dashboard/assistant/ClaraAddIncomeOverlayV2.jsx",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(source, /What would you like to do with Income Hub\?/);
  assert.match(source, /"income-home"/);
  assert.match(source, /data-clara-income-home="true"/);
  assert.match(source, />Add money</);
  assert.match(source, />Create another income source</);
  assert.match(source, /const beginAddMoney = \(\) =>/);
  assert.match(source, /const beginCreateAnotherSource = \(\) =>/);

  assert.doesNotMatch(
    source,
    /if \(nextSources\.length === 1\)[\s\S]*?How much money came in\?/
  );
});
