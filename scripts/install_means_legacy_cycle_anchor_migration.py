from pathlib import Path

TARGET = Path(__file__).resolve().parents[1] / "src/runtime/installClaraOrbGreeting.js"
source = TARGET.read_text(encoding="utf-8")

anchor = '''function meansCycleBaselineStorageKey(owner, cycleStart, cycleEnd) {
  const ownerKey = encodeURIComponent(String(owner || "local-user").trim() || "local-user");
  return `${MEANS_CYCLE_BASELINE_STORAGE_PREFIX}:${ownerKey}:${cycleStart}:${cycleEnd}`;
}
'''
addition = anchor + '''
function readPreviouslyLockedMeansCycleAnchor(owner, cycleStart, cycleEnd) {
  if (typeof window === "undefined" || !window.localStorage) return 0;
  const ownerKey = encodeURIComponent(String(owner || "local-user").trim() || "local-user");

  // v3 is the pre-remaining-commitments cycle ruler. v4/v5 are deliberately excluded:
  // those rollout versions could be created from remaining commitments mid-cycle.
  const key = `clara:means-cycle-baseline:v3:${ownerKey}:${cycleStart}:${cycleEnd}`;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "null");
    if (
      parsed &&
      parsed.cycleStart === cycleStart &&
      parsed.cycleEnd === cycleEnd &&
      Number.isFinite(Number(parsed.requiredRunway)) &&
      Number(parsed.requiredRunway) > 0
    ) {
      return Math.max(0, Number(parsed.requiredRunway));
    }
  } catch {
    // A missing/malformed legacy anchor simply means v6 establishes from the full plan.
  }
  return 0;
}
'''

if "function readPreviouslyLockedMeansCycleAnchor" not in source:
    if anchor not in source:
        raise SystemExit("Means storage key shape changed; refusing unsafe migration patch")
    source = source.replace(anchor, addition, 1)

stored_block = '''  let stored = null;
  try {
    stored = JSON.parse(window.localStorage.getItem(key) || "null");
  } catch {
    stored = null;
  }

  const resolved = resolveMeansCycleBaselineState({
    stored,
    cycleStart,
    cycleEnd,
    planFingerprint,
    requiredRunway: authoritativePlannedRunway,
    assumedSpent,
  });'''
replacement = '''  let stored = null;
  try {
    stored = JSON.parse(window.localStorage.getItem(key) || "null");
  } catch {
    stored = null;
  }

  const legacyRequiredRunway = stored
    ? 0
    : readPreviouslyLockedMeansCycleAnchor(owner, cycleStart, cycleEnd);
  const resolved = resolveMeansCycleBaselineState({
    stored,
    cycleStart,
    cycleEnd,
    planFingerprint,
    requiredRunway: authoritativePlannedRunway,
    assumedSpent,
    legacyRequiredRunway,
  });'''

if replacement not in source:
    if stored_block not in source:
        raise SystemExit("Means baseline resolver shape changed; refusing unsafe migration patch")
    source = source.replace(stored_block, replacement, 1)

TARGET.write_text(source, encoding="utf-8")
print("Installed one-cycle v3-to-v6 Means anchor migration.")
