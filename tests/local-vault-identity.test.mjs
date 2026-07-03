import test from "node:test";
import assert from "node:assert/strict";
import {
  LEGACY_LOCAL_VAULT_ID,
  isTemporaryLocalAuthUser,
  resolveLocalVaultId,
} from "../src/lib/localVaultIdentity.js";

test("preserves the legacy local-dev-user vault when records exist", () => {
  const vaultId = resolveLocalVaultId({
    ownerCounts: { [LEGACY_LOCAL_VAULT_ID]: 5, "real-user-id": 2 },
    createId: () => "vault_new",
  });
  assert.equal(vaultId, LEGACY_LOCAL_VAULT_ID);
});

test("creates a device vault for a fresh installation", () => {
  const vaultId = resolveLocalVaultId({ ownerCounts: {}, createId: () => "vault_unique" });
  assert.equal(vaultId, "vault_unique");
});

test("keeps a persisted vault unchanged across auth identity changes", () => {
  const beforeLogin = resolveLocalVaultId({ persistedVaultId: "vault_stable" });
  const afterLogin = resolveLocalVaultId({
    persistedVaultId: beforeLogin,
    ownerCounts: { "supabase-user-id": 10 },
    candidateOwnerIds: ["supabase-user-id"],
  });
  const afterLogout = resolveLocalVaultId({ persistedVaultId: afterLogin });
  assert.equal(beforeLogin, "vault_stable");
  assert.equal(afterLogin, "vault_stable");
  assert.equal(afterLogout, "vault_stable");
});

test("preserves an older authenticated owner when it is the only existing vault", () => {
  const vaultId = resolveLocalVaultId({
    ownerCounts: { "existing-supabase-owner": 7 },
    candidateOwnerIds: ["existing-supabase-owner"],
    createId: () => "vault_new",
  });
  assert.equal(vaultId, "existing-supabase-owner");
});

test("temporary local identity is not treated as a genuine account", () => {
  assert.equal(isTemporaryLocalAuthUser({ id: "local-dev-user" }), true);
  assert.equal(isTemporaryLocalAuthUser({ email: "local@clara.app" }), true);
  assert.equal(isTemporaryLocalAuthUser({ id: "real-user", email: "max@example.com" }), false);
});
