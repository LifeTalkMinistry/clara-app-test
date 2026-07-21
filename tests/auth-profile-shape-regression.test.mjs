import test from "node:test";
import assert from "node:assert/strict";
import {
  clearBackendSession,
  DEFAULT_API_URL,
  getStoredBackendUser,
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
  globalThis.window = { localStorage: storage };
  return storage;
}

function removeBrowser() {
  delete globalThis.window;
  delete globalThis.fetch;
}

test("session restoration accepts a user wrapper from /api/users/me", async () => {
  const storage = installBrowser();
  const token = createToken(Math.floor(Date.now() / 1000) + 3600);
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(
    USER_KEY,
    JSON.stringify({ id: 8, name: "Cached", email: "cached@example.com", role: "user" })
  );

  globalThis.fetch = async (url) => {
    assert.equal(url, `${DEFAULT_API_URL}/api/users/me`);
    return jsonResponse(200, {
      user: {
        id: 8,
        name: "Verified Wrapper",
        email: "verified@example.com",
        role: "user",
      },
    });
  };

  try {
    const restored = await restoreClaraBackendSession();
    assert.equal(restored.offline, false);
    assert.equal(restored.user.id, 8);
    assert.equal(restored.user.name, "Verified Wrapper");
    assert.equal(getStoredBackendUser().email, "verified@example.com");
  } finally {
    clearBackendSession();
    removeBrowser();
  }
});

test("session restoration accepts nested data and alternate user field names", async () => {
  const storage = installBrowser();
  const token = createToken(Math.floor(Date.now() / 1000) + 3600);
  storage.setItem(TOKEN_KEY, token);

  globalThis.fetch = async () =>
    jsonResponse(200, {
      data: {
        profile: {
          user_id: 14,
          full_name: "Nested User",
          email: "NESTED@example.com",
          user_role: "user",
          createdAt: "2026-07-21T00:00:00.000Z",
        },
      },
    });

  try {
    const restored = await restoreClaraBackendSession();
    assert.equal(restored.offline, false);
    assert.equal(restored.user.id, 14);
    assert.equal(restored.user.name, "Nested User");
    assert.equal(restored.user.email, "nested@example.com");
    assert.equal(restored.user.created_at, "2026-07-21T00:00:00.000Z");
  } finally {
    clearBackendSession();
    removeBrowser();
  }
});

test("malformed successful profile response falls back to the cached account", async () => {
  const storage = installBrowser();
  const token = createToken(Math.floor(Date.now() / 1000) + 3600);
  const cachedUser = {
    id: 21,
    name: "Cached Max",
    email: "cached-max@example.com",
    role: "user",
  };
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(cachedUser));
  globalThis.fetch = async () => jsonResponse(200, { online: true });

  try {
    const restored = await restoreClaraBackendSession();
    assert.equal(restored.offline, true);
    assert.equal(restored.user.id, cachedUser.id);
    assert.equal(restored.user.email, cachedUser.email);
    assert.equal(storage.getItem(TOKEN_KEY), token);
  } finally {
    clearBackendSession();
    removeBrowser();
  }
});

test("malformed successful profile response without cache clears the broken session", async () => {
  const storage = installBrowser();
  const token = createToken(Math.floor(Date.now() / 1000) + 3600);
  storage.setItem(TOKEN_KEY, token);
  globalThis.fetch = async () => jsonResponse(200, { message: "ok" });

  try {
    const restored = await restoreClaraBackendSession();
    assert.equal(restored, null);
    assert.equal(storage.getItem(TOKEN_KEY), null);
    assert.equal(storage.getItem(USER_KEY), null);
  } finally {
    clearBackendSession();
    removeBrowser();
  }
});
