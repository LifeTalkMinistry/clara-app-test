from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

baseline_path = ROOT / "src/lib/clara-means-cycle-baseline.js"
runtime_path = ROOT / "src/runtime/installClaraOrbGreeting.js"
test_path = ROOT / "tests/means-score-context-baseline-regression.test.mjs"

baseline = baseline_path.read_text()
runtime = runtime_path.read_text()
test = test_path.read_text()

# 1) Bump the baseline version so existing device-local v2 baselines cannot keep
#    controlling the corrected definition of 100.
old = "const BASELINE_VERSION = 2;"
new = "const BASELINE_VERSION = 3;"
assert old in baseline, "baseline version marker not found"
baseline = baseline.replace(old, new, 1)

# 2) Make the full-cycle requirement explicit and testable.
anchor = '''export function stableMeansPlanFingerprint(value) {
  return JSON.stringify(canonicalize(value));
}
'''
insert = '''export function stableMeansPlanFingerprint(value) {
  return JSON.stringify(canonicalize(value));
}

// The user's personal 100 is the amount this pay cycle is consuming/committing.
// In plain terms: cycle income minus the money that will still remain after all
// currently-known commitments are protected.
export function calculateCycleRequiredRunway({
  income = 0,
  availableNow = 0,
  upcoming = 0,
} = {}) {
  const normalizedIncome = finiteNonNegative(income);
  const normalizedAvailable = finiteNonNegative(availableNow);
  const normalizedUpcoming = finiteNonNegative(upcoming);
  const projectedRoom = normalizedAvailable - normalizedUpcoming;
  return Math.max(0, normalizedIncome - projectedRoom);
}
'''
assert anchor in baseline, "fingerprint anchor not found"
baseline = baseline.replace(anchor, insert, 1)

# 3) Wire the helper into the canonical ORB Means snapshot.
old_import = '''  calculateMeansScoreState,
  resolveMeansCycleBaselineState,
  stableMeansPlanFingerprint,
} from "@/lib/clara-means-cycle-baseline";'''
new_import = '''  calculateCycleRequiredRunway,
  calculateMeansScoreState,
  resolveMeansCycleBaselineState,
  stableMeansPlanFingerprint,
} from "@/lib/clara-means-cycle-baseline";'''
assert old_import in runtime, "Means baseline import block not found"
runtime = runtime.replace(old_import, new_import, 1)

assert 'const MEANS_CYCLE_BASELINE_STORAGE_PREFIX = "clara:means-cycle-baseline:v2";' in runtime
runtime = runtime.replace(
    'const MEANS_CYCLE_BASELINE_STORAGE_PREFIX = "clara:means-cycle-baseline:v2";',
    'const MEANS_CYCLE_BASELINE_STORAGE_PREFIX = "clara:means-cycle-baseline:v3";',
    1,
)

old_sig = '''function resolveLockedMeansCycleBaseline({
  owner,
  cycleStart,
  cycleEnd,
  upcoming,
  assumedSpent,
  debtObligations,
  planFingerprint,
}) {'''
new_sig = '''function resolveLockedMeansCycleBaseline({
  owner,
  cycleStart,
  cycleEnd,
  upcoming,
  requiredRunwayCandidate,
  assumedSpent,
  debtObligations,
  planFingerprint,
}) {'''
assert old_sig in runtime, "locked baseline signature not found"
runtime = runtime.replace(old_sig, new_sig, 1)

old_reconstruct = '''  // Reconstruct already-realized planned debt so fulfillment cannot shrink the
  // authoritative requirement. New plan information is handled by the fingerprint.
  const reconstructedRequiredRunway = Math.max(
    Number(upcoming || 0) + plannedDebtAlreadyPaid,
    0
  );'''
new_reconstruct = '''  // 100 is the full predicted amount needed for this pay cycle. Keep already-realized
  // planned debt inside the floor so fulfilling a known obligation cannot make the
  // measuring stick artificially smaller.
  const reconstructedRequiredRunway = Math.max(
    Number(requiredRunwayCandidate || 0),
    Number(upcoming || 0) + plannedDebtAlreadyPaid,
    0
  );'''
