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
  assert.match(repository, /Promote the exact baseline object without changing its schema\/version/);
  assert.match(repository, /IndexedDB remains authoritative/);
  assert.match(repository, /localStorage/);

  assert.match(authority, /await readMeansCycleBaseline\(/);
  assert.match(authority, /await persistMeansCycleBaseline\(/);
  assert.doesNotMatch(authority, /function readStoredBaseline/);
  assert.doesNotMatch(authority, /function persistBaseline/);
});

test("existing CLARA vault snapshots include the private-preferences store carrying Means history", async () => {
  const cloudVault = await source("../src/lib/cloud-vault-snapshot.js");
  const localExport = await source("../src/lib/local-data-export.js");
  const localFinance = await source("../src/lib/localFinanceStore.js");

  // Cloud snapshots consume the full local-data export and retain all user-owned
  // clara_local_finance stores except metadata; privatePreferences therefore travels
  // through the same generic store export/restore path instead of being special-cased.
  assert.match(cloudVault, /buildClaraLocalDataExport/);
  assert.match(cloudVault, /database\.name === "clara_local_finance" && storeName === "metadata"/);
  assert.match(cloudVault, /Object\.entries\(database\?\.stores \|\| \{\}\)/);
  assert.match(localExport, /clara_local_finance/);
  assert.match(localFinance, /privatePreferences/);
});
