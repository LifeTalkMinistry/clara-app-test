import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const scopedMemorySource = readSource(
  "src/runtime/installScopedClaraMemoryStorage.js"
);
const modalBehaviorSource = readSource(
  "src/runtime/installSettingsModalBehavior.js"
);
const runtimeRegistrySource = readSource(
  "src/runtime/installClaraRuntimePatches.js"
);

test("legacy CLARA memory cabinets are archived and restored per active vault", () => {
  assert.match(scopedMemorySource, /LEGACY_CABINET_PREFIX = "CLARA_MEMORY_CABINET_V1:"/);
  assert.match(scopedMemorySource, /SCOPED_CABINET_PREFIX = "CLARA_MEMORY_CABINET_V2:"/);
  assert.match(scopedMemorySource, /archiveActiveCabinetAliases/);
  assert.match(scopedMemorySource, /clearLegacyCabinetAliases/);
  assert.match(scopedMemorySource, /loadCabinetsForVault/);
  assert.match(scopedMemorySource, /CABINET_UPDATED_EVENT/);
  assert.match(scopedMemorySource, /archiveActiveCabinetAliases\(previousId\)/);
  assert.match(scopedMemorySource, /loadCabinetsForVault\(nextId/);
});

test("a new account cannot inherit behavioral memory or live Talk to CLARA history", () => {
  assert.match(
    scopedMemorySource,
    /SCOPED_BEHAVIORAL_MEMORY_PREFIX = "clara_behavioral_memory_v2:"/
  );
  assert.match(scopedMemorySource, /emptyBehavioralSnapshot/);
  assert.match(scopedMemorySource, /prevents another account's old active_profile/);
  assert.match(scopedMemorySource, /LIVE_USER_MESSAGE_HISTORY_KEY/);
  assert.match(scopedMemorySource, /clearLiveSessionMemory/);
});

test("Settings AI privacy modal participates in Back history and keyboard focus management", () => {
  assert.match(runtimeRegistrySource, /installSettingsModalBehavior/);
  assert.match(modalBehaviorSource, /SETTINGS_MODAL_HISTORY_KEY/);
  assert.match(modalBehaviorSource, /window\.history\.pushState/);
  assert.match(modalBehaviorSource, /window\.history\.back\(\)/);
  assert.match(modalBehaviorSource, /window\.addEventListener\("popstate"/);
  assert.match(modalBehaviorSource, /event\.key === "Escape"/);
  assert.match(modalBehaviorSource, /event\.key !== "Tab"/);
  assert.match(modalBehaviorSource, /document\.body\.style\.overflow = "hidden"/);
  assert.match(modalBehaviorSource, /focus\(\{ preventScroll: true \}\)/);
});
