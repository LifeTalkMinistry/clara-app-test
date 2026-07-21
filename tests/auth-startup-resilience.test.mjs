import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const authContextSource = readFileSync(
  new URL("../src/context/AuthContext.jsx", import.meta.url),
  "utf8"
);
const resilienceSource = readFileSync(
  new URL("../src/lib/auth-startup-resilience.js", import.meta.url),
  "utf8"
);
const resolverCoreSource = readFileSync(
  new URL("../src/lib/accountLinking/resolveAccountLocalVaultCore.js", import.meta.url),
  "utf8"
);
const linkerSource = readFileSync(
  new URL("../src/lib/accountLinking/linkLocalVaultToAccount.js", import.meta.url),
  "utf8"
);

test("local migrations cannot hold the global authentication loader open", () => {
  assert.match(
    authContextSource,
    /import \{ runLocalAuthMaintenance \} from "@\/lib\/auth-startup-resilience";/
  );
  assert.doesNotMatch(authContextSource, /await migrateLocalVaultOwnership\(/);
  assert.doesNotMatch(authContextSource, /await migrateLegacyLocalIdentityStorage\(/);
  assert.match(authContextSource, /const restored = await restoreClaraBackendSession\(\);/);
  assert.match(
    authContextSource,
    /commitState\(next\);[\s\S]*?void rebuildAfterLocalMaintenance\(next\.localUserId\);/
  );
});

test("authentication resolves the correct account vault before local state is built", () => {
  const resolverCallIndex = authContextSource.indexOf("await resolveAccountLocalVault({");
  const localProfileIndex = authContextSource.indexOf(
    "const localAccount = getLocalAccountProfile(localUserId);"
  );
  const stateReturnIndex = authContextSource.indexOf("return {", localProfileIndex);

  assert.ok(resolverCallIndex >= 0, "authentication must call the account vault resolver");
  assert.ok(
    localProfileIndex > resolverCallIndex,
    "the account vault must be resolved before local profile data is read"
  );
  assert.ok(
    stateReturnIndex > localProfileIndex,
    "authenticated state must be built only after the resolved vault is active"
  );
  assert.doesNotMatch(authContextSource, /await waitForLocalAccountLink\(\{/);
});

test("resolver saves mappings only after activation and successful low-level linking", () => {
  assert.match(
    resolverCoreSource,
    /await adapters\.activateVault\(vaultId\);[\s\S]*?await adapters\.linkVault\(/
  );
  assert.match(
    resolverCoreSource,
    /await activateAndLink\([\s\S]*?await adapters\.saveMapping\(/
  );
  assert.match(linkerSource, /"VAULT_ACCOUNT_CONFLICT"/);
  assert.match(
    linkerSource,
    /This local vault is already linked to a different CLARA account\./
  );
});

test("background local maintenance contains its own failures", () => {
  assert.match(resilienceSource, /export function runLocalAuthMaintenance/);
  assert.match(resilienceSource, /local startup maintenance was skipped\./);
  assert.match(resilienceSource, /return \{ status: "failed", error \};/);
});
