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

test("local journey reset resolves without a backend membership request", () => {
  const authSource = readRepositoryFile("src/context/AuthContext.jsx");
  const refreshStart = authSource.indexOf("const refreshProfile = useCallback");
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

  assert.ok(refreshStart >= 0, "refreshProfile must remain available");
  assert.ok(resetReasonIndex >= 0, "refreshProfile must recognize local_journey_reset");
  assert.ok(
    localReturnIndex > resetReasonIndex,
    "the reset path must resolve from current local state"
  );
  assert.ok(
    backendRequestIndex > localReturnIndex,
    "the local reset path must exit before the backend profile request"
  );
});

test("the budget card no longer exposes a hidden local journey or membership reset", () => {
  const budgetCardSource = readRepositoryFile("src/components/BudgetCard.jsx");

  assert.doesNotMatch(budgetCardSource, /handleResetLocalJourney/);
  assert.doesNotMatch(budgetCardSource, /resetLocalClaraJourney/);
  assert.doesNotMatch(budgetCardSource, /local_journey_reset/);
  assert.doesNotMatch(budgetCardSource, /verifyHiddenAdminPassword/);
  assert.doesNotMatch(budgetCardSource, /DeveloperMembershipPreview/);
});
