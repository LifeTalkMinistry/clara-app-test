import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "src/components/fresh/main-dashboard/shell/DashboardPanelRenderer.jsx",
  "utf8"
);

test("Committed access support routes users to the CLARA Facebook page", () => {
  assert.match(source, /Concerned about your access?/);
  assert.match(source, /Message us on the CLARA Facebook page./);
  assert.match(source, /Message CLARA/);
  assert.match(
    source,
    /https:\/\/www\.facebook\.com\/profile\.php\?id=61590352695488&sk=followers/
  );
});

test("the old manual membership refresh control is removed from the modal", () => {
  assert.doesNotMatch(source, /handleRefreshMembership/);
  assert.doesNotMatch(source, /RefreshCcw/);
  assert.doesNotMatch(source, /Already enrolled?/);
});
