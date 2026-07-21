import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, "..");

function readRepositoryFile(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

test("local journey reset does not wait for a backend profile request", () => {
  const authSource = readRepositoryFile("src/context/AuthContext.jsx");
  const refreshStart = authSource.indexOf(
    "const refreshProfile = useCallback(async (options = {}) => {"
  );
  const refreshEnd = authSource.indexOf("const signIn = useCallback", refreshStart);
  const refreshProfileSource = authSource.slice(refreshStart, refreshEnd);

  const resetReasonIndex = refreshProfileSource.indexOf(
    'reason === "local_journey_reset"'
  );
  const localReturnIndex = refreshProfileSource.indexOf(
    "return stateRef.current.profile;",
    resetReasonIndex
  );
  const backendRequestIndex = refreshProfileSource.indexOf(
    "fetchCurrentBackendUser(token)"
  );

  assert.ok(refreshStart >= 0, "refreshProfile must accept reset options");
  assert.ok(resetReasonIndex >= 0, "refreshProfile must recognize local_journey_reset");
  assert.ok(localReturnIndex > resetReasonIndex, "the reset path must resolve from local state");
  assert.ok(
    backendRequestIndex > localReturnIndex,
    "the reset path must exit before any backend request"
  );
});

test("reset control navigates to onboarding after the local reset", () => {
  const budgetCardSource = readRepositoryFile("src/components/BudgetCard.jsx");
  const handlerStart = budgetCardSource.indexOf(
    "const handleResetLocalJourney = async () => {"
  );
  const handlerEnd = budgetCardSource.indexOf("return (", handlerStart);
  const handlerSource = budgetCardSource.slice(handlerStart, handlerEnd);

  const resetIndex = handlerSource.indexOf("await resetLocalClaraJourney({");
  const reasonIndex = handlerSource.indexOf('reason: "local_journey_reset"');
  const navigateIndex = handlerSource.indexOf(
    'navigate("/onboarding", { replace: true })'
  );
  const reloadIndex = handlerSource.indexOf("window.location.reload()");

  assert.ok(resetIndex >= 0, "the device journey must be reset first");
  assert.ok(reasonIndex > resetIndex, "the local-only refresh reason must be passed");
  assert.ok(navigateIndex > reasonIndex, "onboarding navigation must follow the reset");
  assert.ok(reloadIndex > navigateIndex, "the clean onboarding state must reload afterward");
});
