import fs from "node:fs";

const cloudSnapshotPath = "src/lib/cloud-vault-snapshot.js";
const serverSyncPath = "src/lib/server-finance-sync.js";
const cloudTestPath = "tests/cloud-vault-sync.test.mjs";
const localExportTestPath = "tests/local-data-export.test.mjs";
const packagePath = "package.json";

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing patch anchor: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Patch anchor is not unique: ${label}`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function updateFile(path, mutate) {
  const original = fs.readFileSync(path, "utf8");
  const updated = mutate(original);
  if (updated === original) {
    console.log(`No changes needed in ${path}`);
    return;
  }
  fs.writeFileSync(path, updated);
  console.log(`Updated ${path}`);
}

updateFile(cloudSnapshotPath, (input) => {
  let source = input;

  source = replaceOnce(
    source,
    'const SECRET_KEY_PATTERN = /(access[_-]?token|refresh[_-]?token|password|jwt|auth[_-]?session|admin[_-]?session)/i;\nconst CLOUD_RESTORE_CLEAR_PATTERN =',
    'const SECRET_KEY_PATTERN = /(access[_-]?token|refresh[_-]?token|password|jwt|auth[_-]?session|admin[_-]?session)/i;\nconst DEVICE_ONLY_STORAGE_KEY_PATTERN = /^clara_daily_check_in_/i;\nconst CLOUD_RESTORE_CLEAR_PATTERN =',
    "device-only storage pattern",
  );

  source = replaceOnce(
    source,
    'const text = (value) => String(value ?? "").trim();\n\nfunction randomId()',
    'const text = (value) => String(value ?? "").trim();\n\nexport function isDeviceOnlyStorageKey(key) {\n  return DEVICE_ONLY_STORAGE_KEY_PATTERN.test(text(key));\n}\n\nfunction randomId()',
    "device-only key helper",
  );

  source = replaceOnce(
    source,
    '  { accountId, sourceVaultId } = {}\n) {',
    '  { accountId, sourceVaultId, includeDeviceOnly = false } = {}\n) {',
    "sanitizer option",
  );

  source = replaceOnce(
    source,
    '    if (!key || FORBIDDEN_STORAGE_KEYS.has(key) || SECRET_KEY_PATTERN.test(key)) return;',
    '    if (\n      !key ||\n      FORBIDDEN_STORAGE_KEYS.has(key) ||\n      SECRET_KEY_PATTERN.test(key) ||\n      (!includeDeviceOnly && isDeviceOnlyStorageKey(key))\n    ) return;',
    "server storage exclusion",
  );

  source = replaceOnce(
    source,
    'export async function buildClaraCloudVaultSnapshot({ user, profile } = {}) {',
    'export async function buildClaraCloudVaultSnapshot({\n  user,\n  profile,\n  includeDeviceOnly = false,\n} = {}) {',
    "snapshot device-only option",
  );

  source = replaceOnce(
    source,
    '      localStorage: sanitizeCloudLocalStorage(fullExport?.data?.localStorage || {}, {\n        accountId,\n        sourceVaultId,\n      }),',
    '      localStorage: sanitizeCloudLocalStorage(fullExport?.data?.localStorage || {}, {\n        accountId,\n        sourceVaultId,\n        includeDeviceOnly,\n      }),',
    "snapshot sanitizer option forwarding",
  );

  source = replaceOnce(
    source,
    '      localStorage: {\n        ...(older.data?.localStorage || {}),\n        ...(newer.data?.localStorage || {}),\n      },',
    '      localStorage: sanitizeCloudLocalStorage(\n        {\n          ...(older.data?.localStorage || {}),\n          ...(newer.data?.localStorage || {}),\n        },\n        {\n          accountId: newer.account_id,\n          sourceVaultId: local.source_vault_id,\n        },\n      ),',
    "legacy cloud merge sanitization",
  );

  source = replaceOnce(
    source,
    'export function prepareCloudSnapshotForRestore(snapshot, { accountId, targetVaultId }) {',
    'export function prepareCloudSnapshotForRestore(\n  snapshot,\n  { accountId, targetVaultId, includeDeviceOnly = false },\n) {',
    "restore option",
  );

  source = replaceOnce(
    source,
    '    if (FORBIDDEN_STORAGE_KEYS.has(rewrittenKey) || SECRET_KEY_PATTERN.test(rewrittenKey)) return;',
    '    if (\n      FORBIDDEN_STORAGE_KEYS.has(rewrittenKey) ||\n      SECRET_KEY_PATTERN.test(rewrittenKey) ||\n      (!includeDeviceOnly && isDeviceOnlyStorageKey(rewrittenKey))\n    ) return;',
    "restore device-only exclusion",
  );

  source = replaceOnce(
    source,
    'function clearCloudRestoreStorage(storage, { accountId, targetVaultId } = {}) {',
    'function clearCloudRestoreStorage(\n  storage,\n  { accountId, targetVaultId, includeDeviceOnly = false } = {},\n) {',
    "clear storage option",
  );

  source = replaceOnce(
    source,
    '      SECRET_KEY_PATTERN.test(key) ||\n      !CLOUD_RESTORE_CLEAR_PATTERN.test(key)',
    '      SECRET_KEY_PATTERN.test(key) ||\n      (!includeDeviceOnly && isDeviceOnlyStorageKey(key)) ||\n      !CLOUD_RESTORE_CLEAR_PATTERN.test(key)',
    "preserve device-only state during server restore",
  );

  source = replaceOnce(
    source,
    'export async function restoreClaraCloudSnapshot(snapshot, { user, replaceExisting = true } = {}) {',
    'export async function restoreClaraCloudSnapshot(\n  snapshot,\n  { user, replaceExisting = true, includeDeviceOnly = false } = {},\n) {',
    "cloud restore device-only option",
  );

  source = replaceOnce(
    source,
    '    accountId,\n    targetVaultId,\n  });',
    '    accountId,\n    targetVaultId,\n    includeDeviceOnly,\n  });',
    "prepare restore option forwarding",
  );

  source = replaceOnce(
    source,
    '    clearCloudRestoreStorage(globalThis?.localStorage, { accountId, targetVaultId });\n    clearCloudRestoreStorage(globalThis?.sessionStorage, { accountId, targetVaultId });',
    '    clearCloudRestoreStorage(globalThis?.localStorage, {\n      accountId,\n      targetVaultId,\n      includeDeviceOnly,\n    });\n    clearCloudRestoreStorage(globalThis?.sessionStorage, {\n      accountId,\n      targetVaultId,\n      includeDeviceOnly,\n    });',
    "clear restore option forwarding",
  );

  source = replaceOnce(
    source,
    '  const snapshot = await buildClaraCloudVaultSnapshot(context);',
    '  const snapshot = await buildClaraCloudVaultSnapshot({\n    ...context,\n    includeDeviceOnly: true,\n  });',
    "explicit backup includes device-only data",
  );

  source = replaceOnce(
    source,
    '  return restoreClaraCloudSnapshot(snapshot, { user, replaceExisting: true });',
    '  return restoreClaraCloudSnapshot(snapshot, {\n    user,\n    replaceExisting: true,\n    includeDeviceOnly: true,\n  });',
    "explicit backup restore includes device-only data",
  );

  return source;
});

updateFile(serverSyncPath, (input) => {
  let source = input;

  source = replaceOnce(
    source,
    '  buildClaraCloudVaultSnapshot,\n  getClaraSyncDeviceId,',
    '  buildClaraCloudVaultSnapshot,\n  getClaraSyncDeviceId,\n  isDeviceOnlyStorageKey,',
    "server sync device-only import",
  );

  source = replaceOnce(
    source,
    '        !record.deletedAt &&\n        !isServerSyncMetadataKey(record.id)',
    '        !record.deletedAt &&\n        !isServerSyncMetadataKey(record.id) &&\n        !isDeviceOnlyStorageKey(record.id)',
    "block historical server check-ins from restore",
  );

  return source;
});

updateFile(cloudTestPath, (input) => {
  let source = input;

  source = replaceOnce(
    source,
    '} = await import("../src/lib/clara-storage-mode.js");\n',
    '} = await import("../src/lib/clara-storage-mode.js");\n\nconst {\n  isDeviceOnlyStorageKey,\n  prepareCloudSnapshotForRestore,\n  sanitizeCloudLocalStorage,\n} = await import("../src/lib/cloud-vault-snapshot.js");\n',
    "cloud snapshot test imports",
  );

  const newTest = `\ntest("Daily Check-In is excluded from server sync but included in explicit backup transfer", async () => {\n  const dailyCheckInKeys = [\n    "clara_daily_check_in_v1",\n    "clara_daily_check_in_v1_migrated_to",\n    "clara_daily_check_in_v2:user-1",\n    "clara_daily_check_in_v3:user-1",\n    "clara_daily_check_in_v3_migrated:user-1",\n  ];\n  const sourceStorage = Object.fromEntries(\n    dailyCheckInKeys.map((key, index) => [key, JSON.stringify({ streak: index + 1 })]),\n  );\n  sourceStorage.clara_settings_theme = "dark";\n\n  dailyCheckInKeys.forEach((key) => assert.equal(isDeviceOnlyStorageKey(key), true));\n\n  const serverSafe = sanitizeCloudLocalStorage(sourceStorage, {\n    accountId: "user-1",\n    sourceVaultId: "vault-a",\n  });\n  dailyCheckInKeys.forEach((key) => assert.equal(serverSafe[key], undefined));\n  assert.equal(serverSafe.clara_settings_theme, "dark");\n\n  const explicitBackup = sanitizeCloudLocalStorage(sourceStorage, {\n    accountId: "user-1",\n    sourceVaultId: "vault-a",\n    includeDeviceOnly: true,\n  });\n  dailyCheckInKeys.forEach((key) => assert.equal(explicitBackup[key], sourceStorage[key]));\n\n  const legacyServerSnapshot = {\n    app: "CLARA",\n    type: "account-cloud-vault-snapshot",\n    version: 2,\n    account_id: "user-1",\n    created_at: "2026-07-28T00:00:00.000Z",\n    source_vault_id: "vault-a",\n    data: {\n      localStorage: {\n        "clara_daily_check_in_v3:user-1": JSON.stringify({ streak: 12 }),\n        clara_settings_theme: "dark",\n      },\n      indexedDB: { databases: [] },\n    },\n  };\n\n  const serverRestore = prepareCloudSnapshotForRestore(legacyServerSnapshot, {\n    accountId: "user-1",\n    targetVaultId: "vault-b",\n  });\n  assert.equal(serverRestore.data.localStorage["clara_daily_check_in_v3:user-1"], undefined);\n  assert.equal(serverRestore.data.localStorage.clara_settings_theme, "dark");\n\n  const explicitRestore = prepareCloudSnapshotForRestore(legacyServerSnapshot, {\n    accountId: "user-1",\n    targetVaultId: "vault-b",\n    includeDeviceOnly: true,\n  });\n  assert.equal(\n    explicitRestore.data.localStorage["clara_daily_check_in_v3:user-1"],\n    JSON.stringify({ streak: 12 }),\n  );\n\n  const syncSource = await fs.readFile(\n    new URL("../src/lib/server-finance-sync.js", import.meta.url),\n    "utf8",\n  );\n  const snapshotSource = await fs.readFile(\n    new URL("../src/lib/cloud-vault-snapshot.js", import.meta.url),\n    "utf8",\n  );\n  assert.match(syncSource, /!isDeviceOnlyStorageKey\\(record\\.id\\)/);\n  assert.match(snapshotSource, /includeDeviceOnly: true/);\n});\n`;

  source = replaceOnce(
    source,
    '\ntest("server finance sync keeps the manual control under simple user-facing Privacy copy", async () => {',
    `${newTest}\ntest("server finance sync keeps the manual control under simple user-facing Privacy copy", async () => {`,
    "device-only sync regression test",
  );

  return source;
});

updateFile(localExportTestPath, (input) =>
  replaceOnce(
    input,
    '  assert.equal(browser.localStorage.getItem("clara_active_local_vault_v1"), "vault-a");\n  assert.equal(browser.sessionStorage.getItem("clara_settings_session_test"), JSON.stringify({ open: true }));',
    '  assert.equal(browser.localStorage.getItem("clara_active_local_vault_v1"), "vault-a");\n  assert.equal(\n    browser.localStorage.getItem("clara_daily_check_in_v3:vault-a"),\n    JSON.stringify({ streak: 7 }),\n  );\n  assert.equal(browser.sessionStorage.getItem("clara_settings_session_test"), JSON.stringify({ open: true }));',
    "manual backup streak restore assertion",
  ),
);

updateFile(packagePath, (input) =>
  replaceOnce(
    input,
    'tests/manual-online-sync-after-reset.test.mjs tests/dashboard-top-nav-ownership.test.mjs",',
    'tests/manual-online-sync-after-reset.test.mjs tests/dashboard-top-nav-ownership.test.mjs tests/cloud-vault-sync.test.mjs",',
    "include cloud sync regression in npm test",
  ),
);
