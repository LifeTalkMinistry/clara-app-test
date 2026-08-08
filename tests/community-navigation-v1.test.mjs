import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const navStateSource = readSource(
  "src/components/fresh/main-dashboard/shell/useDashboardPanelUiState.js"
);
const navControllerSource = readSource(
  "src/components/fresh/main-dashboard/top-nav/DashboardTopNavController.jsx"
);
const communitySource = readSource("src/pages/Community.jsx");
const profileSource = readSource("src/pages/Profile.jsx");

test("primary CLARA navigation is Home, Community, Schedule, Settings", () => {
  const homeIndex = navStateSource.indexOf('key: "home"');
  const communityIndex = navStateSource.indexOf('key: "community"');
  const scheduleIndex = navStateSource.indexOf('key: "schedule"');
  const settingsIndex = navStateSource.indexOf('key: "settings"');

  assert.ok(homeIndex >= 0);
  assert.ok(communityIndex > homeIndex);
  assert.ok(scheduleIndex > communityIndex);
  assert.ok(settingsIndex > scheduleIndex);
  assert.match(navStateSource, /label: "Community"/);
  assert.doesNotMatch(navStateSource, /key: "me",\s*label: "Me"/);
});

test("Community opens as a dedicated route while Guide Mode can still reach legacy Me", () => {
  assert.match(navControllerSource, /selection === "community"/);
  assert.match(navControllerSource, /navigate\("\/community"\)/);
  assert.match(navControllerSource, /rawItem\.key === "community"/);
  assert.match(navControllerSource, /key: "me"/);
  assert.match(navControllerSource, /openDashboardPanel\("me"\)/);
});

test("Community keeps dashboard exit, private messages, and Profile within reach", () => {
  assert.match(communitySource, /fixed inset-0/);
  assert.match(communitySource, /navigate\("\/dashboard"\)/);
  assert.match(communitySource, /to="\/messages"/);
  assert.match(communitySource, /\/messages\?userId=/);
  assert.match(communitySource, /to="\/profile"/);
  assert.match(communitySource, /ME lives here now/);
  assert.match(communitySource, /community_posts/);
  assert.match(communitySource, /community_comments/);
});

test("existing Me information remains preserved on Profile", () => {
  assert.match(profileSource, /CLARA PROFILE/);
  assert.match(profileSource, />Me<\/h1>/);
  assert.match(profileSource, /Financial Climate/);
  assert.match(profileSource, /clara_life_setup/);
});
