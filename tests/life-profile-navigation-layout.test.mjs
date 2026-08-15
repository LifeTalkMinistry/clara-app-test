import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Life Profile trigger is owned by the Buy Check viewport, not the Buy Check card", () => {
  const source = read("../src/components/fresh/main-dashboard/assistant/ClaraLifeProfilePortal.jsx");

  assert.match(source, /OVERLAY_SELECTOR = '\[data-clara-pause-overlay="true"\]'/);
  assert.doesNotMatch(source, /BOARD_SELECTOR/);
  assert.match(source, /left-3 top-\[10px\]/);
  assert.match(source, /onBeforeOpen\?\.\(\)/);
  assert.match(source, /navigate\("\/profile\?view=life-context"/);
});

test("Life Profile route is isolated as a fully opaque viewport surface", () => {
  const source = read("../src/pages/Profile.jsx");

  assert.match(source, /data-clara-life-profile-viewport="true"/);
  assert.match(source, /fixed inset-0 h-\[100dvh\] w-full overflow-y-auto bg-\[#020714\]/);
  assert.match(source, /zIndex: 2147483500/);
});

test("opening Buy Check is top-anchored while Life Profile control is active", () => {
  const source = read("../src/components/fresh/main-dashboard/assistant/ClaraLifeProfilePortal.jsx");

  assert.match(source, /justify-content: flex-start !important/);
  assert.match(source, /data-clara-ai-message-viewport/);
});
