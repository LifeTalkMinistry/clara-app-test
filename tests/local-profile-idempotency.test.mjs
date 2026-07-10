import test from "node:test";
import assert from "node:assert/strict";

class MemoryStorage {
  constructor() {
    this.values = new Map();
    this.writeCount = 0;
  }
  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }
  setItem(key, value) {
    this.writeCount += 1;
    this.values.set(key, String(value));
  }
  removeItem(key) {
    this.values.delete(key);
  }
  clear() {
    this.values.clear();
    this.writeCount = 0;
  }
}

const storage = new MemoryStorage();
const events = [];
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
};
globalThis.window = {
  localStorage: storage,
  dispatchEvent(event) {
    events.push(event);
    return true;
  },
};
globalThis.localStorage = storage;

const {
  PROFILE_KEY_PREFIX,
  getLocalAccountProfile,
  saveLocalAccountProfile,
} = await import("../src/lib/local-profile-repository.js");

function reset() {
  storage.clear();
  events.length = 0;
}

function profileEvents() {
  return events.filter((event) => event.type === "clara-local-profile-updated");
}

test("first profile save writes once and creates stable timestamps", () => {
  reset();
  const saved = saveLocalAccountProfile("vault-a", { full_name: "Max" });
  assert.equal(storage.writeCount, 1);
  assert.equal(profileEvents().length, 1);
  assert.ok(saved.created_at);
  assert.ok(saved.updated_at);
});

test("identical profile patch does not write, dispatch, or change updated_at", () => {
  reset();
  const first = saveLocalAccountProfile("vault-a", { full_name: "Max" });
  const writes = storage.writeCount;
  const eventCount = profileEvents().length;
  const second = saveLocalAccountProfile("vault-a", {
    full_name: "Max",
    updated_at: new Date(Date.now() + 60_000).toISOString(),
  });

  assert.equal(storage.writeCount, writes);
  assert.equal(profileEvents().length, eventCount);
  assert.equal(second.updated_at, first.updated_at);
  assert.equal(second.created_at, first.created_at);
});

test("real display-name change writes and dispatches exactly once", () => {
  reset();
  saveLocalAccountProfile("vault-a", { display_name: "Max" });
  events.length = 0;
  const writes = storage.writeCount;
  const changed = saveLocalAccountProfile("vault-a", { display_name: "Max Emorej" });

  assert.equal(storage.writeCount, writes + 1);
  assert.equal(profileEvents().length, 1);
  assert.equal(changed.display_name, "Max Emorej");
});

test("real onboarding-state change writes and dispatches exactly once", () => {
  reset();
  saveLocalAccountProfile("vault-a", { onboarding_completed: false });
  events.length = 0;
  const writes = storage.writeCount;
  const changed = saveLocalAccountProfile("vault-a", { onboarding_completed: true });

  assert.equal(storage.writeCount, writes + 1);
  assert.equal(profileEvents().length, 1);
  assert.equal(changed.onboarding_completed, true);
});

test("reads are side-effect free and do not invent persisted timestamps", () => {
  reset();
  const profile = getLocalAccountProfile("vault-empty");
  assert.equal(storage.writeCount, 0);
  assert.equal(profileEvents().length, 0);
  assert.equal(profile.created_at, null);
  assert.equal(profile.updated_at, null);
  assert.equal(storage.getItem(`${PROFILE_KEY_PREFIX}vault-empty`), null);
});
