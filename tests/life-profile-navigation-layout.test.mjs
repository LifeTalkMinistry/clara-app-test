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

test("Life Profile route is portaled outside Layout as a fully opaque viewport", () => {
  const source = read("../src/pages/Profile.jsx");

  assert.match(source, /createPortal/);
  assert.match(source, /document\.body/);
  assert.match(source, /data-clara-life-profile-viewport="true"/);
  assert.match(source, /background: "#020714"/);
  assert.match(source, /zIndex: 2147483500/);
});

test("Life Profile brand rail can never expand beyond three pixels", () => {
  const source = read("../src/pages/Profile.jsx");

  assert.match(source, /data-clara-life-profile-page="true"\] > div:first-child/);
  assert.match(source, /height: 3px !important/);
  assert.match(source, /min-height: 3px !important/);
  assert.match(source, /max-height: 3px !important/);
  assert.match(source, /flex: 0 0 3px !important/);
});

test("opening Buy Check is top-anchored while Life Profile control is active", () => {
  const source = read("../src/components/fresh/main-dashboard/assistant/ClaraLifeProfilePortal.jsx");

  assert.match(source, /justify-content: flex-start !important/);
  assert.match(source, /data-clara-ai-message-viewport/);
});
