import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

test("support bubble is not mounted anywhere on the onboarding tutorial route", () => {
  assert.match(
    appSource,
    /const shouldRenderSupportBubble = location\.pathname !== "\/onboarding";/,
    "App shell should treat /onboarding as an immersive surface without the global support bubble"
  );

  assert.match(
    appSource,
    /\{shouldRenderSupportBubble \? <SupportClaraBubble user=\{user\} \/> : null\}/,
    "SupportClaraBubble should be gated by the onboarding route guard"
  );

  assert.doesNotMatch(
    appSource,
    /\n\s*<SupportClaraBubble user=\{user\} \/>\s*\n/,
    "SupportClaraBubble must not be mounted unconditionally"
  );
});
