import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function readRepositoryFile(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("authentication resolves the backend account vault before building local state", () => {
  const source = readRepositoryFile("src/context/AuthContext.jsx");
  assert.match(
    source,
    /resolveAccountLocalVault\(\{[\s\S]*?accountUserId: String\(serverUser\.id\)/
  );
  assert.match(source, /const localUserId = resolvedVault\.vaultId;/);
  assert.doesNotMatch(
    source,
    /const localUserId = getOrCreateLocalVaultId\(\);[\s\S]*?waitForLocalAccountLink/
  );
  assert.match(
    source,
    /if \(resolvedVault\.switched\)[\s\S]{0,40}?queryClientInstance\.clear\(\)/
  );
});

test("signup does not retry account creation after local activation fails", () => {
  const source = readRepositoryFile("src/context/AuthContext.jsx");
  assert.match(source, /const session = await createClaraBackendAccount/);
  assert.match(source, /ACCOUNT_CREATED_LOCAL_ACTIVATION_FAILED/);
  assert.match(source, /activationError\.accountCreated = true/);
});

test("signup enters the founding beta welcome before official onboarding", () => {
  const source = readRepositoryFile("src/pages/Login.jsx");
  assert.match(
    source,
    /await signUp\([\s\S]*?navigate\("\/beta-welcome", \{ replace: true \}\)/
  );
  assert.doesNotMatch(
    source,
    /await signUp\([\s\S]*?navigate\("\/dashboard", \{ replace: true \}\)/
  );
});

test("sign out clears memory caches but preserves local vault storage", () => {
  const source = readRepositoryFile("src/context/AuthContext.jsx");
  assert.match(
    source,
    /const signOut = useCallback\([\s\S]*?signOutFromClaraBackend\(\);[\s\S]*?queryClientInstance\.clear\(\);[\s\S]*?commitState\(emptyState\(\)\)/
  );
  assert.doesNotMatch(source, /signOut[\s\S]*?clearLocalUserVault/);
});
