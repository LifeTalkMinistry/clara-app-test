import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  new URL("../src/components/fresh/main-dashboard/assistant/useClaraBuyCheckBudgetFlow.js", import.meta.url),
  "utf8",
);

test("Buy Check uses the strict expert flow and removes binary answers from chat transcript", () => {
  assert.match(source, /useClaraBuyCheckExpertFlow/);
  assert.match(source, /isSilentBinaryMessage/);
  assert.match(source, /\^\(yes\|no\)\$/i);
  assert.match(source, /conversationPhase:\s*"deterministic_intake"/);
});
