import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, "..");

function readRepositoryFile(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

function createStorage() {
  const values = new Map();
  return {
    get length() {
      return values.size;
    },
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
  };
}

function completeAnswers() {
  return {
    commitment_level: "take_seriously",
    lifestyle_context: ["just_myself"],
    money_pressure_point: ["bills"],
    spending_trigger: ["payday_arrives"],
    spending_guidance_style: ["budget_based_check"],
    guidance_intensity: "money_coach",
  };
}

test("onboarding storage is scoped to the active local vault", async () => {
  const storage = createStorage();
  globalThis.window = {
    localStorage: storage,
    dispatchEvent() {},
  };
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };

  try {
    const moduleUrl = pathToFileURL(
      path.join(repositoryRoot, "src/lib/claraLocalProfile.js")
    );
    moduleUrl.searchParams.set("test", String(Date.now()));
    const onboarding = await import(moduleUrl.href);

    storage.setItem("clara_local_vault_id_v1", "vault-a");
    onboarding.saveLocalSetupProfile({ answers: completeAnswers(), completed: true });

    assert.equal(onboarding.hasCompletedLocalSetup({ id: "vault-a" }), true);
    assert.equal(onboarding.hasCompletedLocalSetup({ id: "vault-b" }), false);
    assert.ok(storage.getItem("clara_local_setup_profile_v2:vault-a"));
    assert.equal(storage.getItem("clara_local_setup_profile_v2:vault-b"), null);
  } finally {
    delete globalThis.window;
    delete globalThis.CustomEvent;
  }
});

test("legacy onboarding migrates once to the active vault", async () => {
  const storage = createStorage();
  globalThis.window = {
    localStorage: storage,
    dispatchEvent() {},
  };
  globalThis.CustomEvent = class CustomEvent {};

  try {
    storage.setItem("clara_local_vault_id_v1", "vault-legacy");
    storage.setItem(
      "clara_local_setup_profile_v1",
      JSON.stringify({ version: 1, answers: completeAnswers(), completed: true })
    );

    const moduleUrl = pathToFileURL(
      path.join(repositoryRoot, "src/lib/claraLocalProfile.js")
    );
    moduleUrl.searchParams.set("legacy", String(Date.now()));
    const onboarding = await import(moduleUrl.href);

    assert.equal(onboarding.hasCompletedLocalSetup({ id: "vault-legacy" }), true);
    assert.ok(storage.getItem("clara_local_setup_profile_v2:vault-legacy"));
    assert.equal(storage.getItem("clara_local_setup_profile_v1"), null);
  } finally {
    delete globalThis.window;
    delete globalThis.CustomEvent;
  }
});

test("memory fallback cannot complete onboarding for another vault", async () => {
  const storage = createStorage();
  globalThis.window = {
    localStorage: storage,
    dispatchEvent() {},
  };
  globalThis.CustomEvent = class CustomEvent {};

  try {
    const categories = [
      "onboarding_commitment",
      "onboarding_lifestyle_clarity",
      "onboarding_money_pressure",
      "onboarding_spending_trigger",
      "onboarding_guidance_style",
      "onboarding_guidance_intensity",
    ];
    storage.setItem(
      "clara_memory_vault-a",
      JSON.stringify(categories.map((category) => ({ category, content: "saved" })))
    );

    const moduleUrl = pathToFileURL(
      path.join(repositoryRoot, "src/lib/claraLocalProfile.js")
    );
    moduleUrl.searchParams.set("memory", String(Date.now()));
    const onboarding = await import(moduleUrl.href);

    assert.equal(onboarding.hasCompletedLocalSetup({ id: "vault-a" }), true);
    assert.equal(onboarding.hasCompletedLocalSetup({ id: "vault-b" }), false);
  } finally {
    delete globalThis.window;
    delete globalThis.CustomEvent;
  }
});

test("authenticated routes are no longer wrapped by a mandatory onboarding gate", () => {
  const mainSource = readRepositoryFile("src/main.jsx");
  const appSource = readRepositoryFile("src/App.jsx");

  assert.doesNotMatch(mainSource, /OnboardingRouteGate/);
  assert.doesNotMatch(mainSource, /isUniversalOnboardingLocation/);
  assert.match(
    mainSource,
    /function RootApplication\(\)[\s\S]*?<Suspense[\s\S]*?<App \/>/
  );
  assert.match(
    appSource,
    /path="\/onboarding"\s+element=\{<Navigate to="\/dashboard" replace \/>\}/
  );
});

test("access flow bypasses onboarding while keeping saved setup data intact", () => {
  const accessSource = readRepositoryFile("src/lib/access-control.js");
  const profileSource = readRepositoryFile("src/lib/local-profile-repository.js");
  const resetSource = readRepositoryFile("src/lib/reset-local-clara-journey.js");

  assert.match(
    accessSource,
    /export function hasCompletedOnboarding[\s\S]*?hasCompletedLocalSetup\(profileLike\)/
  );
  assert.match(
    accessSource,
    /export function resolveAppFlow\([^)]*\)\s*\{[\s\S]*?return "normal";/
  );
  assert.doesNotMatch(accessSource, /return "universal_onboarding";/);
  assert.match(profileSource, /getLocalSetupProfile\(\{ id: localUserId \}\)/);
  assert.match(profileSource, /clearLocalSetupProfile\(\{ id \}\)/);
  assert.match(resetSource, /LOCAL_SETUP_PROFILE_KEY_PREFIX/);
  assert.match(resetSource, /clearLocalSetupProfile\(\{ id: localUserId \}\)/);
});
