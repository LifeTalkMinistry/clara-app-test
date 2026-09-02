import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("creating an income source does not force an immediate money entry", async () => {
  const source = await readFile(
    new URL(
      "../src/components/fresh/main-dashboard/assistant/ClaraAddIncomeOverlayV2.jsx",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(
    source,
    /Would you like to add money now, create a Wallet, create another income source, or are you done\?/
  );
  assert.match(source, /"source-created-choice"/);
  assert.match(source, /data-clara-income-source-created-choice="true"/);
  assert.match(source, />Add money now</);
  assert.match(source, />Create a Wallet</);
  assert.match(source, />Create another income source</);
  assert.match(source, />Done</);
  assert.match(source, /addMoneyAfterSourceCreation/);
  assert.match(source, /createStandaloneWalletAfterSourceCreation/);
  assert.match(source, /standalone: true/);
  assert.match(source, /amount: 0/);
  assert.match(source, /beginCreateAnotherSource/);
});