import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Buy Check preserves the existing runtime behind a ready-to-chat gate", async () => {
  const wrapper = await source("src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayV2.jsx");
  const core = await source("src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayCore.jsx");

  assert.match(wrapper, /Ready to chat now\?/);
  assert.match(wrapper, /Hi! What are you thinking about buying\?/);
  assert.match(wrapper, /data-clara-buy-check-ready-gate/);
  assert.match(wrapper, /data-clara-buy-check-react-form/);
  assert.match(wrapper, /data-clara-buy-check-opening-board/);
  assert.match(wrapper, /Type the item you want to buy/);
  assert.match(wrapper, /ClaraAiEnvironmentOverlayCore/);

  assert.match(core, /data-clara-buy-check-opening-board="true"/);
  assert.match(core, /CanonicalTypewriter/);
  assert.match(core, /useClaraBuyCheckFlow/);
});
