import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [settingsSource, inAppAdminSource] = await Promise.all([
  read("src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx"),
  read("src/pages/AdminPanel.jsx"),
]);

test("normal CLARA Settings does not expose the legacy in-app Admin Panel", () => {
  assert.doesNotMatch(settingsSource, /title:\s*"Admin Panel"/);
  assert.doesNotMatch(settingsSource, /description:\s*"Manage users, access, and CLARA controls"/);
});

test("the in-app legacy admin no longer owns CLARA Board publishing", () => {
  assert.doesNotMatch(inAppAdminSource, /AdminCommunityBoardSection/);
  assert.doesNotMatch(inAppAdminSource, /components\/admin\/AdminCommunityBoardSection/);
});
