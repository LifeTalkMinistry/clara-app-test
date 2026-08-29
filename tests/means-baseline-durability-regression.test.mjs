import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("Means protected baseline is stored in the private finance store, not only localStorage", async () => {
  const repository = await source("../src/lib/clara-means-baseline-repository.js");
  const authority = await source("../src/lib/clara-means-authority.js");

  assert.match(repository, /LOCAL_FINANCE_STORES\.privatePreferences/);
  assert.match(repository, /getLocalRecordById/);
  assert.match(repository, /upsertLocalRecord/);
  assert.match(repository, /means_cycle_baseline/);
  assert.match(repository, /One-way migration/);
  assert.match(repository, /localStorage/);

  assert.match(authority, /await readMeansCycleBaseline\(/);
  assert.match(authority, /await persistMeansCycleBaseline\(/);
  assert.doesNotMatch(authority, /function readStoredBaseline/);
  assert.doesNotMatch(authority, /function persistBaseline/);
});

test("existing CLARA vault snapshots include the private-preferences store carrying Means history", async () => {
  const cloudVault = await source("../src/lib/cloud-vault-snapshot.js");
  const deviceVault = await source("../src/lib/device-transfer-vault.js");

  assert.match(cloudVault, /LOCAL_FINANCE_PRIVATE_STORE_NAMES/);
  assert.match(cloudVault, /getAllLocalRecordsForStore/);
  assert.match(deviceVault, /LOCAL_FINANCE_PRIVATE_STORE_NAMES/);
  assert.match(deviceVault, /restoreLocalFinanceStoreRecords/);
});
