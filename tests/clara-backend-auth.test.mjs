import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  backendRequest,
  clearBackendSession,
  createClaraBackendAccount,
  DEFAULT_API_URL,
  DEFAULT_REQUEST_TIMEOUT_MS,
  getStoredBackendToken,
  getStoredBackendUser,
  isBackendNetworkError,
  isStoredTokenLive,
  restoreClaraBackendSession,
  signInWithClaraBackend,
  TOKEN_KEY,
  USER_KEY,
} from "../src/lib/clara-backend-client.js";

const indexCssSource = readFileSync(
  new URL("../src/index.css", import.meta.url),
  "utf8"
);

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
  const encode = (value) =>
    Buffer.from(JSON.stringify(value))
      .toString("base64url");
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

function installHangingFetch(onAbort = () => {}) {
  globalThis.fetch = (_url, options = {}) =>
    new Promise((_resolve, reject) => {
      const abortRequest = () => {
        onAbort();
        const error = new Error("The request was aborted.");
        error.name = "AbortError";
        reject(error);
      };

      if (options.signal?.aborted) {
        abortRequest();
        return;
      }

      options.signal?.addEventListener("abort", abortRequest, { once: true });
    });
}

function removeBrowser() {
  delete globalThis.window;
  delete globalThis.fetch;
}

test("sign in uses the production CLARA backend and stores the returned session", async () => {
  const storage = installBrowser();
  const token = createToken(Math.floor(Date.now() / 1000) + 3600);
  const user = {
    id: 7,
    name: "Max",
    email: "MAX@example.com",
    role: "user",
    created_at: "2026-07-21T00:00:00.000Z",
  };
  let request = null;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return jsonResponse(200, { token, user });
  };

  const result = await signInWithClaraBackend({
    email: " max@example.com ",
    password: "password123",
  });

  assert.equal(request.url, `${DEFAULT_API_URL}/api/clara/auth/login`);
  assert.equal(request.options.method, "POST");
  assert.deepEqual(JSON.parse(request.options.body), {
    email: "max@example.com",
    password: "password123",
  });
  assert.equal(result.token, token);
  assert.equal(result.user.email, "max@example.com");
  assert.equal(storage.getItem(TOKEN_KEY), token);
  assert.equal(JSON.parse(storage.getItem(USER_KEY)).id, 7);
  assert.equal(getStoredBackendToken(), token);
  assert.equal(getStoredBackendUser().name, "Max");

  clearBackendSession();
  removeBrowser();
});

test("account creation registers first and then signs in", async () => {
  installBrowser();
  const token = createToken(Math.floor(Date.now() / 1000) + 3600);
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("/api/clara/auth/register")) {
      return jsonResponse(201, {
        id: 12,
        name: "New User",
        email: "new@example.com",
        role: "user",
      });
    }
    return jsonResponse(200, {
      token,
      user: {
        id: 12,
        name: "New User",
        email: "new@example.com",
        role: "user",
      },
    });
  };

  const result = await createClaraBackendAccount({
    name: "New User",
    email: "new@example.com",
    password: "password123",
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, `${DEFAULT_API_URL}/api/clara/auth/register`);
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    name: "New User",
    email: "new@example.com",
    password: "password123",
  });
  assert.equal(calls[1].url, `${DEFAULT_API_URL}/api/clara/auth/login`);
  assert.equal(result.user.id, 12);

  clearBackendSession();
  removeBrowser();
});

test("session restoration verifies the stored token with /api/users/me", async () => {
  const storage = installBrowser();
  const token = createToken(Math.floor(Date.now() / 1000) + 3600);
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(
    USER_KEY,
    JSON.stringify({ id: 4, name: "Cached", email: "cached@example.com", role: "user" })
  );
  let authorization = null;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, `${DEFAULT_API_URL}/api/users/me`);
    authorization = options.headers.Authorization;
    return jsonResponse(200, {
      id: 4,
      name: "Verified",
      email: "verified@example.com",
      role: "user",
    });
  };

  const restored = await restoreClaraBackendSession();

  assert.equal(authorization, `Bearer ${token}`);
  assert.equal(restored.offline, false);
  assert.equal(restored.user.name, "Verified");
  assert.equal(getStoredBackendUser().email, "verified@example.com");

  clearBackendSession();
  removeBrowser();
});

test("expired stored tokens are rejected before any network request", async () => {
  const storage = installBrowser();
  const token = createToken(Math.floor(Date.now() / 1000) - 60);
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify({ id: 1, name: "Expired", email: "e@example.com" }));
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return jsonResponse(500, {});
  };

  assert.equal(isStoredTokenLive(token), false);
  assert.equal(await restoreClaraBackendSession(), null);
  assert.equal(called, false);
  assert.equal(storage.getItem(TOKEN_KEY), null);
  assert.equal(storage.getItem(USER_KEY), null);

  removeBrowser();
});

test("backend requests time out instead of leaving auth startup pending", async () => {
  installBrowser();
  let abortObserved = false;
  installHangingFetch(() => {
    abortObserved = true;
  });
  const startedAt = Date.now();

  try {
    await assert.rejects(
      () => backendRequest("/api/users/me", { timeoutMs: 25 }),
      (error) => {
        assert.equal(error.code, "REQUEST_TIMEOUT");
        assert.equal(error.timeoutMs, 25);
        assert.equal(isBackendNetworkError(error), true);
        return true;
      }
    );
    assert.equal(abortObserved, true);
    assert.ok(Date.now() - startedAt < 1_000);
    assert.equal(DEFAULT_REQUEST_TIMEOUT_MS, 10_000);
  } finally {
    removeBrowser();
  }
});

test("session restoration uses the cached account when the backend times out", async () => {
  const storage = installBrowser();
  const token = createToken(Math.floor(Date.now() / 1000) + 3600);
  const cachedUser = {
    id: 21,
    name: "Offline Max",
    email: "offline@example.com",
    role: "user",
  };
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(cachedUser));
  installHangingFetch();

  try {
    const restored = await restoreClaraBackendSession({ timeoutMs: 25 });

    assert.equal(restored.offline, true);
    assert.equal(restored.token, token);
    assert.equal(restored.user.id, cachedUser.id);
    assert.equal(restored.user.email, cachedUser.email);
  } finally {
    clearBackendSession();
    removeBrowser();
  }
});

test("startup loader remains visible when performance mode disables animation", () => {
  assert.match(
    indexCssSource,
    /\.theme-page-shell:has\(\.animate-spin\)\s*\{[\s\S]*?opacity:\s*1\s*!important;[\s\S]*?animation:\s*none\s*!important;/
  );
});
