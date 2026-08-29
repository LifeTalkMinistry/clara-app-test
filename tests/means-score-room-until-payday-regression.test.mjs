import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("Room until payday uses remaining commitments, not the protected Means denominator", async () => {
  const authority = await source("../src/lib/clara-means-authority.js");

  assert.match(authority, /scoreRoom:\s*scoreState\.scoreRoom/);
  assert.match(authority, /projectedRoom:\s*availableNow\s*-\s*upcoming/);
  assert.doesNotMatch(authority, /projectedRoom:\s*scoreState\.scoreRoom/);
});
