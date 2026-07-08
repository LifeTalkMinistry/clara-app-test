import test from "node:test";
import assert from "node:assert/strict";
import {
  isTemporaryLocalAuthUser,
  resolveLocalVaultId,
} from "../src/lib/localVaultIdentity.js";

test("does not promote the temporary local-dev-user identity", () => {
  const vaultId = resolveLocalVaultId({
    ownerCounts: { "local-dev-user": 5, "real-user-id": 2 },
    createId: () => "vault_new",
  });
  assert.equal(vaultId, "real-user-id");
});

test("creates a device vault for a fresh installation", () => {
  const vaultId = resolveLocalVaultId({ ownerCounts: {}, createId: () => "vault_unique" });
  assert.equal(vaultId, "vault_unique");
});

test("keeps a persisted vault unchanged across identity changes", () => {
  const before = resolveLocalVaultId({ persistedVaultId: "vault_stable" });
  const afterCandidateChange = resolveLocalVaultId({
    persistedVaultId: before,
    ownerCounts: { "other-owner-id": 10 },
    candidateOwnerIds: ["other-owner-id"],
  });
  const afterReload = resolveLocalVaultId({ persistedVaultId: afterCandidateChange });
  assert.equal(before, "vault_stable");
  assert.equal(afterCandidateChange, "vault_stable");
  assert.equal(afterReload, "vault_stable");
});

test("preserves an older non-temporary owner when it is the only existing vault", () => {
  const vaultId = resolveLocalVaultId({
    ownerCounts: { "existing-local-owner": 7 },
    candidateOwnerIds: ["existing-local-owner"],
    createId: () => "vault_new",
  });
  assert.equal(vaultId, "existing-local-owner");
});

test("temporary compatibility identities are still detectable for migration", () => {
  assert.equal(isTemporaryLocalAuthUser({ id: "local-dev-user" }), true);
  assert.equal(isTemporaryLocalAuthUser({ email: "local@clara.app" }), true);
  assert.equal(isTemporaryLocalAuthUser({ id: "real-user", email: null }), false);
});
