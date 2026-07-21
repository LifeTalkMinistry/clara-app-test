import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const vaultMigration = readFileSync(
  new URL("../src/lib/local-vault-migration.js", import.meta.url),
  "utf8"
);
const identityMigration = readFileSync(
  new URL("../src/lib/local-identity-storage-migration.js", import.meta.url),
  "utf8"
);

test("ownership migration only considers explicit legacy vault IDs", () => {
  assert.match(vaultMigration, /KNOWN_TEMPORARY_IDS = \["local-dev-user", "local-user"\]/);
  assert.doesNotMatch(vaultMigration, /most_recent_populated_vault/);
  assert.doesNotMatch(vaultMigration, /ACCESS_SNAPSHOT_LAST_KEY/);
  assert.doesNotMatch(vaultMigration, /ACTIVE_MEMORY_USER_KEY/);
});

test("linked source metadata is rejected before migration", () => {
  assert.match(vaultMigration, /sourceMetadata\?\.accountUserId/);
  assert.match(vaultMigration, /sourceMetadata\?\.linkStatus === "linked"/);
  assert.match(vaultMigration, /legacy_source_is_account_linked/);
});

test("migration markers are scoped to source and destination", () => {
  assert.match(vaultMigration, /markerKey\(sourceId, targetId\)/);
  assert.match(vaultMigration, /sourceId}->\$\{targetId\}/);
});

test("identity storage migration never adopts an arbitrary previous active vault", () => {
  assert.match(identityMigration, /LEGACY_IDS\.includes\(oldActiveId\)/);
  assert.doesNotMatch(identityMigration, /\.\.\.LEGACY_IDS, oldActiveId/);
});
