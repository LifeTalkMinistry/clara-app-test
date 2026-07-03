import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("local beta uses a stable namespaced vault identity", async () => {
  const source = await read("src/lib/local-user-identity.js");
  assert.match(source, /clara_local_vault_id_v1/);
  assert.match(source, /clara_local_/);
  assert.match(source, /randomUUID/);
});

test("vault migration commits before its completion marker is saved", async () => {
  const source = await read("src/lib/local-vault-migration.js");
  const migrationCall = source.indexOf("await migrateTransaction");
  const completionMarker = source.indexOf('status: "completed"', migrationCall);
  assert.ok(migrationCall >= 0);
  assert.ok(completionMarker > migrationCall);
  assert.match(source, /readRequest\.onsuccess/);
  assert.match(source, /localUserId: toUserId/);
  assert.match(source, /legacy data preserved/);
});

test("Google Play pending purchases never unlock committed access", async () => {
  const billing = await read("src/lib/google-play-billing.js");
  const entitlement = await read("src/lib/local-google-play-entitlement.js");
  assert.match(billing, /purchaseState === "PENDING"/);
  assert.match(billing, /purchaseState !== "PURCHASED"/);
  assert.match(entitlement, /saved\.state === "pending"/);
  assert.match(entitlement, /isPro: false/);
});

test("purchase acknowledgment is required before active entitlement is saved", async () => {
  const billing = await read("src/lib/google-play-billing.js");
  const nativePlugin = await read("android/app/src/main/java/com/clara/lifeos/app/ClaraBillingPlugin.java");
  assert.match(billing, /acknowledgeGooglePlayPurchase/);
  assert.match(billing, /await acknowledgeGooglePlayPurchase/);
  assert.match(nativePlugin, /public void acknowledgePurchase/);
  assert.match(nativePlugin, /Purchase\.PurchaseState\.PURCHASED/);
  assert.match(nativePlugin, /purchase\.isAcknowledged\(\)/);
});

test("successful empty ownership query downgrades while failed query becomes unknown", async () => {
  const source = await read("src/lib/google-play-billing.js");
  assert.match(source, /if \(!owned\.ok\)[\s\S]*state: "unknown"/);
  assert.match(source, /if \(!purchase\)[\s\S]*state: "inactive"/);
});

test("Android local beta selects the local facade", async () => {
  const runtime = await read("src/lib/clara-runtime-mode.js");
  const facade = await read("src/lib/supabaseClient.js");
  assert.match(runtime, /Capacitor\.isNativePlatform\(\)/);
  assert.match(runtime, /LOCAL_BETA/);
  assert.match(facade, /createLocalSupabaseFacade/);
  assert.match(facade, /isLocalBetaMode\(\)/);
});
