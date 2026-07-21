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

test("local migrations cannot hold the global authentication loader open", () => {
  assert.match(
    authContextSource,
    /import \{[\s\S]*?runLocalAuthMaintenance,[\s\S]*?waitForLocalAccountLink,[\s\S]*?\} from "@\/lib\/auth-startup-resilience";/
  );
  assert.doesNotMatch(authContextSource, /await migrateLocalVaultOwnership\(/);
  assert.doesNotMatch(authContextSource, /await migrateLegacyLocalIdentityStorage\(/);
  assert.match(authContextSource, /const restored = await restoreClaraBackendSession\(\);/);
  assert.match(authContextSource, /commitState\(next\);[\s\S]*?void rebuildAfterLocalMaintenance\(localUserId\);/);
});

test("local account linking is bounded without hiding account conflicts", () => {
  assert.match(authContextSource, /await waitForLocalAccountLink\(\{/);
  assert.match(resilienceSource, /export const ACCOUNT_LINK_TIMEOUT_MS = 3_000;/);
  assert.match(resilienceSource, /return await Promise\.race\(\[/);
  assert.match(resilienceSource, /"VAULT_ACCOUNT_CONFLICT"/);
  assert.match(resilienceSource, /if \(isBlockingLocalLinkError\(error\)\) throw error;/);
  assert.match(
    resilienceSource,
    /local account linking timed out; authentication will continue\./
  );
});

test("background local maintenance contains its own failures", () => {
  assert.match(resilienceSource, /export function runLocalAuthMaintenance/);
  assert.match(resilienceSource, /local startup maintenance was skipped\./);
  assert.match(resilienceSource, /return \{ status: "failed", error \};/);
});
