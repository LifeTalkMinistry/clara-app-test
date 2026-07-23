import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const dashboard = fs.readFileSync(
  "src/components/fresh/main-dashboard/shell/DashboardPanelRenderer.jsx",
  "utf8"
);
const welcomeSession = fs.readFileSync("src/pages/WelcomeSession.jsx", "utf8");

test("Committed invitation routes to the one-on-one scheduler", () => {
  assert.match(dashboard, /Schedule My Session/);
  assert.match(dashboard, /navigate\("\/welcome-session"\)/);
  assert.match(dashboard, /Already enrolled\? Refresh your access/);
  assert.doesNotMatch(dashboard, /cannot be activated with a password, code, role/);
});

test("Free users can select session slots without an activation loop", () => {
  assert.match(welcomeSession, /const isCommitmentSession = !hasCommittedAccess/);
  assert.match(welcomeSession, /disabled=\{!isAvailable\}/);
  assert.match(welcomeSession, /committed_first_session/);
  assert.doesNotMatch(welcomeSession, /Unlock monthly coaching/);
  assert.doesNotMatch(welcomeSession, /openCommittedVersionModal/);
});
