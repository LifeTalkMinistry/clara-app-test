import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Add Income asks for a custom source name after category selection", async () => {
  const source = await readFile(
    new URL(
      "../src/components/fresh/main-dashboard/assistant/ClaraAddIncomeOverlayV2.jsx",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(source, /setSourceCategory\(category\)/);
  assert.match(source, /setSourceName\(""\)/);
  assert.match(source, /create-source-name/);
  assert.match(source, /What should we call this/);
  assert.doesNotMatch(source, /setSourceName\(category\)/);
  assert.doesNotMatch(source, /setSourceCategory\("Other Income"\)/);
});
