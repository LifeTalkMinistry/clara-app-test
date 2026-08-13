import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const settings = readSource(
  "src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx"
);
const notifications = readSource("src/components/notifications/NotificationSettingsPanel.jsx");
const taskCard = readSource("src/components/TaskReminderSettingsCard.jsx");
const runtime = readSource("src/runtime/installClaraRuntimePatches.js");

const retiredVisualFiles = [
  "src/settings-cleanup.css",
  "src/settings-priority.css",
  "src/settings-support-compose.css",
  "src/settings-official-brand-theme.css",
  "src/settings-community-brand-fix.css",
];

test("Settings visual authority is React-owned and legacy theme layers are retired", () => {
  retiredVisualFiles.forEach((file) => {
    assert.equal(existsSync(new URL(`../${file}`, import.meta.url)), false);
    assert.doesNotMatch(
      runtime,
      new RegExp(file.split("/").at(-1).replaceAll(".", "\\."))
    );
  });

  for (const source of [settings, notifications, taskCard]) {
    assert.doesNotMatch(source, /emerald-|violet-|teal-/);
  }

  assert.match(settings, /#0867ff/);
  assert.match(settings, /#19b5ff/);
  assert.match(settings, /#ffd84a/);
  assert.match(settings, /#f32645/);
});
