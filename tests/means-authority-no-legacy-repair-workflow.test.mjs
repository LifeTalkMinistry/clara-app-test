import assert from "node:assert/strict";
import test from "node:test";
import { access, readFile } from "node:fs/promises";

async function exists(path) {
  try {
    await access(new URL(path, import.meta.url));
    return true;
  } catch {
    return false;
  }
}

test("legacy self-modifying Means repair workflows are removed", async () => {
  assert.equal(await exists("../.github/workflows/repair-schedule-impact.yml"), false);
  assert.equal(await exists("../.github/workflows/verify-apply-financial-integrity-repair.yml"), false);
  assert.equal(await exists("../.github/workflows/fix-program-prompt-controller-wire.yml"), false);
});

test("Means verification workflow is read-only and runs committed source", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/means-authority-verification.yml", import.meta.url),
    "utf8"
  );
  assert.match(workflow, /contents:\s*read/);
  assert.doesNotMatch(workflow, /contents:\s*write/);
  assert.doesNotMatch(workflow, /git push|fix_means_fixed_full_cycle_anchor|fix_remaining_full_suite/);
});
