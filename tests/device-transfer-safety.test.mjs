import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const vaultSource = await fs.readFile(
  new URL("../src/lib/device-transfer-vault.js", import.meta.url),
  "utf8"
);
const clientSource = await fs.readFile(
  new URL("../src/lib/device-transfer-client.js", import.meta.url),
  "utf8"
);
const panelSource = await fs.readFile(
  new URL("../src/components/device-transfer/DeviceTransferPanel.jsx", import.meta.url),
  "utf8"
);
const dataExportSource = await fs.readFile(
  new URL("../src/pages/DataExport.jsx", import.meta.url),
  "utf8"
);
const mainSource = await fs.readFile(
  new URL("../src/main.jsx", import.meta.url),
  "utf8"
);

test("device transfer is deliberate and never installed as a startup sync runtime", () => {
  assert.doesNotMatch(mainSource, /installFastAccountSync/);
  assert.doesNotMatch(mainSource, /installAccountStreakSyncBridge/);
  assert.doesNotMatch(mainSource, /CloudVaultSyncBridge/);
  assert.match(dataExportSource, /DeviceTransferPanel/);
  assert.match(panelSource, /Send data to another device/);
  assert.match(panelSource, /Receive data on this device/);
  assert.match(panelSource, /Approve this device/);
  assert.match(panelSource, /Migrate to this device now/);
});

test("receiving data stages an isolated vault and verifies it before switching", () => {
  assert.match(vaultSource, /const newVaultId = createLocalVaultId\(\)/);
  assert.match(vaultSource, /await saveRecoveryRecord\([\s\S]*status: "staging"/);
  assert.match(vaultSource, /namespaceTransferredFinanceRecordIds/);
  assert.match(vaultSource, /`transfer:\$\{targetVaultId\}:\$\{oldId\}`/);
  assert.match(
    vaultSource,
    /restoreClaraLocalDataFromFile\([\s\S]*indexedDbOnly\(transferPrepared\)/
  );
  assert.match(
    vaultSource,
    /actualFinanceRecordCount\(newVaultId\)[\s\S]*actualRecords !== expectedRecords/
  );
  assert.match(
    vaultSource,
    /actualRecords !== expectedRecords[\s\S]*switchAccountVault\(/
  );
  assert.match(
    vaultSource,
    /switchAccountVault\([\s\S]*storageOnly\(transferPrepared\)/
  );
  assert.match(vaultSource, /clearLocalUserPrivateData\(newVaultId\)/);
  assert.match(vaultSource, /rollbackLastDeviceTransfer/);
});

test("transfer API requires authenticated one-time sender and receiver capabilities", () => {
  assert.match(clientSource, /getStoredBackendToken/);
  assert.match(clientSource, /\/api\/device-transfers\/claim/);
  assert.match(clientSource, /\/approve/);
  assert.match(clientSource, /\/package/);
  assert.match(clientSource, /\/complete/);
  assert.match(panelSource, /fetchDeviceTransferPackage/);
  assert.match(panelSource, /completeDeviceTransfer/);
});

test("a lost cleanup acknowledgement cannot turn a verified local import into a failure", () => {
  assert.match(clientSource, /for \(let attempt = 0; attempt < 3; attempt \+= 1\)/);
  assert.match(clientSource, /status: "consumed"/);
  assert.match(clientSource, /completionPending: true/);
});
