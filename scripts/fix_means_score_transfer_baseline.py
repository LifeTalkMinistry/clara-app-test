from pathlib import Path

# Trigger the verified one-shot migration repair after its workflow is active on main.


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Missing expected source for {label}")
    return text.replace(old, new, 1)

local_path = Path("src/lib/local-data-export.js")
local = local_path.read_text()

local = replace_once(
    local,
    'const CLARA_KEY_PATTERNS = [',
    'const DERIVED_RUNTIME_STORAGE_PREFIXES = [\n  "clara:means-cycle-baseline:",\n];\n\nconst CLARA_KEY_PATTERNS = [',
    "derived runtime prefix declaration",
)

local = replace_once(
    local,
    '  if (RETIRED_CONTEXT_STORAGE_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return false;\n',
    '  if (RETIRED_CONTEXT_STORAGE_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return false;\n  // Means cycle baselines are derived runtime state. They must never travel between\n  // devices because the destination must rebuild 100 from its restored finance truth.\n  if (DERIVED_RUNTIME_STORAGE_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return false;\n',
    "exclude Means baseline from backup scope",
)

anchor = '''function writeStorageEntries(storage, entries = {}, storageType) {\n'''
helper = '''function clearDerivedRuntimeStorage(storage) {\n  if (!storage) return [];\n  const removed = [];\n  const keys = [];\n  for (let index = 0; index < storage.length; index += 1) {\n    const key = storage.key(index);\n    if (key) keys.push(key);\n  }\n  keys.forEach((key) => {\n    if (!DERIVED_RUNTIME_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) return;\n    try {\n      storage.removeItem(key);\n      removed.push(key);\n    } catch {\n      // A stale derived baseline is safer to ignore than to restore as authority.\n    }\n  });\n  return removed;\n}\n\nfunction writeStorageEntries(storage, entries = {}, storageType) {\n'''
local = replace_once(local, anchor, helper, "derived runtime clearing helper")

local = replace_once(
    local,
    '  const localEntries = getBackupStorageEntries(backup, "localStorage");\n  const sessionEntries = getBackupStorageEntries(backup, "sessionStorage");\n  const localResult = writeStorageEntries(window.localStorage, localEntries, "localStorage");\n',
    '  const localEntries = getBackupStorageEntries(backup, "localStorage");\n  const sessionEntries = getBackupStorageEntries(backup, "sessionStorage");\n  // Never inherit a source-device Means baseline, and remove any stale destination\n  // baseline before restored finance records are allowed to rebuild the metric.\n  const clearedDerivedLocalStorageKeys = clearDerivedRuntimeStorage(window.localStorage);\n  const clearedDerivedSessionStorageKeys = clearDerivedRuntimeStorage(window.sessionStorage);\n  const localResult = writeStorageEntries(window.localStorage, localEntries, "localStorage");\n',
    "clear derived baselines during restore",
)

local = replace_once(
    local,
    '    restoredSessionStorageKeys: sessionResult.restored,\n    indexedDB: indexedDbResult,\n',
    '    restoredSessionStorageKeys: sessionResult.restored,\n    clearedDerivedLocalStorageKeys,\n    clearedDerivedSessionStorageKeys,\n    indexedDB: indexedDbResult,\n',
    "restore detail derived baseline audit",
)

local_path.write_text(local)

cloud_path = Path("src/lib/cloud-vault-snapshot.js")
cloud = cloud_path.read_text()

cloud = replace_once(
    cloud,
    'const DEVICE_ONLY_STORAGE_KEY_PATTERN = /^clara_daily_check_in_/i;\n',
    'const DEVICE_ONLY_STORAGE_KEY_PATTERN = /^clara_daily_check_in_/i;\nconst DERIVED_RUNTIME_STORAGE_PREFIXES = ["clara:means-cycle-baseline:"];\n',
    "cloud derived runtime prefix",
)

cloud = replace_once(
    cloud,
    '      SECRET_KEY_PATTERN.test(key) ||\n      (!includeDeviceOnly && isDeviceOnlyStorageKey(key))\n',
    '      SECRET_KEY_PATTERN.test(key) ||\n      DERIVED_RUNTIME_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix)) ||\n      (!includeDeviceOnly && isDeviceOnlyStorageKey(key))\n',
    "cloud snapshot exclusion",
)

cloud = replace_once(
    cloud,
    '      SECRET_KEY_PATTERN.test(rewrittenKey) ||\n      (!includeDeviceOnly && isDeviceOnlyStorageKey(rewrittenKey))\n',
    '      SECRET_KEY_PATTERN.test(rewrittenKey) ||\n      DERIVED_RUNTIME_STORAGE_PREFIXES.some((prefix) => rewrittenKey.startsWith(prefix)) ||\n      (!includeDeviceOnly && isDeviceOnlyStorageKey(rewrittenKey))\n',
    "legacy cloud restore exclusion",
)

cloud_path.write_text(cloud)

test_path = Path("tests/means-score-transfer-baseline-regression.test.mjs")
test_path.write_text('''import assert from "node:assert/strict";\nimport test from "node:test";\nimport { readFile } from "node:fs/promises";\n\nimport { sanitizeCloudLocalStorage } from "../src/lib/cloud-vault-snapshot.js";\n\ntest("cloud/device transfer never carries a Means cycle baseline", () => {\n  const source = {\n    "clara:means-cycle-baseline:v3:user:2026-08-25:2026-09-10": { requiredRunway: 7777 },\n    "clara_settings_user": { language: "en" },\n  };\n  const safe = sanitizeCloudLocalStorage(source, {\n    accountId: "user",\n    sourceVaultId: "vault",\n    includeDeviceOnly: true,\n  });\n  assert.equal(Object.keys(safe).some((key) => key.startsWith("clara:means-cycle-baseline:")), false);\n  assert.deepEqual(safe.clara_settings_user, { language: "en" });\n});\n\ntest("local restore clears destination Means baseline and excludes transferred baseline", async () => {\n  const runtime = await readFile(new URL("../src/lib/local-data-export.js", import.meta.url), "utf8");\n  assert.match(runtime, /DERIVED_RUNTIME_STORAGE_PREFIXES[\\s\\S]*clara:means-cycle-baseline:/);\n  assert.match(runtime, /clearDerivedRuntimeStorage\\(window\\.localStorage\\)/);\n  assert.match(runtime, /DERIVED_RUNTIME_STORAGE_PREFIXES\\.some\\(\\(prefix\\) => normalized\\.startsWith\\(prefix\\)\\)/);\n});\n\ntest("legacy cloud snapshots also drop Means baseline while preparing restore", async () => {\n  const runtime = await readFile(new URL("../src/lib/cloud-vault-snapshot.js", import.meta.url), "utf8");\n  assert.match(runtime, /DERIVED_RUNTIME_STORAGE_PREFIXES\\.some\\(\\(prefix\\) => rewrittenKey\\.startsWith\\(prefix\\)\\)/);\n});\n''')

print("Applied Means Score transfer baseline repair")