assert old_reconstruct in runtime, "required runway reconstruction block not found"
runtime = runtime.replace(old_reconstruct, new_reconstruct, 1)

old_projection = '''  const projectedSpending = upcoming;
  const projectedRoom = availableNow - upcoming;

  // Means Score uses one locked measuring stick for the whole payday-to-payday window.'''
new_projection = '''  const projectedSpending = upcoming;
  const projectedRoom = availableNow - upcoming;
  const requiredRunwayCandidate = calculateCycleRequiredRunway({
    income,
    availableNow,
    upcoming,
  });

  // Means Score uses one locked measuring stick for the whole payday-to-payday window.'''
assert old_projection in runtime, "projection block not found"
runtime = runtime.replace(old_projection, new_projection, 1)

old_call = '''    cycleEnd: cycleEndDate,
    upcoming,
    assumedSpent,
    debtObligations,
    planFingerprint,
  });'''
new_call = '''    cycleEnd: cycleEndDate,
    upcoming,
    requiredRunwayCandidate,
    assumedSpent,
    debtObligations,
    planFingerprint,
  });'''
assert old_call in runtime, "locked baseline call not found"
runtime = runtime.replace(old_call, new_call, 1)

# 4) Update and extend regression coverage.
old_test_import = '''  calculateMeansScoreState,
  resolveMeansCycleBaselineState,
  stableMeansPlanFingerprint,
} from "../src/lib/clara-means-cycle-baseline.js";'''
new_test_import = '''  calculateCycleRequiredRunway,
  calculateMeansScoreState,
  resolveMeansCycleBaselineState,
  stableMeansPlanFingerprint,
} from "../src/lib/clara-means-cycle-baseline.js";'''
assert old_test_import in test, "test import block not found"
test = test.replace(old_test_import, new_test_import, 1)

test = test.replace(
    'test("a new pay cycle resets the baseline and stale v1 data cannot control v2", () => {',
    'test("a new pay cycle resets the baseline and stale v2 data cannot control v3", () => {',
    1,
)
test = test.replace('const oldV1 = {\n    version: 1,', 'const oldV2 = {\n    version: 2,', 1)
test = test.replace('stored: oldV1,', 'stored: oldV2,', 1)
test = test.replace('assert.equal(next.baseline.version, 2);', 'assert.equal(next.baseline.version, 3);', 1)
test = test.replace('assert.match(runtime, /clara:means-cycle-baseline:v2/);', 'assert.match(runtime, /clara:means-cycle-baseline:v3/);', 1)

marker = '''test("incomplete setup does not freeze Means Score at 100", () => {'''
new_test = '''test("full-cycle required runway makes the user's predicted cycle need equal 100", () => {
  const requiredRunway = calculateCycleRequiredRunway({
    income: 15100,
    availableNow: 9388,
    upcoming: 4691,
  });

  assert.equal(requiredRunway, 10403);

  const state = calculateMeansScoreState({
    financialRunway: 9388,
    upcoming: 4691,
    requiredRunway,
    assumedSpent: 0,
    assumedSpentAtLock: 0,
  });

  // ₱10,403 is 100. The ₱4,697 left beyond the protected cycle is about +45 points.
  assert.equal(state.scoreRoom, 4697);
  assert.equal(state.score, 145);

  // One entire ₱10,403 cycle remaining beyond the protected cycle is exactly 200.
  const oneCycleAhead = calculateMeansScoreState({
    financialRunway: 10403 + 4691,
    upcoming: 4691,
    requiredRunway,
    assumedSpent: 0,
    assumedSpentAtLock: 0,
  });
  assert.equal(oneCycleAhead.scoreRoom, 10403);
  assert.equal(oneCycleAhead.score, 200);
});

test("incomplete setup does not freeze Means Score at 100", () => {'''
assert marker in test, "test insertion marker not found"
test = test.replace(marker, new_test, 1)

baseline_path.write_text(baseline)
runtime_path.write_text(runtime)
test_path.write_text(test)

print("Patched Means Score so 100 equals the full predicted cycle requirement.")
