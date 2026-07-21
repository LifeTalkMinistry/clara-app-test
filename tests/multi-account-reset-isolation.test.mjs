import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/lib/reset-local-clara-journey.js", import.meta.url),
  "utf8"
);

test("reset clears only the selected vault", () => {
  assert.match(source, /await clearLocalUserVault\(canonicalId\)/);
  assert.doesNotMatch(source, /LEGACY_LOCAL_IDS/);
  assert.doesNotMatch(source, /for \(const userId of localUserIds\)/);
});

test("reset preserves the account-vault directory", () => {
  assert.doesNotMatch(source, /clara_account_vault_directory_v1/);
  assert.doesNotMatch(source, /removeVaultMappingForAccount/);
});

test("reset avoids broad global private-key deletion", () => {
  assert.doesNotMatch(source, /ALWAYS_CLEAR_KEYS/);
  assert.doesNotMatch(source, /clearAccessSnapshot\(\)/);
  assert.doesNotMatch(source, /clearOfflineQueue\(\)/);
  assert.match(source, /clearScopedOfflineQueue\(storage, localUserId\)/);
  assert.match(source, /clearScopedAccessSnapshot\(storage, localUserId\)/);
});
