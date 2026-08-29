import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("Means reads Debt / Obligations from the same local finance owner as the Debt card", async () => {
  const source = await readFile(
    new URL("../src/lib/clara-means-authority.js", import.meta.url),
    "utf8"
  );

  assert.match(source, /getEffectiveDemoFinanceLocalUserId/);
  assert.match(source, /const debtOwner = getEffectiveDemoFinanceLocalUserId\(owner\);/);
  assert.match(source, /readAllDebtRecords\(debtOwner\)/);
  assert.doesNotMatch(source, /readAllDebtRecords\(owner\)/);

  // Keep the rest of the canonical financial owners unchanged. This repair is
  // intentionally scoped to the Debt / Obligation storage-owner divergence.
  assert.match(source, /getIncomeSources\(owner\)/);
  assert.match(source, /getWallets\(owner\)/);
});
