import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const vercelConfig = JSON.parse(
  readFileSync(new URL("../vercel.json", import.meta.url), "utf8")
);

function createStorage() {
  return {
    getItem() {
      return null;
    },
    setItem() {},
    removeItem() {},
  };
}

async function importBackendClientForHost(hostname) {
  globalThis.window = {
    location: { hostname },
    localStorage: createStorage(),
  };

  try {
    return await import(
      `../src/lib/clara-backend-client.js?host=${encodeURIComponent(hostname)}-${Date.now()}-${Math.random()}`
    );
  } finally {
    delete globalThis.window;
  }
}

test("Vercel rewrites the same-origin CLARA API path to the ngrok backend", () => {
  assert.deepEqual(vercelConfig.rewrites, [
    {
      source: "/clara-api/:path*",
      destination: "https://groin-mothproof-sixties.ngrok-free.dev/:path*",
    },
  ]);
});

test("Vercel web builds use the same-origin API proxy", async () => {
  const client = await importBackendClientForHost("clara-app-test.vercel.app");

  assert.equal(client.getClaraBackendUrl(), "/clara-api");
  assert.equal(client.VERCEL_API_PROXY_PATH, "/clara-api");
});

test("native and non-Vercel runtimes keep using the direct backend URL", async () => {
  const client = await importBackendClientForHost("localhost");

  assert.equal(client.getClaraBackendUrl(), client.DEFAULT_API_URL);
});
