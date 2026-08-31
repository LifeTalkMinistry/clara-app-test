import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Buy Check explicitly asks for the exact item name", async () => {
  const overlay = await source("src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayV2.jsx");
  assert.match(overlay, /What exact item are you thinking about buying\?/);
  assert.match(overlay, /Type the exact name of the item/);
  assert.match(overlay, /Type the exact item name/);
});

test("binary Buy Check questions use Yes and No controls instead of the composer", async () => {
  const overlay = await source("src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayV2.jsx");
  assert.match(overlay, /data-clara-buy-check-binary-controls/);
  assert.match(overlay, /submitChoice\("Yes"\)/);
  assert.match(overlay, /submitChoice\("No"\)/);
  assert.match(overlay, /data-clara-buy-check-interaction-mode="binary"/);
});

test("price-only Buy Check entry requests a numeric mobile keyboard and blocks letters", async () => {
  const overlay = await source("src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayV2.jsx");
  assert.match(overlay, /inputmode", "decimal"/);
  assert.match(overlay, /\[0-9\.,\]\*/);
  assert.match(overlay, /beforeinput/);
});

test("missing Means setup routes the user to Income Hub", async () => {
  const overlay = await source("src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayV2.jsx");
  assert.match(overlay, /financialSetupIsMissing/);
  assert.match(overlay, /Start financial setup/);
  assert.match(overlay, /data-card-key=\\"investmentFund\\"/);
  assert.match(overlay, /data-clara-finance-expand-toggle/);
});

test("strict intake copy no longer tells users to type Yes or No", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");
  assert.doesNotMatch(flow, /Reply Yes or No/);
  assert.match(flow, /Is that the exact item\?/);
  assert.match(flow, /Is that correct\?/);
});
