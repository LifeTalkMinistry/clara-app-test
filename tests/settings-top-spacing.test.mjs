import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const communitySource = await readFile(
  new URL("../src/pages/Community.jsx", import.meta.url),
  "utf8"
);

test("Community shell owns Settings scrolling and outer spacing only", () => {
  const settingsBranch = communitySource.match(
    /activeView === "settings"[\s\S]{0,1200}?<DashboardSettingsPanel/
  )?.[0] || "";
  assert.match(settingsBranch, /clara-community-settings-view/);
  assert.match(settingsBranch, /overflow-y-auto/);
  assert.match(settingsBranch, /px-4/);
  assert.match(settingsBranch, /bg-\[#040b18\]/);
  assert.doesNotMatch(settingsBranch, /rgba\(79,70,229|rgba\(20,184,166/);
});
