import test from "node:test";
import assert from "node:assert/strict";
import {
  clearBackendSession,
  isBackendNetworkError,
  restoreClaraBackendSession,
  TOKEN_KEY,
  USER_KEY,
} from "../src/lib/clara-backend-client.js";

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function createToken(expiresAtSeconds) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({ exp: expiresAtSeconds })}.signature`;
}

function jsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    },
  };
}

function installBrowser(storage = createStorage()) {
  globalThis.window = {
    location: { hostname: "clara-app-test.vercel.app" },
    localStorage: storage,
  };
  return storage;
}

function removeBrowser() {
  delete globalThis.window;
  delete globalThis.fetch;
}

test("Vercel proxy outage statuses are classified as backend network failures", () => {
  for (const status of [404, 502, 503, 504]) {
    assert.equal(isBackendNetworkError({ status }), true, `status ${status}`);
  }

  assert.equal(isBackendNetworkError({ status: 401 }), false);
  assert.equal(isBackendNetworkError({ status: 409 }), false);
});

test("a live cached session survives a Vercel proxy 404", async () => {
  const storage = installBrowser();
  const token = createToken(Math.floor(Date.now() / 1000) + 3600);
  const cachedUser = {
    id: 31,
    name: "Cached User",
    email: "cached@example.com",
    role: "user",
  };

  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(cachedUser));
  globalThis.fetch = async () => jsonResponse(404, { message: "Route not found." });

  try {
    const restored = await restoreClaraBackendSession();

    assert.equal(restored.offline, true);
    assert.equal(restored.token, token);
    assert.equal(restored.user.id, cachedUser.id);
    assert.equal(storage.getItem(TOKEN_KEY), token);
  } finally {
    clearBackendSession();
    removeBrowser();
  }
});
