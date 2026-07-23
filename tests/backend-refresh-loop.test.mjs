import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const authContextSource = readFileSync(
  new URL("../src/context/AuthContext.jsx", import.meta.url),
  "utf8"
);
const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

test("backend account refresh stays stable and only runs on a real reconnect", () => {
  assert.match(authContextSource, /const stateRef = useRef\(state\);/);
  assert.match(authContextSource, /const commitState = useCallback/);
  assert.match(
    authContextSource,
    /const refreshProfile = useCallback\([\s\S]*?\},\s*\[\s*applyBackendSession,\s*commitState\s*\]\s*\);/
  );
  assert.doesNotMatch(
    authContextSource,
    /\[applyBackendSession,\s*state\.profile,\s*state\.user\]/
  );
  assert.match(
    authContextSource,
    /window\.addEventListener\("online", refreshOnline\);/
  );

  assert.match(
    appSource,
    /const \{ user, profile, loading, authReady \} = useAuth\(\);/
  );
  assert.doesNotMatch(appSource, /refreshProfile/);
  assert.match(appSource, /window\.addEventListener\("online", syncNetworkState\);/);
  assert.match(appSource, /syncNetworkState\(\);/);
});
